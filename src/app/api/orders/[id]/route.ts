import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { updateOrderStatusSchema } from "@/lib/validations";
import { sendStatusUpdate } from "@/lib/email";
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

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: { include: { brand: true, images: { where: { isPrimary: true }, take: 1 } } },
          },
        },
        retailer: { include: { users: true, addresses: true } },
        statusHistory: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true } } } },
        deliveryAddress: true,
        placedBy: { select: { name: true, email: true } },
      },
    });

    if (!order) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Retailers can only view their own orders
    if (session.user.role !== "ADMIN") {
      const retailer = await prisma.retailer.findFirst({
        where: { users: { some: { id: session.user.id } } },
      });
      if (!retailer || order.retailerId !== retailer.id) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json<ApiResponse<typeof order>>({ success: true, data: order });
  } catch (error) {
    console.error("[GET /api/orders/:id]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch order" },
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
    const {
      status,
      note,
      trackingNumber,
      trackingUrl,
      estimatedDelivery,
      invoiceUrl,
      invoiceNumber,
    } = updateOrderStatusSchema.parse(body);

    const order = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          status,
          ...(trackingNumber && { trackingNumber }),
          ...(trackingUrl && { trackingUrl }),
          ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
          ...(invoiceUrl && { invoiceUrl }),
          ...(invoiceNumber && { invoiceNumber }),
          ...(status === "DISPATCHED" && { dispatchedAt: new Date() }),
          ...(status === "DELIVERED" && { deliveredAt: new Date() }),
        },
        include: {
          retailer: { include: { users: true } },
          items: { include: { product: true } },
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: params.id,
          status,
          note: note ?? null,
          changedById: session.user.id,
        },
      });

      return updatedOrder;
    });

    // Send status update email
    const retailerUser = order.retailer.users[0];
    if (retailerUser) {
      sendStatusUpdate({
        to: retailerUser.email,
        retailerName: retailerUser.name,
        orderNumber: order.orderNumber,
        status,
        trackingNumber: trackingNumber ?? undefined,
        trackingUrl: trackingUrl ?? undefined,
        estimatedDelivery: estimatedDelivery ?? undefined,
      }).catch(console.error);
    }

    return NextResponse.json<ApiResponse<typeof order>>({ success: true, data: order });
  } catch (error) {
    console.error("[PATCH /api/orders/:id]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update order" },
      { status: 500 }
    );
  }
}
