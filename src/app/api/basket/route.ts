import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { addToBasketSchema, updateBasketItemSchema } from "@/lib/validations";
import type { ApiResponse, BasketSummary } from "@/types";

async function getRetailerId(userId: string): Promise<string | null> {
  const retailer = await prisma.retailer.findFirst({
    where: { users: { some: { id: userId } } },
    select: { id: true },
  });
  return retailer?.id ?? null;
}

async function buildBasketSummary(retailerId: string): Promise<BasketSummary> {
  const items = await prisma.savedBasketItem.findMany({
    where: { retailerId },
    include: {
      product: {
        include: { brand: true, images: { where: { isPrimary: true }, take: 1 } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const basketItems = items.map((i) => ({
    id: i.id,
    productId: i.productId,
    product: i.product,
    quantity: i.quantity,
    unitCostPence: i.product.unitCostPence,
    lineTotalPence: i.product.unitCostPence * i.quantity,
  }));

  const subtotalPence = basketItems.reduce((sum, i) => sum + i.lineTotalPence, 0);
  const vatPence = Math.round(subtotalPence * 0.2);
  const totalPence = subtotalPence + vatPence;
  const totalUnits = basketItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalCDUs = basketItems.reduce(
    (sum, i) => sum + Math.ceil(i.quantity / i.product.cduSize),
    0
  );

  return {
    items: basketItems,
    subtotalPence,
    vatPence,
    totalPence,
    totalUnits,
    totalCDUs,
    itemCount: basketItems.length,
  };
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const retailerId = await getRetailerId(session.user.id);
    if (!retailerId) {
      return NextResponse.json<ApiResponse<BasketSummary>>({
        success: true,
        data: {
          items: [],
          subtotalPence: 0,
          vatPence: 0,
          totalPence: 0,
          totalUnits: 0,
          totalCDUs: 0,
          itemCount: 0,
        },
      });
    }

    const summary = await buildBasketSummary(retailerId);
    return NextResponse.json<ApiResponse<BasketSummary>>({ success: true, data: summary });
  } catch (error) {
    console.error("[GET /api/basket]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch basket" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const retailerId = await getRetailerId(session.user.id);
    if (!retailerId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Retailer account not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { productId, quantity } = addToBasketSchema.parse(body);

    // Verify product exists and has stock
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Upsert basket item
    await prisma.savedBasketItem.upsert({
      where: { retailerId_productId: { retailerId, productId } },
      update: { quantity: { increment: quantity } },
      create: { retailerId, productId, quantity },
    });

    const summary = await buildBasketSummary(retailerId);
    return NextResponse.json<ApiResponse<BasketSummary>>({ success: true, data: summary });
  } catch (error) {
    console.error("[POST /api/basket]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to add to basket" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const retailerId = await getRetailerId(session.user.id);
    if (!retailerId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Retailer account not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { productId, quantity } = updateBasketItemSchema.parse(body);

    if (quantity === 0) {
      await prisma.savedBasketItem.deleteMany({
        where: { retailerId, productId },
      });
    } else {
      await prisma.savedBasketItem.upsert({
        where: { retailerId_productId: { retailerId, productId } },
        update: { quantity },
        create: { retailerId, productId, quantity },
      });
    }

    const summary = await buildBasketSummary(retailerId);
    return NextResponse.json<ApiResponse<BasketSummary>>({ success: true, data: summary });
  } catch (error) {
    console.error("[PATCH /api/basket]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update basket" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const retailerId = await getRetailerId(session.user.id);
    if (retailerId) {
      await prisma.savedBasketItem.deleteMany({ where: { retailerId } });
    }

    return NextResponse.json<ApiResponse<null>>({ success: true, data: null });
  } catch (error) {
    console.error("[DELETE /api/basket]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to clear basket" },
      { status: 500 }
    );
  }
}
