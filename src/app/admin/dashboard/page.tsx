import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { formatCurrencyFromPounds } from "@/lib/utils"
import { OrderStatusBadge } from "@/components/ui/Badge"

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard")

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    pendingOrders,
    totalOrders,
    totalRetailers,
    recentOrders,
    thisMonthRevenue,
    lastMonthRevenue,
    lowStockProducts,
  ] = await Promise.all([
    prisma.order.count({
      where: { status: { in: ["PLACED", "CONFIRMED", "PROCESSING", "PICKED", "PACKED"] } },
    }),
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
      where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      _sum: { totalPence: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: "CANCELLED" } },
      _sum: { totalPence: true },
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">Overview of your distribution portal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="section-label mb-2">Revenue this month</p>
          <p className="text-2xl font-bold text-text-primary">{formatCurrencyFromPounds(thisRevenue)}</p>
          <p className={`text-xs mt-1 font-medium ${growth >= 0 ? "text-emerald" : "text-rose"}`}>
            {growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% vs last month
          </p>
        </div>
        <div className="card p-5">
          <p className="section-label mb-2">Pending orders</p>
          <p className="text-2xl font-bold text-text-primary">{pendingOrders}</p>
          <p className="text-xs text-text-muted mt-1">Awaiting processing</p>
        </div>
        <div className="card p-5">
          <p className="section-label mb-2">Total orders</p>
          <p className="text-2xl font-bold text-text-primary">{totalOrders}</p>
          <p className="text-xs text-text-muted mt-1">All time</p>
        </div>
        <div className="card p-5">
          <p className="section-label mb-2">Active retailers</p>
          <p className="text-2xl font-bold text-text-primary">{totalRetailers}</p>
          <p className="text-xs text-text-muted mt-1">Registered accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        {/* Recent orders */}
        <div>
          <h2 className="section-label mb-3">Recent orders</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-bg-elevated border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Order</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Retailer</th>
                  <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Value</th>
                  <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-text-muted text-sm">No orders yet</td></tr>
                ) : recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-sm text-brand-dark">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{order.retailer.businessName}</td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary text-right">{formatCurrencyFromPounds(order.totalPence)}</td>
                    <td className="px-4 py-3"><OrderStatusBadge status={order.status as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock */}
        <div>
          <h2 className="section-label mb-3">Low stock alerts</h2>
          <div className="card p-4 space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">All products well stocked</p>
            ) : lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{product.name}</p>
                  <p className="text-xs text-text-muted">{product.brand?.name}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${product.stockUnits === 0 ? "text-rose" : "text-amber"}`}>
                  {product.stockUnits} left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
