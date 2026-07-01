import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatRelativeDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import {
  ShoppingBag,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalOrders,
    pendingOrders,
    revenueThisMonth,
    revenueLastMonth,
    totalRetailers,
    recentOrders,
    lowStockProducts,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({
      where: { status: { in: ["PLACED", "CONFIRMED", "PICKING", "PACKED"] } },
    }),
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
    prisma.retailer.count({ where: { isActive: true } }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        retailer: { select: { companyName: true, accountCode: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", stockUnits: { lte: 10 } },
      orderBy: { stockUnits: "asc" },
      take: 5,
      include: { brand: true },
    }),
  ]);

  const thisRevenue = revenueThisMonth._sum.totalPence ?? 0;
  const lastRevenue = revenueLastMonth._sum.totalPence ?? 0;
  const revenueGrowth =
    lastRevenue === 0
      ? null
      : Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 100);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {formatDate(now)} · Overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard
          label="Revenue This Month"
          value={formatCurrency(thisRevenue)}
          sub={
            revenueGrowth !== null
              ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}% vs last month`
              : "First month"
          }
          icon={<TrendingUp className="w-4 h-4" />}
          accent="brand"
        />
        <AdminStatCard
          label="Pending Orders"
          value={String(pendingOrders)}
          sub="Need attention"
          icon={<Clock className="w-4 h-4" />}
          accent="amber"
        />
        <AdminStatCard
          label="Total Orders"
          value={String(totalOrders)}
          sub="All time"
          icon={<ShoppingBag className="w-4 h-4" />}
          accent="violet"
        />
        <AdminStatCard
          label="Active Retailers"
          value={String(totalRetailers)}
          sub="Trade accounts"
          icon={<Users className="w-4 h-4" />}
          accent="emerald"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="text-xs text-text-muted hover:text-brand transition-colors flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders?highlight=${order.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-bg-elevated transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {order.orderNumber}
                    </span>
                    <span className="text-xs text-text-muted">{order.retailer.accountCode}</span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {order.retailer.companyName} · {order._count.items} lines ·{" "}
                    {formatRelativeDate(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status as never} />
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(order.totalPence)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Low stock alerts */}
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-amber" />
            <h2 className="text-sm font-semibold">Low Stock</h2>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="flex items-center justify-center flex-1 py-8 text-xs text-text-muted">
              All products well stocked
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products?search=${product.sku}`}
                  className="px-4 py-3 hover:bg-bg-elevated transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-text-primary truncate max-w-[140px]">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-text-muted">{product.sku}</p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        product.stockUnits === 0 ? "text-rose" : "text-amber"
                      }`}
                    >
                      {product.stockUnits}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="p-3 border-t border-border mt-auto">
            <Link
              href="/admin/imports"
              className="block text-center text-xs text-brand hover:underline"
            >
              Bulk import stock →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: "brand" | "violet" | "amber" | "emerald";
}) {
  const accents = {
    brand: "text-brand bg-brand/10",
    violet: "text-violet bg-violet/15",
    amber: "text-amber bg-amber/15",
    emerald: "text-emerald bg-emerald/15",
  };

  return (
    <div className="stat-card">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accents[accent]}`}>
        {icon}
      </div>
      <p className="text-xs text-text-muted mt-2">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{sub}</p>
    </div>
  );
}
