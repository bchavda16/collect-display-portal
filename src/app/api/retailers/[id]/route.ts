import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const retailer = await prisma.retailer.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, email: true, isActive: true, createdAt: true } }, addresses: true, _count: { select: { orders: true } } },
  })
  if (!retailer) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(retailer)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await req.json()
  const { businessName, contactName, phone, vatNumber, paymentTerms, creditLimitPence, isActive, address } = body
  const retailer = await prisma.retailer.findUnique({ where: { id: params.id }, include: { user: true } })
  if (!retailer) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.$transaction(async (tx) => {
    await tx.retailer.update({
      where: { id: params.id },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(contactName !== undefined && { contactName }),
        ...(phone !== undefined && { phone }),
        ...(vatNumber !== undefined && { vatNumber }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(creditLimitPence !== undefined && { creditLimitPence }),
      },
    })
    if (isActive !== undefined) {
      await tx.user.update({ where: { id: retailer.userId }, data: { isActive } })
    }
    if (address) {
      const existing = await tx.address.findFirst({ where: { retailerId: params.id, isDefault: true } })
      if (existing) {
        await tx.address.update({ where: { id: existing.id }, data: { line1: address.line1, line2: address.line2 || null, city: address.city, county: address.county || null, postcode: address.postcode } })
      } else {
        await tx.address.create({ data: { retailerId: params.id, line1: address.line1, line2: address.line2 || null, city: address.city, county: address.county || null, postcode: address.postcode, country: "GB", isDefault: true } })
      }
    }
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const retailer = await prisma.retailer.findUnique({
    where: { id: params.id },
    include: { user: true }
  })
  if (!retailer) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete in correct order to avoid FK constraint errors
  await prisma.$transaction(async (tx) => {
    // Clear basket
    await tx.savedBasketItem.deleteMany({ where: { retailerId: params.id } })
    // Clear addresses
    await tx.address.deleteMany({ where: { retailerId: params.id } })
    // Clear offers
    await tx.productOffer.deleteMany({ where: { retailerId: params.id } })
    // Nullify orders (keep order history but detach from retailer)
    // We can't delete orders as they're business records, so we just delete the retailer
    await tx.retailer.delete({ where: { id: params.id } })
    // Delete user account
    await tx.user.delete({ where: { id: retailer.userId } })
  })

  return NextResponse.json({ success: true })
}
