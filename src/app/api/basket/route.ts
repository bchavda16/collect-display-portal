import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

async function getRetailerId(userId: string): Promise<string | null> {
  const retailer = await prisma.retailer.findFirst({ where: { userId }, select: { id: true } })
  return retailer?.id ?? null
}

async function buildBasketSummary(retailerId: string) {
  const items = await prisma.savedBasketItem.findMany({
    where: { retailerId },
    include: { product: { include: { brand: true, images: { take: 1 } } } },
    orderBy: { createdAt: "asc" },
  })

  const mapped = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    sku: item.product.sku,
    imageUrl: item.product.images[0]?.url ?? null,
    unitCostPence: item.product.unitCostPence,
    cduSize: item.product.cduSize,
    quantity: item.quantity,
    lineTotalPence: item.product.unitCostPence * item.quantity,
  }))

  const subtotalPence = mapped.reduce((s, i) => s + i.lineTotalPence, 0)
  const vatPence = Math.round(subtotalPence * parseFloat(process.env.VAT_RATE ?? "0.2"))
  const totalPence = subtotalPence + vatPence

  return { items: mapped, subtotalPence, vatPence, totalPence }
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const retailerId = await getRetailerId((session.user as any).id)
  if (!retailerId) return NextResponse.json({ items: [], subtotalPence: 0, vatPence: 0, totalPence: 0 })
  return NextResponse.json(await buildBasketSummary(retailerId))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const retailerId = await getRetailerId((session.user as any).id)
  if (!retailerId) return NextResponse.json({ error: "Retailer not found" }, { status: 404 })

  const { productId, quantity } = await req.json()

  await prisma.savedBasketItem.upsert({
    where: { retailerId_productId: { retailerId, productId } },
    update: { quantity: { increment: quantity } },
    create: { retailerId, productId, quantity },
  })

  return NextResponse.json(await buildBasketSummary(retailerId))
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const retailerId = await getRetailerId((session.user as any).id)
  if (!retailerId) return NextResponse.json({ error: "Retailer not found" }, { status: 404 })

  const { itemId, quantity } = await req.json()

  if (quantity <= 0) {
    await prisma.savedBasketItem.delete({ where: { id: itemId } })
  } else {
    await prisma.savedBasketItem.update({ where: { id: itemId }, data: { quantity } })
  }

  return NextResponse.json(await buildBasketSummary(retailerId))
}

export async function DELETE(_req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const retailerId = await getRetailerId((session.user as any).id)
  if (!retailerId) return NextResponse.json({ error: "Retailer not found" }, { status: 404 })

  await prisma.savedBasketItem.deleteMany({ where: { retailerId } })
  return NextResponse.json({ items: [], subtotalPence: 0, vatPence: 0, totalPence: 0 })
}
