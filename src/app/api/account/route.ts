import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const retailer = await prisma.retailer.findFirst({
    where: { userId: (session.user as any).id },
    include: { user: { select: { email: true } }, addresses: true },
  })
  if (!retailer) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({
    id: retailer.id,
    businessName: retailer.businessName,
    contactName: retailer.contactName,
    phone: retailer.phone,
    vatNumber: retailer.vatNumber,
    email: retailer.user.email,
    pricingTier: retailer.pricingTier,
    paymentTerms: retailer.paymentTerms,
    creditLimitPence: retailer.creditLimitPence,
    addresses: retailer.addresses,
    hasAddress: retailer.addresses.length > 0,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const retailer = await prisma.retailer.findFirst({
    where: { userId: (session.user as any).id },
    include: { addresses: true },
  })
  if (!retailer) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await req.json()
  const { contactName, phone, vatNumber, address } = body

  await prisma.retailer.update({
    where: { id: retailer.id },
    data: {
      ...(contactName !== undefined && { contactName }),
      ...(phone !== undefined && { phone }),
      ...(vatNumber !== undefined && { vatNumber }),
    },
  })

  if (address && address.line1 && address.city && address.postcode) {
    const existing = retailer.addresses.find(a => a.isDefault) ?? retailer.addresses[0]
    if (existing) {
      await prisma.address.update({
        where: { id: existing.id },
        data: {
          line1: address.line1,
          line2: address.line2 || null,
          city: address.city,
          county: address.county || null,
          postcode: address.postcode,
          country: "GB",
        },
      })
    } else {
      await prisma.address.create({
        data: {
          retailerId: retailer.id,
          line1: address.line1,
          line2: address.line2 || null,
          city: address.city,
          county: address.county || null,
          postcode: address.postcode,
          country: "GB",
          isDefault: true,
        },
      })
    }
  }

  return NextResponse.json({ success: true })
}
