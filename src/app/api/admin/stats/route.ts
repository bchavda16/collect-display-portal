import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [pendingOrders, totalOrders, totalRetailers, recentOrders, thisMonthRevenue, lastMonthRevenue, lowStockProducts] =
      await Promise.all([
        prisma.order.count({ where: { status: { in: ["PLACED", "CONFIRMED", "PROCESSING", "PICKED", "PACKED"] } } }),
        prisma.order.count(),
        prisma.retailer.count(),
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            retailer: { select: { businessName: true, contactName: true } },
            _count: { select: { items: true } },
          },
        }),
        prisma.order.aggregate({
          _sum: { totalPence: true },
          where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
        }),
        prisma.order.aggregate({
          _sum: { totalPence: true },
          where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: "CANCELLED" } },
        }),
        prisma.product.findMany({
          where: { stockUnits: { lte: 10 }, status: "ACTIVE" },
          orderBy: { stockUnits: "asc" },
          take: 5,
          include: { brand: true },
        }),
      ])

    const thisRevenue = thisMonthRevenue._sum.totalPence ?? 0
    const lastRevenue = lastMonthRevenue._sum.totalPence ?? 0
    const growth = lastRevenue > 0 ? Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 100) : 0

    return NextResponse.json({
      pendingOrders, totalOrders, totalRetailers,
      revenueThisMonthPence: thisRevenue,
      revenueLastMonthPence: lastRevenue,
      revenueGrowthPercent: growth,
      lowStockProducts,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        retailerName: o.retailer.businessName,
        status: o.status,
        totalPence: o.totalPence,
        itemCount: o._count.items,
        createdAt: o.createdAt,
      })),
    })
  } catch (error) {
    console.error("[GET /api/admin/stats]", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
