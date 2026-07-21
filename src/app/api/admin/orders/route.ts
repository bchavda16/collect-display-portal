import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { retailerId, businessName, poReference, deliveryNotes, items } = await req.json()

  if (!items?.length) return NextResponse.json({ error: "At least one item is required" }, { status: 400 })
  if (!retailerId && !businessName) return NextResponse.json({ error: "Retailer or business name required" }, { status: 400 })

  // Calculate totals
  let subtotalPence = 0
  const itemsData = []

  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } })
    if (!product) return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 })
    const unitCostPence = item.unitCostPence ?? product.unitCostPence
    const lineTotalPence = unitCostPence * item.quantity
    subtotalPence += lineTotalPence
    itemsData.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: item.quantity,
      unitCostPence,
      cduSize: product.cduSize,
      lineTotalPence,
    })
  }

  const vatRate = parseFloat(process.env.VAT_RATE ?? "0.2")
  const vatPence = Math.round(subtotalPence * vatRate)
  const totalPence = subtotalPence + vatPence

  // Generate order number
  const orderCount = await prisma.order.count()
  const orderNumber = `CAD-${String(orderCount + 1).padStart(4, "0")}`

  // Find or use retailer
  let finalRetailerId = retailerId
  if (!retailerId && businessName) {
    // Check if retailer exists with this business name
    const found = await prisma.retailer.findFirst({ where: { businessName: { contains: businessName, mode: "insensitive" } } })
    if (found) {
      finalRetailerId = found.id
    } else {
      return NextResponse.json({ error: "No retailer account found for this business name. Please create an account first or select an existing retailer." }, { status: 404 })
    }
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      retailerId: finalRetailerId,
      poReference: poReference || null,
      deliveryNotes: deliveryNotes || null,
      subtotalPence,
      vatPence,
      totalPence,
      isRead: true,
      items: { create: itemsData },
      statusHistory: { create: { status: "PLACED", note: "Order created manually by admin" } },
    },
    include: { items: true, retailer: true },
  })

  return NextResponse.json({ success: true, data: order }, { status: 201 })
}
