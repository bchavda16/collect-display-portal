"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatCurrencyFromPounds, formatDate } from "@/lib/utils"

const STATUSES = ["ALL","PLACED","CONFIRMED","PROCESSING","PICKED","PACKED","DISPATCHED","OUT_FOR_DELIVERY","DELIVERED","CANCELLED"]
const statusBadge: Record<string,string> = { PLACED:"badge-teal",CONFIRMED:"badge-teal",PROCESSING:"badge-purple",PICKED:"badge-purple",PACKED:"badge-amber",DISPATCHED:"badge-green",OUT_FOR_DELIVERY:"badge-green",DELIVERED:"badge-grey",CANCELLED:"badge-red" }

export default function AdminOrdersPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState("ALL")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<any>(null)
  const [newStatus, setNewStatus] = useState("")
  const [tracking, setTracking] = useState("")
  const [carrier, setCarrier] = useState("")
  const [note, setNote] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", status, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(status!=="ALL"&&{status}) })
      const r = await fetch("/api/orders?"+p); return r.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const r = await fetch("/api/orders/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-orders"]}); setEditing(null) },
  })

  const orders = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="p-page">
      <div className="row-between mb24"><div><h1 className="page-title">Orders</h1><p className="page-sub">{data?.total??0} total</p></div></div>
      <div className="chip-row">
        {STATUSES.map(s=><button key={s} className={"chip"+(status===s?" chip-active":"")} onClick={()=>{setStatus(s);setPage(1)}}>{s==="ALL"?"All":s.replace(/_/g," ")}</button>)}
      </div>
      <div className="card card-table">
        <table className="tbl">
          <thead><tr><th>Order</th><th>Retailer</th><th>Date</th><th>Items</th><th>Value</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>Loading…</td></tr>
            : orders.length===0 ? <tr><td colSpan={7} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>No orders found</td></tr>
            : orders.map((o: any) => (
              <tr key={o.id}>
                <td className="fw600 txt-pink">{o.orderNumber}</td>
                <td className="txt-secondary">{o.retailer?.businessName}</td>
                <td className="txt-muted">{formatDate(o.createdAt)}</td>
                <td className="txt-secondary">{o._count?.items??o.items?.length??0}</td>
                <td className="fw600">{formatCurrencyFromPounds(o.totalPence)}</td>
                <td><span className={"badge "+(statusBadge[o.status]??"badge-grey")}>{o.status.replace(/_/g," ")}</span></td>
                <td><button className="btn-ghost btn-sm" onClick={()=>{setEditing(o);setNewStatus(o.status);setTracking(o.trackingNumber??"");setCarrier(o.carrierName??"");setNote("")}}>Update</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1 && <div className="pagination"><span className="txt-muted fs13">Page {page} of {totalPages}</span><div className="row" style={{gap:8}}><button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button><button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button></div></div>}
      </div>
      {editing && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditing(null)}>
          <div className="modal">
            <div className="modal-title">{editing.orderNumber} <button onClick={()=>setEditing(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#8888AA"}}>×</button></div>
            <div className="form-row"><label className="input-label">Status</label><select className="select" value={newStatus} onChange={e=>setNewStatus(e.target.value)}>{STATUSES.filter(s=>s!=="ALL").map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select></div>
            <div className="form-row"><label className="input-label">Carrier</label><input className="input" value={carrier} onChange={e=>setCarrier(e.target.value)} placeholder="e.g. Royal Mail" /></div>
            <div className="form-row"><label className="input-label">Tracking number</label><input className="input" value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="e.g. RM123456789GB" /></div>
            <div className="form-row"><label className="input-label">Note (optional)</label><input className="input" value={note} onChange={e=>setNote(e.target.value)} placeholder="Internal note…" /></div>
            <div className="row" style={{gap:8,marginTop:20}}>
              <button className="btn-ghost" style={{flex:1}} onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn-pink" style={{flex:1}} onClick={()=>updateMutation.mutate({id:editing.id,status:newStatus,trackingNumber:tracking||undefined,carrierName:carrier||undefined,note:note||undefined})} disabled={updateMutation.isPending}>{updateMutation.isPending?"Saving…":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
