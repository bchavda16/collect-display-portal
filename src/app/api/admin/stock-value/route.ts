import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const asOf = searchParams.get("asOf")

  // Current stock value
  const products = await prisma.product.findMany({
    select: { id: true, name: true, stockUnits: true, unitCostPence: true, sku: true }
  })

  if (!asOf) {
    const totalUnits = products.reduce((s, p) => s + p.stockUnits, 0)
    const totalValuePence = products.reduce((s, p) => s + p.stockUnits * p.unitCostPence, 0)
    const totalValueRRP = products.reduce((s, p) => s + p.stockUnits * p.unitCostPence, 0)
    return NextResponse.json({ totalUnits, totalValuePence, productCount: products.length, asOf: null })
  }

  // Historical: current stock + units sold AFTER the asOf date
  const asOfDate = new Date(asOf)
  asOfDate.setHours(23, 59, 59, 999)

  const soldAfter = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
    where: {
      order: {
        createdAt: { gt: asOfDate },
        status: { not: "CANCELLED" }
      }
    }
  })

  const soldMap: Record<string, number> = {}
  soldAfter.forEach(s => { soldMap[s.productId] = s._sum.quantity ?? 0 })

  const historicalProducts = products.map(p => ({
    ...p,
    historicalUnits: p.stockUnits + (soldMap[p.id] ?? 0)
  }))

  const totalUnits = historicalProducts.reduce((s, p) => s + p.historicalUnits, 0)
  const totalValuePence = historicalProducts.reduce((s, p) => s + p.historicalUnits * p.unitCostPence, 0)

  return NextResponse.json({ totalUnits, totalValuePence, productCount: products.length, asOf: asOfDate })
}
