import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { orderId, invoiced } = await req.json()
  await prisma.order.update({
    where: { id: orderId },
    data: { invoiced },
  })
  return NextResponse.json({ success: true })
}
