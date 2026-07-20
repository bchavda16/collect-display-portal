import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

async function recalcTotals(orderId: string) {
  const items = await prisma.orderItem.findMany({ where: { orderId } })
  const subtotalPence = items.reduce((s, i) => s + i.lineTotalPence, 0)
  const vatRate = parseFloat(process.env.VAT_RATE ?? "0.2")
  const vatPence = Math.round(subtotalPence * vatRate)
  const totalPence = subtotalPence + vatPence
  return prisma.order.update({
    where: { id: orderId },
    data: { subtotalPence, vatPence, totalPence },
  })
}

// PATCH — edit a line item
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { itemId, unitCostPence, quantity } = await req.json()
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 })

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
  if (!item || item.orderId !== params.id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const newUnitCost = unitCostPence ?? item.unitCostPence
  const newQty = quantity ?? item.quantity
  const newLineTotal = newUnitCost * newQty

  await prisma.orderItem.update({
    where: { id: itemId },
    data: { unitCostPence: newUnitCost, quantity: newQty, lineTotalPence: newLineTotal },
  })

  const updated = await recalcTotals(params.id)
  return NextResponse.json({ success: true, order: updated })
}

// DELETE — remove a line item
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { itemId } = await req.json()
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 })

  const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
  if (!item || item.orderId !== params.id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 })
  }

  const remaining = await prisma.orderItem.count({ where: { orderId: params.id } })
  if (remaining <= 1) {
    return NextResponse.json({ error: "Cannot remove the last item from an order" }, { status: 400 })
  }

  await prisma.orderItem.delete({ where: { id: itemId } })
  const updated = await recalcTotals(params.id)
  return NextResponse.json({ success: true, order: updated })
}
