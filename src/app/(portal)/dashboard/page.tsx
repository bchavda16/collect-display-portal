

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatRelativeDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { Package, ClipboardList, Clock, CreditCard, ChevronRight, Megaphone } from "lucide-react";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  // Get retailer context
  const retailer = await prisma.retailer.findFirst({
    where: { users: { some: { id: session.user.id } } },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [{ targetRetailerId: null }, { targetRetailerId: retailer?.id }],
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      publishedAt: { lte: new Date() },
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 3,
  });

  const pendingOrders =
    retailer?.orders.filter((o) =>
      ["PLACED", "CONFIRMED", "PICKING", "PACKED"].includes(o.status)
    ).length ?? 0;

  const totalUnitsOnOrder =
    retailer?.orders
      .filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status))
      .reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0) ?? 0;

  const lastOrder = retailer?.orders[0];

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      {/* Welcome header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Welcome back, {session.user.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          {retailer?.companyName ?? "Your account"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<ClipboardList className="w-4 h-4" />}
          label="Outstanding Orders"
          value={String(pendingOrders)}
          sub={pendingOrders === 1 ? "order in progress" : "orders in progress"}
          accent="violet"
        />
        <StatCard
          icon={<Package className="w-4 h-4" />}
          label="Units on Order"
          value={String(totalUnitsOnOrder)}
          sub="across all active orders"
          accent="amber"
        />
        <StatCard
          icon={<Clock className="w-4 h-4" />}
          label="Last Order"
          value={lastOrder ? formatRelativeDate(lastOrder.createdAt) : "—"}
          sub={lastOrder ? lastOrder.orderNumber : "No orders yet"}
          accent="emerald"
        />
        <StatCard
          icon={<CreditCard className="w-4 h-4" />}
          label="Credit Limit"
          value={retailer ? formatCurrency(retailer.creditLimitPence) : "—"}
          sub={retailer?.paymentTerms?.replace("_", " ") ?? ""}
          accent="brand"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Link
              href="/orders"
              className="text-xs text-text-muted hover:text-brand transition-colors flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {!retailer?.orders.length ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
              <p className="text-sm text-text-primary font-medium">No orders yet</p>
              <p className="text-xs text-text-muted">
                Browse the stock list to place your first order
              </p>
              <Link
                href="/stock"
                className="text-xs text-brand hover:underline mt-1"
              >
                Browse stock →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {retailer.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-bg-elevated transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-text-muted">
                      {order.items.length} lines · {formatRelativeDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status as never} />
                    <span className="text-sm font-medium text-text-primary">
                      {formatCurrency(order.totalPence)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
            <Megaphone className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold">Announcements</h2>
          </div>

          {announcements.length === 0 ? (
            <div className="flex items-center justify-center flex-1 py-8 text-xs text-text-muted">
              No announcements
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {announcements.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    {a.isPinned && (
                      <span className="text-brand text-[10px] font-semibold uppercase tracking-wide mt-0.5 shrink-0">
                        Pinned
                      </span>
                    )}
                    <div>
                      <p className="text-xs font-medium text-text-primary">{a.title}</p>
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                        {a.content}
                      </p>
                      <p className="text-[10px] text-text-disabled mt-1.5">
                        {formatRelativeDate(a.publishedAt ?? a.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/stock"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors"
        >
          <Package className="w-4 h-4" />
          Browse Stock
        </Link>
        <Link
          href="/orders"
          className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated border border-border text-text-primary rounded-lg text-sm font-medium hover:border-border-strong transition-colors"
        >
          <ClipboardList className="w-4 h-4" />
          My Orders
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: "brand" | "violet" | "amber" | "emerald";
}) {
  const accents = {
    brand: "text-brand bg-brand/10",
    violet: "text-violet bg-violet-light",
    amber: "text-amber bg-amber-light",
    emerald: "text-emerald bg-emerald-light",
  };

  return (
    <div className="stat-card">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accents[accent])}>
        {icon}
      </div>
      <p className="text-xs text-text-muted mt-2">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-[11px] text-text-muted">{sub}</p>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
