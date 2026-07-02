import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { updateProductSchema } from "@/lib/validations";
import type { ApiResponse } from "@/types";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { brand: true, images: true },
    });

    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<typeof product>>({ success: true, data: product });
  } catch (error) {
    console.error("[GET /api/products/:id]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = updateProductSchema.parse(body);

    const before = await prisma.product.findUnique({ where: { id: params.id } });
    if (!before) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: validated,
      include: { brand: true, images: true },
    });

    await prisma.auditLog.create({
      data: {
        action: "PRODUCT_UPDATED",
        entityType: "Product",
        entityId: product.id,
        userId: session.user.id,
        before: JSON.parse(JSON.stringify(before)),
        after: JSON.parse(JSON.stringify(product)),
      },
    });

    return NextResponse.json<ApiResponse<typeof product>>({ success: true, data: product });
  } catch (error) {
    console.error("[PATCH /api/products/:id]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Soft delete by setting status to DISCONTINUED
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { status: "DISCONTINUED" },
    });

    await prisma.auditLog.create({
      data: {
        action: "PRODUCT_DELETED",
        entityType: "Product",
        entityId: product.id,
        userId: session.user.id,
      },
    });

    return NextResponse.json<ApiResponse<null>>({ success: true, data: null });
  } catch (error) {
    console.error("[DELETE /api/products/:id]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
