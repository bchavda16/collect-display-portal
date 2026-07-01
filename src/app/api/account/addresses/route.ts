import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'RETAILER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const retailer = await prisma.retailer.findUnique({ where: { userId: session.user.id } })
  if (!retailer) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const body = await req.json()
  const { label, line1, line2, city, county, postcode, country = 'GB' } = body

  if (!line1 || !city || !postcode) {
    return NextResponse.json({ error: 'line1, city and postcode are required' }, { status: 400 })
  }

  const address = await prisma.address.create({
    data: {
      retailerId: retailer.id,
      label: label ?? null,
      line1,
      line2: line2 ?? null,
      city,
      county: county ?? null,
      postcode,
      country,
      isDefault: false,
    },
  })

  return NextResponse.json(address, { status: 201 })
}
