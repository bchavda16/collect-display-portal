import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET — list offers (admin sees all, retailer sees their own)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status") ?? undefined

  const where: any = {}
  if ((session.user as any).role !== "ADMIN") {
    const retailer = await prisma.retailer.findFirst({ where: { userId: (session.user as any).id } })
    if (!retailer) return NextResponse.json({ data: [] })
    where.retailerId = retailer.id
  }
  if (status && status !== "ALL") where.status = status

  const offers = await prisma.productOffer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      product: { include: { brand: true, images: { take: 1 } } },
      retailer: { include: { user: { select: { email: true } } } },
    },
  })

  return NextResponse.json({ data: offers })
}

// POST — retailer submits an offer
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  if ((session.user as any).role === "ADMIN") return NextResponse.json({ error: "Admins cannot submit offers" }, { status: 403 })

  const retailer = await prisma.retailer.findFirst({ where: { userId: (session.user as any).id } })
  if (!retailer) return NextResponse.json({ error: "Retailer not found" }, { status: 404 })

  const { productId, offeredPricePence, quantity, note } = await req.json()

  if (!productId || !offeredPricePence || !quantity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  if (offeredPricePence >= product.unitCostPence) {
    return NextResponse.json({ error: "Offer must be below the listed price" }, { status: 400 })
  }

  // Check for existing pending offer on this product
  const existing = await prisma.productOffer.findFirst({
    where: { retailerId: retailer.id, productId, status: "PENDING" },
  })
  if (existing) return NextResponse.json({ error: "You already have a pending offer on this product" }, { status: 409 })

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const offer = await prisma.productOffer.create({
    data: { retailerId: retailer.id, productId, offeredPricePence, quantity, note: note || null, expiresAt },
    include: { product: { include: { brand: true } } },
  })

  return NextResponse.json({ success: true, data: offer }, { status: 201 })
}
