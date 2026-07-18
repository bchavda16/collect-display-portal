import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  const { currentPassword, newPassword } = await req.json()
  const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  if (newPassword.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } })
  return NextResponse.json({ success: true })
}
