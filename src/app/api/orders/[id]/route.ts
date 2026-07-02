import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { sendStatusUpdate } from "@/lib/email"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: { include: { product: { include: { brand: true, images: { take: 1 } } } } },
        retailer: { include: { addresses: true } },
        statusHistory: { orderBy: { createdAt: "asc" } },
      },
    })

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    if ((session.user as any).role !== "ADMIN") {
      const retailer = await prisma.retailer.findFirst({ where: { userId: (session.user as any).id } })
      if (!retailer || order.retailerId !== retailer.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[GET /api/orders/:id]", error)
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { status, trackingNumber, carrierName, note, estimatedDelivery } = body

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { retailer: { include: { user: true } } },
    })
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(trackingNumber && { trackingNumber }),
        ...(carrierName && { carrierName }),
        ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
        ...(status === "DISPATCHED" && { shippedAt: new Date() }),
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
        statusHistory: status ? { create: { status, note: note ?? undefined, changedBy: "ADMIN" } } : undefined,
      },
    })

    if (status && order.retailer.user) {
      sendStatusUpdate({
        to: order.retailer.user.email,
        businessName: order.retailer.businessName,
        orderNumber: order.orderNumber,
        newStatus: status,
        trackingNumber: trackingNumber ?? order.trackingNumber ?? undefined,
        carrierName: carrierName ?? order.carrierName ?? undefined,
        note,
      }).catch(console.error)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[PATCH /api/orders/:id]", error)
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
  }
}
