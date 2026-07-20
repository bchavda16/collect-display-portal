import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import Link from "next/link"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  PLACED:{bg:"#E8F8F7",color:"#3A9E9B"},
  CONFIRMED:{bg:"#E8F8F7",color:"#3A9E9B"},
  PROCESSING:{bg:"#F3EEFF",color:"#7C3AED"},
  PICKED:{bg:"#F3EEFF",color:"#7C3AED"},
  PACKED:{bg:"#FEF3C7",color:"#D97706"},
  DISPATCHED:{bg:"#EAFAF3",color:"#0EA572"},
  OUT_FOR_DELIVERY:{bg:"#EAFAF3",color:"#0EA572"},
  DELIVERED:{bg:"#F4F5F7",color:"#8888AA"},
  CANCELLED:{bg:"#FFF1F4",color:"#E11D48"},
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const retailer = await prisma.retailer.findFirst({
    where: { userId: (session.user as any).id },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 5, include: { items: true } } },
  })

  const spendToDate = await prisma.order.aggregate({
    _sum: { totalPence: true },
    where: { retailerId: retailer?.id ?? "", status: { not: "CANCELLED" } },
  })
  const totalSpend = spendToDate._sum.totalPence ?? 0
  const activeOrders = retailer?.orders.filter(o => !["DELIVERED","CANCELLED"].includes(o.status)) ?? []
  const lastOrder = retailer?.orders[0]

  return (
    <>
    <style>{`
      .dash{padding:20px;font-family:system-ui,sans-serif;max-width:900px}
      .dash-title{font-size:22px;font-weight:800;color:#0d1117;margin:0 0 4px;letter-spacing:-.5px}
      .dash-sub{font-size:13px;color:#8888AA;margin:0 0 20px}
      .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
      .stat{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:16px}
      .stat-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8888AA;margin:0 0 8px}
      .stat-val{font-size:22px;font-weight:800;color:#0d1117;letter-spacing:-.5px;margin:0 0 3px}
      .stat-sub{font-size:11px;color:#AAAAAA;margin:0}
      .section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      .section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#8888AA}
      .view-all{font-size:12px;color:#88dde1;text-decoration:none;font-weight:500}
      .orders-list{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;overflow:hidden}
      .order-row{padding:14px 16px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;flex-direction:column;gap:8px}
      .order-row:last-child{border-bottom:none}
      .order-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .order-num{font-size:14px;font-weight:700;color:#1a9da3;text-decoration:none}
      .order-status{display:inline-flex;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;flex-shrink:0}
      .order-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .order-meta{font-size:12px;color:#AAAAAA}
      .order-value{font-size:13px;font-weight:700;color:#0d1117}
      .quick-btns{display:flex;gap:10px;margin-top:4px;flex-wrap:wrap}
      .btn-cyan{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:#88dde1;color:#0a1420;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}
      .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:white;color:#4A4A6A;border:1px solid rgba(0,0,0,.12);border-radius:10px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none}
      @media(max-width:768px){
        .stats{grid-template-columns:1fr 1fr}
        .stat-val{font-size:18px}
        .dash{padding:16px}
      }
    `}</style>
    <div className="dash">
      <h1 className="dash-title">Welcome back</h1>
      <p className="dash-sub">{retailer?.businessName ?? "Your account"}</p>

      <div className="stats">
        <div className="stat">
          <p className="stat-lbl">Active Orders</p>
          <p className="stat-val">{activeOrders.length}</p>
          <p className="stat-sub">in progress</p>
        </div>
        <div className="stat">
          <p className="stat-lbl">Last Order</p>
          <p className="stat-val" style={{fontSize:15}}>{lastOrder ? timeAgo(lastOrder.createdAt) : "—"}</p>
          <p className="stat-sub">{lastOrder?.orderNumber ?? "No orders yet"}</p>
        </div>
        <div className="stat">
          <p className="stat-lbl">Spend to Date</p>
          <p className="stat-val" style={{fontSize:16}}>{fmt(totalSpend)}</p>
          <p className="stat-sub">inc. VAT</p>
        </div>
      </div>

      <div className="section-hdr">
        <span className="section-title">Recent Orders</span>
        <Link href="/orders" className="view-all">View all →</Link>
      </div>

      {!retailer?.orders.length ? (
        <div className="orders-list">
          <div style={{padding:"32px 16px",textAlign:"center",color:"#AAAAAA",fontSize:13}}>
            No orders yet — <Link href="/stock" style={{color:"#88dde1"}}>browse stock</Link>
          </div>
        </div>
      ) : (
        <div className="orders-list">
          {retailer.orders.map(o => {
            const sc = STATUS_COLORS[o.status] ?? {bg:"#F4F5F7",color:"#8888AA"}
            return (
              <div key={o.id} className="order-row">
                <div className="order-top">
                  <Link href={`/orders/${o.id}`} className="order-num">{o.orderNumber}</Link>
                  <span className="order-status" style={{background:sc.bg,color:sc.color}}>{o.status.replace(/_/g," ")}</span>
                </div>
                <div className="order-bottom">
                  <span className="order-meta">{timeAgo(o.createdAt)} · {o.items.length} line{o.items.length!==1?"s":""}</span>
                  <span className="order-value">{fmt(o.totalPence ?? 0)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="quick-btns" style={{marginTop:20}}>
        <Link href="/stock" className="btn-cyan">📦 Browse Stock</Link>
        <Link href="/orders" className="btn-ghost">📋 My Orders</Link>
      </div>
    </div>
    </>
  )
}
