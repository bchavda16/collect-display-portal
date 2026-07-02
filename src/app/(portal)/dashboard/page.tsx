import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { formatCurrencyFromPounds, formatRelativeDate } from "@/lib/utils"
import { OrderStatusBadge } from "@/components/ui/Badge"
import Link from "next/link"
import { Package, ClipboardList, Clock, CreditCard, ChevronRight, Megaphone } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const retailer = await prisma.retailer.findFirst({
    where: { userId: (session.user as any).id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: true },
      },
    },
  })

  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 3,
  })

  const activeOrders = retailer?.orders.filter(
    (o) => !["DELIVERED", "CANCELLED"].includes(o.status)
  ) ?? []

  const totalUnitsOnOrder = activeOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0
  )

  const lastOrder = retailer?.orders[0]

  return (
    <div className="p-6 flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Welcome back</h1>
        <p className="text-sm text-text-muted mt-0.5">{retailer?.businessName ?? "Your account"}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-text-muted">Active Orders</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{activeOrders.length}</p>
          <p className="text-xs text-text-muted mt-1">in progress</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">Units on Order</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{totalUnitsOnOrder}</p>
          <p className="text-xs text-text-muted mt-1">across active orders</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">Last Order</p>
          <p className="text-lg font-bold text-text-primary mt-1">{lastOrder ? formatRelativeDate(lastOrder.createdAt) : "—"}</p>
          <p className="text-xs text-text-muted mt-1">{lastOrder?.orderNumber ?? "No orders yet"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">Credit Limit</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            {retailer?.creditLimitPence ? formatCurrencyFromPounds(retailer.creditLimitPence) : "—"}
          </p>
          <p className="text-xs text-text-muted mt-1">{retailer?.paymentTerms?.replace("_", " ") ?? ""}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-text-muted hover:text-brand transition-colors flex items-center gap-0.5">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {!retailer?.orders.length ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-6">
              <p className="text-sm text-text-primary font-medium">No orders yet</p>
              <p className="text-xs text-text-muted">Browse the stock list to place your first order</p>
              <Link href="/stock" className="text-xs text-brand hover:underline mt-1">Browse stock →</Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {retailer.orders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-bg-elevated transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{order.orderNumber}</p>
                    <p className="text-xs text-text-muted">{order.items.length} lines · {formatRelativeDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status as any} />
                    <span className="text-sm font-medium text-text-primary">{formatCurrencyFromPounds(order.totalPence)}</span>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card flex flex-col">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
            <Megaphone className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold">Announcements</h2>
          </div>
          {announcements.length === 0 ? (
            <div className="flex items-center justify-center flex-1 py-8 text-xs text-text-muted">No announcements</div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {announcements.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <p className="text-xs font-medium text-text-primary">{a.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Link href="/stock" className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-hover transition-colors">
          <Package className="w-4 h-4" /> Browse Stock
        </Link>
        <Link href="/orders" className="flex items-center gap-2 px-4 py-2.5 bg-bg-elevated border border-border text-text-primary rounded-lg text-sm font-medium hover:border-border-strong transition-colors">
          <ClipboardList className="w-4 h-4" /> My Orders
        </Link>
      </div>
    </div>
  )
}
