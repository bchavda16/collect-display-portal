import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { action, adminNote } = await req.json()
  const application = await prisma.retailerApplication.findUnique({ where: { id: params.id } })
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (action === "approve") {
    const tempPassword = Math.random().toString(36).slice(-8) + "A1!"
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: application.email, passwordHash, role: "RETAILER", isActive: true }
      })
      await tx.retailer.create({
        data: { userId: user.id, businessName: application.businessName, contactName: application.contactName, phone: application.phone ?? null, paymentTerms: "PROFORMA" }
      })
      await tx.retailerApplication.update({
        where: { id: params.id }, data: { status: "APPROVED", adminNote: adminNote || null }
      })
    })
    return NextResponse.json({ success: true, action: "approved", tempPassword })
  }

  if (action === "decline") {
    await prisma.retailerApplication.update({
      where: { id: params.id }, data: { status: "DECLINED", adminNote: adminNote || null }
    })
    return NextResponse.json({ success: true, action: "declined" })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
