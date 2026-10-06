import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const retailers = await prisma.retailer.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { businessName: "asc" },
  })

  const csv = [
    "Company Name,Email",
    ...retailers.map(r => `"${r.businessName.replace(/"/g,'""')}","${r.user.email}"`)
  ].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="retailers-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
