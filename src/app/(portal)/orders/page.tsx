"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

const fmt = (p: number) => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p/100)

const STATUS_COLORS: Record<string,{bg:string;color:string}> = {
  PLACED:{bg:"#E8F8F7",color:"#3A9E9B"}, CONFIRMED:{bg:"#E8F8F7",color:"#3A9E9B"},
  PROCESSING:{bg:"#F3EEFF",color:"#7C3AED"}, PICKED:{bg:"#F3EEFF",color:"#7C3AED"},
  PACKED:{bg:"#FEF3C7",color:"#D97706"}, DISPATCHED:{bg:"#EAFAF3",color:"#0EA572"},
  OUT_FOR_DELIVERY:{bg:"#EAFAF3",color:"#0EA572"}, DELIVERED:{bg:"#F4F5F7",color:"#8888AA"},
  CANCELLED:{bg:"#FFF1F4",color:"#E11D48"},
}
const FILTERS = ["ALL","PLACED","CONFIRMED","PROCESSING","PACKED","DISPATCHED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"]

export default function OrdersPage() {
  const [status, setStatus] = useState("ALL")
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders", status, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "10", ...(status!=="ALL"&&{status}) })
      const r = await fetch("/api/orders?"+p); return r.json()
    },
  })

  const orders = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <>
    <style>{`
      .orders-page{padding:20px;font-family:system-ui,sans-serif;max-width:700px}
      .orders-title{font-size:22px;font-weight:800;color:#0d1117;margin:0 0 4px;letter-spacing:-.5px}
      .orders-sub{font-size:13px;color:#8888AA;margin:0 0 20px}
      .filter-scroll{display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px;scrollbar-width:none}
      .filter-scroll::-webkit-scrollbar{display:none}
      .chip{padding:6px 14px;border-radius:99px;font-size:12px;font-weight:500;white-space:nowrap;border:none;cursor:pointer;flex-shrink:0;transition:all .15s}
      .chip-on{background:#88dde1;color:#0a1420;font-weight:700}
      .chip-off{background:#F4F5F7;color:#4A4A6A}
      .order-card{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:16px;margin-bottom:10px;display:block;text-decoration:none;transition:all .2s}
      .order-card:hover{border-color:#88dde1;box-shadow:0 4px 16px rgba(136,221,225,.15)}
      .order-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px}
      .order-num{font-size:15px;font-weight:700;color:#1a9da3}
      .order-badge{display:inline-flex;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:600;flex-shrink:0}
      .order-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .order-field{background:#f8fafb;border-radius:8px;padding:8px 10px}
      .order-field-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#AAAAAA;margin:0 0 3px}
      .order-field-val{font-size:13px;font-weight:600;color:#0d1117;margin:0}
      .empty{text-align:center;padding:48px 16px;background:white;border-radius:14px;border:1px solid rgba(0,0,0,.08)}
      .pag{display:flex;align-items:center;justify-content:space-between;margin-top:16px}
      .pag-btn{padding:8px 16px;border:1.5px solid rgba(0,0,0,.1);border-radius:8px;font-size:13px;background:white;color:#4A4A6A;cursor:pointer;font-weight:500}
      .pag-btn:disabled{opacity:.35;cursor:not-allowed}
    `}</style>
    <div className="orders-page">
      <h1 className="orders-title">My Orders</h1>
      <p className="orders-sub">{data?.total ?? 0} orders</p>

      <div className="filter-scroll">
        {FILTERS.map(f=>(
          <button key={f} className={"chip "+(status===f?"chip-on":"chip-off")} onClick={()=>{setStatus(f);setPage(1)}}>
            {f==="ALL"?"All":f.replace(/_/g," ")}
          </button>
        ))}
      </div>

      {isLoading ? <p style={{color:"#AAAAAA",fontSize:13}}>Loading…</p>
      : orders.length===0 ? (
        <div className="empty">
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <p style={{fontWeight:600,color:"#0d1117",margin:"0 0 6px"}}>No orders found</p>
          <p style={{fontSize:13,color:"#AAAAAA",margin:0}}>Your orders will appear here</p>
        </div>
      ) : orders.map((o: any) => {
        const sc = STATUS_COLORS[o.status] ?? {bg:"#F4F5F7",color:"#8888AA"}
        return (
          <Link key={o.id} href={`/orders/${o.id}`} className="order-card">
            <div className="order-top">
              <span className="order-num">{o.orderNumber}</span>
              <span className="order-badge" style={{background:sc.bg,color:sc.color}}>{o.status.replace(/_/g," ")}</span>
            </div>
            <div className="order-grid">
              <div className="order-field">
                <p className="order-field-label">Date</p>
                <p className="order-field-val">{new Date(o.createdAt).toLocaleDateString("en-GB")}</p>
              </div>
              <div className="order-field">
                <p className="order-field-label">Value</p>
                <p className="order-field-val">{fmt(o.totalPence ?? 0)}</p>
              </div>
              <div className="order-field">
                <p className="order-field-label">Lines</p>
                <p className="order-field-val">{o.items?.length ?? 0} item{(o.items?.length??0)!==1?"s":""}</p>
              </div>
              <div className="order-field">
                <p className="order-field-label">PO Ref</p>
                <p className="order-field-val" style={{fontSize:12}}>{o.poReference ?? "—"}</p>
              </div>
            </div>
          </Link>
        )
      })}

      {totalPages > 1 && (
        <div className="pag">
          <button className="pag-btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
          <span style={{fontSize:13,color:"#AAAAAA"}}>Page {page} of {totalPages}</span>
          <button className="pag-btn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
        </div>
      )}
    </div>
    </>
  )
}
