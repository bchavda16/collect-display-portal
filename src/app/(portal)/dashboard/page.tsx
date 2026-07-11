import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { formatCurrency, formatRelativeDate } from "@/lib/utils"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const retailer = await prisma.retailer.findFirst({
    where: { userId: (session.user as any).id },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 5, include: { items: true } } },
  })

  const [announcements, latestProducts] = await Promise.all([
    prisma.announcement.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }], take: 3,
    }),
    prisma.product.findMany({
      where: { status: { in: ["ACTIVE", "LOW_STOCK"] } },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { brand: true, images: { take: 1 } },
    }),
  ])

  const activeOrders = retailer?.orders.filter(o => !["DELIVERED","CANCELLED"].includes(o.status)) ?? []
  const totalUnits = activeOrders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0)
  const lastOrder = retailer?.orders[0]

  const statusColors: Record<string,{bg:string;color:string}> = {
    PLACED:{bg:"#E8F8F7",color:"#3A9E9B"}, CONFIRMED:{bg:"#E8F8F7",color:"#3A9E9B"},
    PROCESSING:{bg:"#F3EEFF",color:"#7C3AED"}, PICKED:{bg:"#F3EEFF",color:"#7C3AED"},
    PACKED:{bg:"#FEF3C7",color:"#D97706"}, DISPATCHED:{bg:"#EAFAF3",color:"#0EA572"},
    OUT_FOR_DELIVERY:{bg:"#EAFAF3",color:"#0EA572"}, DELIVERED:{bg:"#F4F5F7",color:"#8888AA"},
    CANCELLED:{bg:"#FFF1F4",color:"#E11D48"},
  }

  return (
    <>
    <style>{`
      .p-page{padding:24px;font-family:system-ui,sans-serif}
      .page-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
      .page-sub{font-size:13px;color:#8888AA;margin:0 0 24px}
      .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
      .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
      .grid-3-1{display:grid;grid-template-columns:3fr 1fr;gap:20px}
      .stat-card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .stat-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA;margin:0 0 8px}
      .stat-val{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
      .stat-sub{font-size:12px;margin:0;color:#8888AA}
      .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .card-pad{padding:16px}
      .section-head{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA;margin:0 0 12px;display:flex;align-items:center;justify-content:space-between}
      .tbl{width:100%;border-collapse:collapse}
      .tbl th{background:#F4F5F7;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8888AA;padding:9px 14px;text-align:left;border-bottom:1px solid rgba(0,0,0,.08)}
      .tbl td{padding:10px 14px;font-size:13px;border-bottom:1px solid rgba(0,0,0,.06)}
      .tbl tr:last-child td{border-bottom:none}
      .annc-card{border-left:3px solid #5CC8C5;background:#E8F8F7;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:8px}
      .annc-card.pink{border-color:#F0A3BC;background:#FDE8EF}
      .annc-card.amber{border-color:#D97706;background:#FEF3C7}
      .annc-title{font-size:12px;font-weight:600;color:#1A1A2E;margin:0 0 3px}
      .annc-body{font-size:11px;color:#4A4A6A;margin:0;line-height:1.5}
      .badge{display:inline-flex;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
      .product-mini{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;overflow:hidden;transition:all .2s;text-decoration:none;display:block}
      .product-mini:hover{box-shadow:0 4px 16px rgba(240,163,188,.2);border-color:rgba(240,163,188,.4);transform:translateY(-2px)}
      .product-mini-img{height:175px;width:100%;background:linear-gradient(135deg,#FDE8EF,#E8F8F7);display:flex;align-items:center;justify-content:center;font-size:36px;overflow:hidden;position:relative}
      .product-mini-body{padding:12px}
      .product-mini-brand{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#3A9E9B;margin:0 0 3px}
      .product-mini-name{font-size:12px;font-weight:600;color:#1A1A2E;margin:0 0 6px;line-height:1.3}
      .product-mini-price{display:flex;justify-content:space-between;font-size:12px}
      .btn-pink{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#F0A3BC;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none}
      .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:white;color:#4A4A6A;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none}
      .mb20{margin-bottom:20px}.mb24{margin-bottom:24px}
    `}</style>
    <div className="p-page">
      <div className="mb24">
        <h1 className="page-title">Welcome back</h1>
        <p className="page-sub">{retailer?.businessName ?? "Your account"}</p>
      </div>

      <div className="grid4">
        {[
          {label:"Active Orders",val:String(activeOrders.length),sub:"in progress"},
          {label:"Units on Order",val:String(totalUnits),sub:"across active orders"},
          {label:"Last Order",val:lastOrder?formatRelativeDate(lastOrder.createdAt):"—",sub:lastOrder?.orderNumber??"No orders yet"},
          {label:"Credit Limit",val:retailer?.creditLimitPence?"£"+(retailer.creditLimitPence/100).toFixed(2):"—",sub:retailer?.paymentTerms?.replace(/_/g," ")??""},
        ].map(c=>(
          <div key={c.label} className="stat-card">
            <p className="stat-label">{c.label}</p>
            <p className="stat-val">{c.val}</p>
            <p className="stat-sub">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Latest stock */}
      <div className="mb24">
        <div className="section-head">
          <span>Latest Stock</span>
          <Link href="/stock" style={{fontSize:12,color:"#F0A3BC",textDecoration:"none",fontWeight:500}}>View all →</Link>
        </div>
        <div className="grid3">
          {latestProducts.map(p=>(
            <Link key={p.id} href="/stock" className="product-mini">
              <div className="product-mini-img">
                {p.images?.[0]?.url
                  ? <img src={p.images[0].url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}} />
                  : <span>🎁</span>}
              </div>
              <div className="product-mini-body">
                <p className="product-mini-brand">{p.brand?.name}</p>
                <p className="product-mini-name">{p.name}</p>
                <div className="product-mini-price">
                  <span style={{color:"#C4638A",fontWeight:600}}>{formatCurrency(p.unitCostPence)}/unit</span>
                  <span style={{color:p.stockUnits<=10?"#D97706":"#0EA572",fontWeight:600}}>{p.stockUnits} left</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid-3-1">
        <div>
          <div className="section-head">
            <span>Recent Orders</span>
            <Link href="/orders" style={{fontSize:12,color:"#F0A3BC",textDecoration:"none",fontWeight:500}}>View all →</Link>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <table className="tbl">
              <thead><tr><th>Order</th><th>Date</th><th>Lines</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                {!retailer?.orders.length?(
                  <tr><td colSpan={5} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>No orders yet — <Link href="/stock" style={{color:"#F0A3BC"}}>browse stock</Link></td></tr>
                ):retailer.orders.map(o=>(
                  <tr key={o.id}>
                    <td><Link href={"/orders/"+o.id} style={{color:"#C4638A",fontWeight:600,textDecoration:"none"}}>{o.orderNumber}</Link></td>
                    <td style={{color:"#8888AA"}}>{formatRelativeDate(o.createdAt)}</td>
                    <td style={{color:"#4A4A6A"}}>{o.items.length}</td>
                    <td style={{fontWeight:600}}>{formatCurrency(o.totalPence)}</td>
                    <td><span className="badge" style={{background:statusColors[o.status]?.bg??"#F4F5F7",color:statusColors[o.status]?.color??"#8888AA"}}>{o.status.replace(/_/g," ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Link href="/stock" className="btn-pink">📦 Browse Stock</Link>
            <Link href="/orders" className="btn-ghost">📋 My Orders</Link>
          </div>
        </div>
        <div>
          <div className="section-head">Announcements</div>
          {announcements.length===0?(
            <div className="card card-pad"><p style={{fontSize:13,color:"#8888AA",textAlign:"center",margin:0}}>No announcements</p></div>
          ):announcements.map((a,i)=>(
            <div key={a.id} className={"annc-card"+(a.type==="PROMO"?" pink":a.type==="WARNING"?" amber":"")}>
              <p className="annc-title">{a.title}</p>
              <p className="annc-body">{a.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  )
}
