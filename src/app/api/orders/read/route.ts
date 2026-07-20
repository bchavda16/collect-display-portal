import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const { orderIds, isRead } = await req.json()
  if (!orderIds?.length) return NextResponse.json({ error: "No orderIds provided" }, { status: 400 })

  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: { isRead },
  })

  return NextResponse.json({ success: true })
}
