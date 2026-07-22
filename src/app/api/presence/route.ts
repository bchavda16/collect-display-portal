import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ ok: false })
  
  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: { lastSeenAt: new Date() },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
