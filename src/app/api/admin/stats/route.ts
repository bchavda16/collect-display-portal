import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, AdminStats } from "@/types";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalOrders,
      pendingOrders,
      ordersThisMonth,
      revenueThisMonth,
      revenueLastMonth,
      totalRetailers,
      activeRetailers,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: { status: { in: ["PLACED", "CONFIRMED", "PICKING", "PACKED"] } },
      }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.aggregate({
        _sum: { totalPence: true },
        where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      }),
      prisma.order.aggregate({
        _sum: { totalPence: true },
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
          status: { not: "CANCELLED" },
        },
      }),
      prisma.retailer.count(),
      prisma.retailer.count({ where: { isActive: true } }),
      prisma.product.count({
        where: { stockUnits: { lte: prisma.product.fields.lowStockThreshold as never } },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          retailer: { select: { companyName: true, accountCode: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    const thisMonthRevenue = revenueThisMonth._sum.totalPence ?? 0;
    const lastMonthRevenue = revenueLastMonth._sum.totalPence ?? 0;
    const revenueGrowth =
      lastMonthRevenue === 0
        ? 100
        : Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);

    const stats: AdminStats = {
      totalOrders,
      pendingOrders,
      ordersThisMonth,
      revenueThisMonthPence: thisMonthRevenue,
      revenueLastMonthPence: lastMonthRevenue,
      revenueGrowthPercent: revenueGrowth,
      totalRetailers,
      activeRetailers,
      lowStockProducts,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        retailerName: o.retailer.companyName,
        accountCode: o.retailer.accountCode,
        status: o.status,
        totalPence: o.totalPence,
        itemCount: o._count.items,
        createdAt: o.createdAt,
      })),
    };

    return NextResponse.json<ApiResponse<AdminStats>>({ success: true, data: stats });
  } catch (error) {
    console.error("[GET /api/admin/stats]", error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
