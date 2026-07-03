"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatCurrencyFromPounds, formatDate } from "@/lib/utils"
import Link from "next/link"

const STATUSES = ["ALL","PLACED","CONFIRMED","PROCESSING","PICKED","PACKED","DISPATCHED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"]
const statusBadge: Record<string,string> = { PLACED:"badge-teal",CONFIRMED:"badge-teal",PROCESSING:"badge-purple",PICKED:"badge-purple",PACKED:"badge-amber",DISPATCHED:"badge-green",OUT_FOR_DELIVERY:"badge-green",DELIVERED:"badge-grey",CANCELLED:"badge-red" }

export default function OrdersPage() {
  const [status, setStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ["orders", status, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(status !== "ALL" && { status }) })
      const r = await fetch("/api/orders?"+p); return r.json()
    },
  })
  const orders = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  return (
    <div className="p-page">
      <div className="mb24"><h1 className="page-title">My Orders</h1><p className="page-sub">{data?.total ?? 0} orders total</p></div>
      <div className="chip-row">
        {STATUSES.map(s => <button key={s} className={"chip"+(status===s?" chip-active":"")} onClick={()=>{setStatus(s);setPage(1)}}>{s==="ALL"?"All":s.replace(/_/g," ")}</button>)}
      </div>
      <div className="card card-table">
        <table className="tbl">
          <thead><tr><th>Order</th><th>Date</th><th>PO Ref</th><th>Lines</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>Loading…</td></tr>
            : orders.length===0 ? <tr><td colSpan={6} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>No orders found</td></tr>
            : orders.map((o: any) => (
              <tr key={o.id}>
                <td><Link href={"/orders/"+o.id} style={{color:"#C4638A",fontWeight:600,textDecoration:"none"}}>{o.orderNumber}</Link></td>
                <td className="txt-muted">{formatDate(o.createdAt)}</td>
                <td style={{fontFamily:"monospace",fontSize:12,color:"#8888AA"}}>{o.poReference??"-"}</td>
                <td className="txt-secondary">{o.items?.length??0}</td>
                <td className="fw600">{formatCurrencyFromPounds(o.totalPence)}</td>
                <td><span className={"badge "+(statusBadge[o.status]??"badge-grey")}>{o.status.replace(/_/g," ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="pagination">
            <span className="txt-muted fs13">Page {page} of {totalPages}</span>
            <div className="row" style={{gap:8}}>
              <button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
