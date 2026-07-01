import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/utils";
import { sendOrderConfirmation, sendAdminNewOrderAlert } from "@/lib/email";
import type { ApiResponse, PaginatedResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const status = searchParams.get("status") ?? undefined;
    const retailerId = searchParams.get("retailerId") ?? undefined;

    const where: Record<string, unknown> = {};

    // Retailers only see their own orders
    if (session.user.role !== "ADMIN") {
      const retailer = await prisma.retailer.findFirst({
        where: { users: { some: { id: session.user.id } } },
      });
      if (!retailer) {
        return NextResponse.json<ApiResponse<[]>>({ success: true, data: [] });
      }
      where.retailerId = retailer.id;
    } else if (retailerId) {
      where.retailerId = retailerId;
    }

    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          retailer: { select: { companyName: true, accountCode: true } },
          items: {
            include: {
              product: { select: { name: true, sku: true } },
            },
          },
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      }),
    ]);

    return NextResponse.json<ApiResponse<PaginatedResponse<(typeof orders)[0]>>>({
      success: true,
      data: {
        data: orders,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/orders]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { poReference, requestedDeliveryDate, deliveryNotes } =
      checkoutSchema.parse(body);

    // Get retailer
    const retailer = await prisma.retailer.findFirst({
      where: { users: { some: { id: session.user.id } } },
      include: {
        addresses: { where: { isPrimary: true }, take: 1 },
        users: { where: { id: session.user.id }, take: 1 },
      },
    });

    if (!retailer) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Retailer account not found" },
        { status: 404 }
      );
    }

    // Get basket items
    const basketItems = await prisma.savedBasketItem.findMany({
      where: { retailerId: retailer.id },
      include: {
        product: true,
      },
    });

    if (basketItems.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Your basket is empty" },
        { status: 400 }
      );
    }

    // Validate stock and calculate totals
    let subtotalPence = 0;
    const itemsData = [];

    for (const item of basketItems) {
      if (item.product.stockUnits < item.quantity) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: `Insufficient stock for ${item.product.name}. Only ${item.product.stockUnits} units available.`,
          },
          { status: 400 }
        );
      }

      const lineTotalPence = item.product.unitCostPence * item.quantity;
      subtotalPence += lineTotalPence;

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitCostPence: item.product.unitCostPence,
        rrpPence: item.product.rrpPence,
        cduSize: item.product.cduSize,
        lineTotalPence,
      });
    }

    const vatPence = Math.round(subtotalPence * (parseFloat(process.env.VAT_RATE ?? "0.2")));
    const totalPence = subtotalPence + vatPence;

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = generateOrderNumber(orderCount + 1);

    // Create order in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          retailerId: retailer.id,
          placedById: session.user.id,
          poReference,
          requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
          deliveryNotes,
          deliveryAddressId: retailer.addresses[0]?.id,
          subtotalPence,
          vatPence,
          totalPence,
          items: { create: itemsData },
          statusHistory: {
            create: {
              status: "PLACED",
              note: "Order placed by retailer",
              changedById: session.user.id,
            },
          },
        },
        include: {
          items: { include: { product: true } },
          retailer: true,
          statusHistory: true,
        },
      });

      // Deduct stock
      for (const item of itemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockUnits: { decrement: item.quantity } },
        });
      }

      // Clear basket
      await tx.savedBasketItem.deleteMany({ where: { retailerId: retailer.id } });

      return newOrder;
    });

    // Send emails (fire and forget)
    const user = retailer.users[0];
    if (user) {
      sendOrderConfirmation({
        to: user.email,
        retailerName: user.name,
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          name: i.product.name,
          sku: i.product.sku,
          quantity: i.quantity,
          unitCostPence: i.unitCostPence,
          lineTotalPence: i.lineTotalPence,
        })),
        subtotalPence,
        vatPence,
        totalPence,
        poReference,
      }).catch(console.error);
    }

    sendAdminNewOrderAlert({
      orderNumber: order.orderNumber,
      retailerName: retailer.companyName,
      totalPence,
      itemCount: order.items.length,
    }).catch(console.error);

    return NextResponse.json<ApiResponse<typeof order>>(
      { success: true, data: order },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/orders]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to place order" },
      { status: 500 }
    );
  }
}
