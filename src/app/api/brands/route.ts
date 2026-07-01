import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const withProducts = searchParams.get('withProducts') === 'true'

  const brands = await prisma.brand.findMany({
    where: withProducts
      ? { products: { some: { status: { not: 'DISCONTINUED' } } } }
      : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { products: { where: { status: { not: 'DISCONTINUED' } } } } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(brands)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, slug, description, website, logoUrl } = body

  if (!name) return NextResponse.json({ error: 'Brand name is required' }, { status: 400 })

  const existing = await prisma.brand.findFirst({ where: { OR: [{ name }, { slug: slug ?? name.toLowerCase().replace(/\s+/g, '-') }] } })
  if (existing) return NextResponse.json({ error: 'Brand already exists' }, { status: 409 })

  const brand = await prisma.brand.create({
    data: {
      name,
      slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description,
      website,
      logoUrl,
    },
  })

  return NextResponse.json(brand, { status: 201 })
}
