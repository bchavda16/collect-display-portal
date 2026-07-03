import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { formatCurrencyFromPounds } from "@/lib/utils"
import Link from "next/link"

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard")

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [pending, total, retailers, orders, thisRev, lastRev, lowStock] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["PLACED","CONFIRMED","PROCESSING","PICKED","PACKED"] } } }),
    prisma.order.count(),
    prisma.retailer.count(),
    prisma.order.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { retailer: { select: { businessName: true } }, _count: { select: { items: true } } } }),
    prisma.order.aggregate({ _sum: { totalPence: true }, where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } } }),
    prisma.order.aggregate({ _sum: { totalPence: true }, where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: "CANCELLED" } } }),
    prisma.product.findMany({ where: { stockUnits: { lte: 10 }, status: "ACTIVE" }, orderBy: { stockUnits: "asc" }, take: 5, include: { brand: true } }),
  ])

  const thisRevenue = thisRev._sum.totalPence ?? 0
  const lastRevenue = lastRev._sum.totalPence ?? 0
  const growth = lastRevenue > 0 ? Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 100) : 0

  return (
    <>
      <style>{`
        .db-wrap { padding: 24px; font-family: system-ui, sans-serif; }
        .db-title { font-size: 22px; font-weight: 700; color: #1A1A2E; margin: 0 0 4px; }
        .db-sub { font-size: 13px; color: #8888AA; margin: 0 0 24px; }
        .db-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .db-card { background: white; border: 1px solid rgba(0,0,0,0.09); border-radius: 12px; padding: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .db-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #8888AA; margin: 0 0 8px; }
        .db-val { font-size: 24px; font-weight: 700; color: #1A1A2E; margin: 0 0 4px; }
        .db-meta { font-size: 12px; margin: 0; }
        .db-grid2 { display: grid; grid-template-columns: 1fr 280px; gap: 16px; }
        .db-table-wrap { background: white; border: 1px solid rgba(0,0,0,0.09); border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        .db-table { width: 100%; border-collapse: collapse; }
        .db-table th { background: #F4F5F7; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #8888AA; padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(0,0,0,0.08); }
        .db-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .db-table tr:last-child td { border-bottom: none; }
        .db-badge { display: inline-flex; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
        .db-right-card { background: white; border: 1px solid rgba(0,0,0,0.09); border-radius: 12px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05); margin-bottom: 14px; }
        .db-stock-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
        .db-qa-btn { display: block; padding: 9px 14px; background: white; border: 1px solid #F0A3BC; border-radius: 8px; font-size: 13px; font-weight: 500; color: #F0A3BC; text-decoration: none; text-align: center; margin-bottom: 8px; }
      `}</style>
      <div className="db-wrap">
        <h1 className="db-title">Dashboard</h1>
        <p className="db-sub">Overview of your distribution portal</p>

        <div className="db-grid4">
          <div className="db-card">
            <p className="db-label">Revenue this month</p>
            <p className="db-val">{formatCurrencyFromPounds(thisRevenue)}</p>
            <p className="db-meta" style={{color: growth >= 0 ? "#0EA572" : "#E11D48"}}>{growth >= 0 ? "↑" : "↓"} {Math.abs(growth)}% vs last month</p>
          </div>
          <div className="db-card">
            <p className="db-label">Pending orders</p>
            <p className="db-val">{pending}</p>
            <p className="db-meta" style={{color:"#8888AA"}}>Awaiting processing</p>
          </div>
          <div className="db-card">
            <p className="db-label">Total orders</p>
            <p className="db-val">{total}</p>
            <p className="db-meta" style={{color:"#8888AA"}}>All time</p>
          </div>
          <div className="db-card">
            <p className="db-label">Active retailers</p>
            <p className="db-val">{retailers}</p>
            <p className="db-meta" style={{color:"#8888AA"}}>Registered accounts</p>
          </div>
        </div>

        <div className="db-grid2">
          <div>
            <p className="db-label" style={{marginBottom:10}}>Recent Orders</p>
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Order</th><th>Retailer</th><th>Value</th><th>Items</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign:"center",color:"#8888AA"}}>No orders yet</td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id}>
                      <td style={{fontWeight:600,color:"#C4638A"}}>{o.orderNumber}</td>
                      <td style={{color:"#4A4A6A"}}>{o.retailer.businessName}</td>
                      <td style={{fontWeight:500}}>{formatCurrencyFromPounds(o.totalPence)}</td>
                      <td style={{color:"#4A4A6A"}}>{o._count.items}</td>
                      <td><span className="db-badge" style={{background:"#E8F8F7",color:"#3A9E9B"}}>{o.status.replace(/_/g," ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <p className="db-label" style={{marginBottom:10}}>Low Stock</p>
            <div className="db-right-card">
              {lowStock.length === 0 ? (
                <p style={{fontSize:13,color:"#8888AA",margin:0,textAlign:"center"}}>All products well stocked</p>
              ) : lowStock.map(p => (
                <div key={p.id} className="db-stock-row">
                  <div style={{minWidth:0}}>
                    <p style={{fontSize:12,fontWeight:500,color:"#1A1A2E",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                    <p style={{fontSize:11,color:"#8888AA",margin:0}}>{p.brand?.name}</p>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:p.stockUnits===0?"#E11D48":"#D97706",flexShrink:0}}>{p.stockUnits} left</span>
                </div>
              ))}
            </div>
            <p className="db-label" style={{marginBottom:10}}>Quick Actions</p>
            <Link href="/admin/retailers" className="db-qa-btn">+ Add Retailer</Link>
            <Link href="/admin/products" className="db-qa-btn">+ Add Product</Link>
            <Link href="/admin/imports" className="db-qa-btn">↑ Import CSV</Link>
          </div>
        </div>
      </div>
    </>
  )
}
