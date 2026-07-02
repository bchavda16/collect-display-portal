import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { productFiltersSchema } from "@/lib/validations";
import type { ApiResponse, PaginatedResponse, ProductWithBrand } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const filters = productFiltersSchema.parse(Object.fromEntries(searchParams));

    const where: Parameters<typeof prisma.product.findMany>[0]["where"] = {
      status: filters.inStock ? "ACTIVE" : { not: "DISCONTINUED" },
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
        { brand: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.type) where.type = filters.type;
    if (filters.badge) where.badges = { has: filters.badge };
    if (filters.inStock) where.stockUnits = { gt: 0 };

    const orderBy: Parameters<typeof prisma.product.findMany>[0]["orderBy"] = {
      [filters.sortBy]: filters.sortOrder,
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          brand: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
    ]);

    const response: PaginatedResponse<ProductWithBrand> = {
      data: products as ProductWithBrand[],
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };

    return NextResponse.json<ApiResponse<PaginatedResponse<ProductWithBrand>>>({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("[GET /api/products]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const existing = await prisma.product.findUnique({ where: { sku: body.sku } });
    if (existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "A product with this SKU already exists" },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        ...body,
        badges: body.badges ?? [],
      },
      include: { brand: true, images: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "PRODUCT_CREATED",
        entityType: "Product",
        entityId: product.id,
        userId: session.user.id,
        after: JSON.parse(JSON.stringify(product)),
      },
    });

    return NextResponse.json<ApiResponse<typeof product>>(
      { success: true, data: product },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/products]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
