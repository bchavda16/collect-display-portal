import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { searchParams } = req.nextUrl
  const status = searchParams.get("status") ?? undefined
  const applications = await prisma.retailerApplication.findMany({
    where: status && status !== "ALL" ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ data: applications })
}

export async function POST(req: NextRequest) {
  const { businessName, contactName, email, phone } = await req.json()
  if (!businessName || !contactName || !email) {
    return NextResponse.json({ error: "Please fill in all required fields" }, { status: 400 })
  }
  const existing = await prisma.retailerApplication.findFirst({ where: { email: email.toLowerCase() } })
  if (existing) return NextResponse.json({ error: "An application with this email already exists" }, { status: 409 })
  const userExists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (userExists) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 })
  await prisma.retailerApplication.create({
    data: { businessName, contactName, email: email.toLowerCase(), phone: phone || null }
  })
  return NextResponse.json({ success: true }, { status: 201 })
}
