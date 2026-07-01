import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') !== 'false'

  const now = new Date()

  const announcements = await prisma.announcement.findMany({
    where: activeOnly
      ? {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        }
      : undefined,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  })

  return NextResponse.json(announcements)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, content, type = 'INFO', isPinned = false, expiresAt } = body

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
  }

  const validTypes = ['INFO', 'WARNING', 'SUCCESS', 'PROMO']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid announcement type' }, { status: 400 })
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      type,
      isPinned,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  return NextResponse.json(announcement, { status: 201 })
}
