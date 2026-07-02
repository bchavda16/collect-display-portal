import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { createRetailerSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";
import type { ApiResponse, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { accountCode: { contains: search, mode: "insensitive" } },
        { users: { some: { email: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const [total, retailers] = await Promise.all([
      prisma.retailer.count({ where }),
      prisma.retailer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          users: { select: { id: true, name: true, email: true, lastLoginAt: true } },
          addresses: { where: { isPrimary: true }, take: 1 },
          _count: { select: { orders: true } },
        },
      }),
    ]);

    return NextResponse.json<ApiResponse<PaginatedResponse<(typeof retailers)[0]>>>({
      success: true,
      data: { data: retailers, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/retailers]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch retailers" },
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
    const { email, name, password, companyName, phone, accountCode, paymentTerms, creditLimitPence, pricingTier, address } =
      createRetailerSchema.parse(body);

    // Check for duplicate email or account code
    const [existingUser, existingAccount] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.retailer.findUnique({ where: { accountCode } }),
    ]);

    if (existingUser) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    if (existingAccount) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Account code is already in use" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const retailer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: "RETAILER",
        },
      });

      const newRetailer = await tx.retailer.create({
        data: {
          companyName,
          phone,
          accountCode,
          paymentTerms,
          creditLimitPence,
          pricingTier,
          users: { connect: { id: user.id } },
          addresses: {
            create: {
              ...address,
              isPrimary: true,
            },
          },
        },
        include: {
          users: true,
          addresses: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "RETAILER_CREATED",
          entityType: "Retailer",
          entityId: newRetailer.id,
          userId: session.user.id,
        },
      });

      return newRetailer;
    });

    sendWelcomeEmail({ to: email, name, companyName, password }).catch(console.error);

    return NextResponse.json<ApiResponse<typeof retailer>>(
      { success: true, data: retailer },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/retailers]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create retailer" },
      { status: 500 }
    );
  }
}
