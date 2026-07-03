import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { formatCurrencyFromPounds, formatRelativeDate } from "@/lib/utils"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const retailer = await prisma.retailer.findFirst({
    where: { userId: (session.user as any).id },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 5, include: { items: true } } },
  })
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }], take: 3,
  })
  const activeOrders = retailer?.orders.filter(o => !["DELIVERED","CANCELLED"].includes(o.status)) ?? []
  const totalUnits = activeOrders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0)
  const lastOrder = retailer?.orders[0]
  const statusBadge: Record<string,string> = { PLACED:"badge-teal", CONFIRMED:"badge-teal", PROCESSING:"badge-purple", PICKED:"badge-purple", PACKED:"badge-amber", DISPATCHED:"badge-green", OUT_FOR_DELIVERY:"badge-green", DELIVERED:"badge-grey", CANCELLED:"badge-red" }
  return (
    <div className="p-page">
      <div className="mb24">
        <h1 className="page-title">Welcome back</h1>
        <p className="page-sub">{retailer?.businessName ?? "Your account"}</p>
      </div>
      <div className="grid4 mb24">
        {[
          { label:"Active Orders", val:String(activeOrders.length), sub:"in progress" },
          { label:"Units on Order", val:String(totalUnits), sub:"across active orders" },
          { label:"Last Order", val:lastOrder ? formatRelativeDate(lastOrder.createdAt) : "—", sub:lastOrder?.orderNumber ?? "No orders yet" },
          { label:"Credit Limit", val:retailer?.creditLimitPence ? formatCurrencyFromPounds(retailer.creditLimitPence) : "—", sub:retailer?.paymentTerms?.replace("_"," ") ?? "" },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <p className="stat-label">{c.label}</p>
            <p className="stat-val">{c.val}</p>
            <p className="stat-sub">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid-3-1">
        <div>
          <p className="section-head">Recent Orders</p>
          <div className="card card-table mb16">
            <table className="tbl">
              <thead><tr><th>Order</th><th>Date</th><th>Lines</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                {!retailer?.orders.length ? (
                  <tr><td colSpan={5} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>No orders yet — <Link href="/stock" style={{color:"#F0A3BC"}}>browse stock</Link></td></tr>
                ) : retailer.orders.map(o => (
                  <tr key={o.id}>
                    <td><Link href={"/orders/"+o.id} style={{color:"#C4638A",fontWeight:600,textDecoration:"none"}}>{o.orderNumber}</Link></td>
                    <td className="txt-muted">{formatRelativeDate(o.createdAt)}</td>
                    <td className="txt-secondary">{o.items.length}</td>
                    <td className="fw600">{formatCurrencyFromPounds(o.totalPence)}</td>
                    <td><span className={"badge "+(statusBadge[o.status]??"badge-grey")}>{o.status.replace(/_/g," ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row" style={{gap:8}}>
            <Link href="/stock" className="btn-pink">📦 Browse Stock</Link>
            <Link href="/orders" className="btn-ghost">📋 My Orders</Link>
          </div>
        </div>
        <div>
          <p className="section-head">Announcements</p>
          {announcements.length === 0 ? (
            <div className="card card-pad"><p className="txt-muted fs13" style={{textAlign:"center",margin:0}}>No announcements</p></div>
          ) : announcements.map((a,i) => (
            <div key={a.id} className={"annc-card"+(i%2===1?" pink":"")}>
              <p className="annc-title">{a.title}</p>
              <p className="annc-body">{a.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
