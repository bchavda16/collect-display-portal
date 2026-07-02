import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { checkoutSchema } from "@/lib/validations"
import { generateOrderNumber } from "@/lib/utils"
import { sendOrderConfirmation, sendAdminNewOrderAlert } from "@/lib/email"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

    const { searchParams } = req.nextUrl
    const page = parseInt(searchParams.get("page") ?? "1")
    const limit = parseInt(searchParams.get("limit") ?? "20")
    const status = searchParams.get("status") ?? undefined
    const statuses = searchParams.get("statuses")?.split(",") ?? undefined
    const retailerIdParam = searchParams.get("retailer") ?? undefined

    const where: Record<string, unknown> = {}

    if ((session.user as any).role !== "ADMIN") {
      const retailer = await prisma.retailer.findFirst({ where: { userId: (session.user as any).id } })
      if (!retailer) return NextResponse.json({ data: [], total: 0, totalPages: 0 })
      where.retailerId = retailer.id
    } else if (retailerIdParam) {
      where.retailerId = retailerIdParam
    }

    if (status) where.status = status
    if (statuses) where.status = { in: statuses }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          retailer: { select: { businessName: true, contactName: true } },
          items: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
        },
      }),
    ])

    return NextResponse.json({ data: orders, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error("[GET /api/orders]", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

    const body = await req.json()
    const { poReference, requestedDeliveryDate, deliveryNotes } = checkoutSchema.parse(body)

    const retailer = await prisma.retailer.findFirst({
      where: { userId: (session.user as any).id },
      include: { addresses: { where: { isDefault: true }, take: 1 } },
    })

    if (!retailer) return NextResponse.json({ error: "Retailer account not found" }, { status: 404 })

    const basketItems = await prisma.savedBasketItem.findMany({
      where: { retailerId: retailer.id },
      include: { product: true },
    })

    if (basketItems.length === 0) return NextResponse.json({ error: "Your basket is empty" }, { status: 400 })

    let subtotalPence = 0
    const itemsData = []

    for (const item of basketItems) {
      if (item.product.stockUnits < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${item.product.name}` }, { status: 400 })
      }
      const lineTotalPence = item.product.unitCostPence * item.quantity
      subtotalPence += lineTotalPence
      itemsData.push({
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitCostPence: item.product.unitCostPence,
        cduSize: item.product.cduSize,
        lineTotalPence,
      })
    }

    const vatRate = parseFloat(process.env.VAT_RATE ?? "0.2")
    const vatPence = Math.round(subtotalPence * vatRate)
    const totalPence = subtotalPence + vatPence
    const orderCount = await prisma.order.count()
    const orderNumber = generateOrderNumber(orderCount + 1)

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          retailerId: retailer.id,
          poReference,
          requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
          deliveryNotes,
          subtotalPence,
          vatPence,
          totalPence,
          items: { create: itemsData },
          statusHistory: { create: { status: "PLACED", note: "Order placed by retailer" } },
        },
        include: { items: true },
      })
      for (const item of itemsData) {
        await tx.product.update({ where: { id: item.productId }, data: { stockUnits: { decrement: item.quantity } } })
      }
      await tx.savedBasketItem.deleteMany({ where: { retailerId: retailer.id } })
      return newOrder
    })

    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } })
    if (user) {
      sendOrderConfirmation({
        to: user.email,
        retailerName: retailer.businessName,
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({ name: i.productName, sku: i.sku, quantity: i.quantity, unitCostPence: i.unitCostPence, lineTotalPence: i.lineTotalPence })),
        subtotalPence, vatPence, totalPence, poReference,
      }).catch(console.error)

      sendAdminNewOrderAlert({ orderNumber: order.orderNumber, retailerName: retailer.businessName, totalPence, itemCount: order.items.length }).catch(console.error)
    }

    return NextResponse.json({ success: true, data: { orderNumber: order.orderNumber } }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/orders]", error)
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 })
  }
}
