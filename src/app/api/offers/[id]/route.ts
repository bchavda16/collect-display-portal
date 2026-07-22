import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// PATCH — admin accepts, declines, or counter-offers
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { action, counterPricePence, adminNote } = await req.json()

  const offer = await prisma.productOffer.findUnique({
    where: { id: params.id },
    include: { retailer: true, product: true },
  })
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 })
  if (offer.status !== "PENDING" && offer.status !== "COUNTERED") {
    return NextResponse.json({ error: "Offer is no longer active" }, { status: 400 })
  }

  if (action === "accept") {
    // Add to retailer's basket at agreed price
    const agreedPrice = offer.counterPricePence ?? offer.offeredPricePence

    await prisma.$transaction([
      prisma.productOffer.update({
        where: { id: params.id },
        data: { status: "ACCEPTED", adminNote: adminNote || null, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      }),
prisma.savedBasketItem.upsert({
        where: { retailerId_productId: { retailerId: offer.retailerId, productId: offer.productId } },
        update: { quantity: offer.quantity, unitCostPence: agreedPrice },
        create: { retailerId: offer.retailerId, productId: offer.productId, quantity: offer.quantity, unitCostPence: agreedPrice },
      }),
    ])

    // Update the product's unit cost temporarily for this basket item — store agreed price in offer
    await prisma.productOffer.update({
      where: { id: params.id },
      data: { counterPricePence: agreedPrice },
    })

    return NextResponse.json({ success: true, action: "accepted" })
  }

  if (action === "decline") {
    await prisma.productOffer.update({
      where: { id: params.id },
      data: { status: "DECLINED", adminNote: adminNote || null },
    })
    return NextResponse.json({ success: true, action: "declined" })
  }

  if (action === "counter") {
    if (!counterPricePence) return NextResponse.json({ error: "Counter price required" }, { status: 400 })
    await prisma.productOffer.update({
      where: { id: params.id },
      data: { status: "COUNTERED", counterPricePence, adminNote: adminNote || null, expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    })
    return NextResponse.json({ success: true, action: "countered" })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}

// PATCH for retailer accepting a counter-offer
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const offer = await prisma.productOffer.findUnique({
    where: { id: params.id },
    include: { retailer: true },
  })
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const retailer = await prisma.retailer.findFirst({ where: { userId: (session.user as any).id } })
  if (!retailer || offer.retailerId !== retailer.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { action } = await req.json()

  if (action === "accept-counter") {
    await prisma.$transaction([
      prisma.productOffer.update({ where: { id: params.id }, data: { status: "ACCEPTED" } }),
prisma.savedBasketItem.upsert({
        where: { retailerId_productId: { retailerId: offer.retailerId, productId: offer.productId } },
        update: { quantity: offer.quantity, unitCostPence: agreedPrice },
        create: { retailerId: offer.retailerId, productId: offer.productId, quantity: offer.quantity, unitCostPence: agreedPrice },
      }),
    ])
    return NextResponse.json({ success: true })
  }

  if (action === "decline-counter") {
    await prisma.productOffer.update({ where: { id: params.id }, data: { status: "DECLINED" } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
