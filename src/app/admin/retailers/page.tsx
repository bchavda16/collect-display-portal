"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDate } from "@/lib/utils"

export default function AdminRetailersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ businessName:"", contactName:"", email:"", phone:"", pricingTier:"STANDARD", paymentTerms:"PROFORMA", addressLine1:"", city:"", postcode:"" })

  const { data, isLoading } = useQuery({
    queryKey: ["admin-retailers", search, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(search&&{search}) })
      const r = await fetch("/api/retailers?"+p); return r.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (body: any) => { const r = await fetch("/api/retailers", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); return r.json() },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-retailers"]}); setShowCreate(false); setForm({businessName:"",contactName:"",email:"",phone:"",pricingTier:"STANDARD",paymentTerms:"PROFORMA",addressLine1:"",city:"",postcode:""}) },
  })

  const tierBadge: Record<string,string> = { PLATINUM:"badge-purple", GOLD:"badge-amber", SILVER:"badge-teal", STANDARD:"badge-grey" }
  const retailers = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const f = (k: string) => (e: any) => setForm(prev => ({...prev, [k]: e.target.value}))

  return (
    <div className="p-page">
      <div className="row-between mb24">
        <div><h1 className="page-title">Retailers</h1><p className="page-sub">{data?.total??0} accounts</p></div>
        <button className="btn-pink" onClick={()=>setShowCreate(true)}>+ Add Retailer</button>
      </div>
      <div className="search-box mb16"><span style={{color:"#8888AA"}}>🔍</span><input placeholder="Search by name or email…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} /></div>
      <div className="card card-table">
        <table className="tbl">
          <thead><tr><th>Business</th><th>Contact</th><th>Tier</th><th>Terms</th><th>Orders</th><th>Joined</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>Loading…</td></tr>
            : retailers.length===0 ? <tr><td colSpan={6} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>No retailers found</td></tr>
            : retailers.map((r: any) => (
              <tr key={r.id}>
                <td><p className="fw600 fs13" style={{margin:0}}>{r.businessName}</p><p className="txt-muted fs12" style={{margin:0}}>{r.user?.email}</p></td>
                <td><p className="fs13" style={{margin:0}}>{r.contactName}</p>{r.phone&&<p className="txt-muted fs12" style={{margin:0}}>{r.phone}</p>}</td>
                <td><span className={"badge "+(tierBadge[r.pricingTier]??"badge-grey")}>{r.pricingTier}</span></td>
                <td className="txt-secondary fs13">{r.paymentTerms?.replace(/_/g," ")}</td>
                <td className="txt-secondary">{r._count?.orders??0}</td>
                <td className="txt-muted fs13">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1 && <div className="pagination"><span className="txt-muted fs13">Page {page} of {totalPages}</span><div className="row" style={{gap:8}}><button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button><button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button></div></div>}
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div className="modal">
            <div className="modal-title">Add Retailer <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#8888AA"}}>×</button></div>
            <div className="grid2">
              <div className="form-row" style={{gridColumn:"1/-1"}}><label className="input-label">Business Name</label><input className="input" value={form.businessName} onChange={f("businessName")} /></div>
              <div className="form-row"><label className="input-label">Contact Name</label><input className="input" value={form.contactName} onChange={f("contactName")} /></div>
              <div className="form-row"><label className="input-label">Email</label><input className="input" type="email" value={form.email} onChange={f("email")} /></div>
              <div className="form-row"><label className="input-label">Phone</label><input className="input" value={form.phone} onChange={f("phone")} /></div>
              <div className="form-row"><label className="input-label">Pricing Tier</label><select className="select" value={form.pricingTier} onChange={f("pricingTier")}>{["STANDARD","SILVER","GOLD","PLATINUM"].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="form-row"><label className="input-label">Payment Terms</label><select className="select" value={form.paymentTerms} onChange={f("paymentTerms")}>{["PROFORMA","NET_14","NET_30","NET_60"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></div>
              <div className="form-row" style={{gridColumn:"1/-1"}}><label className="input-label">Address Line 1</label><input className="input" value={form.addressLine1} onChange={f("addressLine1")} /></div>
              <div className="form-row"><label className="input-label">City</label><input className="input" value={form.city} onChange={f("city")} /></div>
              <div className="form-row"><label className="input-label">Postcode</label><input className="input" value={form.postcode} onChange={f("postcode")} /></div>
            </div>
            <div className="row" style={{gap:8,marginTop:8}}>
              <button className="btn-ghost" style={{flex:1}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button className="btn-pink" style={{flex:1}} onClick={()=>createMutation.mutate({...form,address:{line1:form.addressLine1,city:form.city,postcode:form.postcode,country:"GB"}})} disabled={createMutation.isPending}>{createMutation.isPending?"Creating…":"Create & Send Welcome Email"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
