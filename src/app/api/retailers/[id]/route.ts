import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { updateRetailerSchema } from '@/lib/validations'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const retailer = await prisma.retailer.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, createdAt: true, lastLoginAt: true } },
      addresses: true,
      _count: { select: { orders: true } },
    },
  })

  if (!retailer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(retailer)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const parse = updateRetailerSchema.safeParse(body)
  if (!parse.success) return NextResponse.json({ error: 'Invalid data', issues: parse.error.issues }, { status: 400 })

  const existing = await prisma.retailer.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const retailer = await prisma.retailer.update({
    where: { id: params.id },
    data: parse.data,
    include: {
      user: { select: { id: true, email: true } },
      addresses: true,
      _count: { select: { orders: true } },
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'RETAILER_UPDATED',
      entityType: 'Retailer',
      entityId: params.id,
      metadata: { changes: Object.keys(parse.data) },
    },
  })

  return NextResponse.json(retailer)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const retailer = await prisma.retailer.findUnique({
    where: { id: params.id },
    include: { _count: { select: { orders: true } } },
  })

  if (!retailer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (retailer._count.orders > 0) {
    return NextResponse.json({ error: 'Cannot delete retailer with existing orders. Deactivate their account instead.' }, { status: 409 })
  }

  // Soft delete via disabling the user account
  await prisma.user.update({
    where: { id: retailer.userId },
    data: { isActive: false },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'RETAILER_DEACTIVATED',
      entityType: 'Retailer',
      entityId: params.id,
    },
  })

  return NextResponse.json({ success: true })
}
