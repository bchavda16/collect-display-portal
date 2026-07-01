import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'RETAILER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const retailer = await prisma.retailer.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { email: true } },
      addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
    },
  })

  if (!retailer) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  return NextResponse.json({
    businessName: retailer.businessName,
    contactName: retailer.contactName,
    email: retailer.user.email,
    phone: retailer.phone,
    vatNumber: retailer.vatNumber,
    pricingTier: retailer.pricingTier,
    paymentTerms: retailer.paymentTerms,
    creditLimitPence: retailer.creditLimitPence,
    addresses: retailer.addresses,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'RETAILER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { contactName, phone } = body

  if (contactName !== undefined && typeof contactName !== 'string') {
    return NextResponse.json({ error: 'Invalid contactName' }, { status: 400 })
  }

  const retailer = await prisma.retailer.update({
    where: { userId: session.user.id },
    data: {
      ...(contactName !== undefined && { contactName }),
      ...(phone !== undefined && { phone: phone || null }),
    },
  })

  return NextResponse.json({ success: true })
}
