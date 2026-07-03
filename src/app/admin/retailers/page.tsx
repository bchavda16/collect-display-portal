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
    <>
    <style>{`
  .p-page{padding:24px;font-family:system-ui,sans-serif}
  .page-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
  .page-sub{font-size:13px;color:#8888AA;margin:0 0 24px}
  .section-head{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA;margin:0 0 10px}
  .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
  .card-pad{padding:16px}
  .card-table{overflow:hidden}
  .tbl{width:100%;border-collapse:collapse}
  .tbl th{background:#F4F5F7;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8888AA;padding:10px 14px;text-align:left;border-bottom:1px solid rgba(0,0,0,.08)}
  .tbl td{padding:10px 14px;font-size:13px;border-bottom:1px solid rgba(0,0,0,.06);color:#1A1A2E}
  .tbl tr:last-child td{border-bottom:none}
  .tbl tr:hover td{background:rgba(0,0,0,.01)}
  .badge{display:inline-flex;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
  .badge-teal{background:#E8F8F7;color:#3A9E9B}
  .badge-purple{background:#F3EEFF;color:#7C3AED}
  .badge-amber{background:#FEF3C7;color:#D97706}
  .badge-green{background:#EAFAF3;color:#0EA572}
  .badge-grey{background:#F4F5F7;color:#8888AA}
  .badge-red{background:#FFF1F4;color:#E11D48}
  .badge-pink{background:#FDE8EF;color:#C4638A}
  .row{display:flex;align-items:center;gap:12px}
  .row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .grid-3-1{display:grid;grid-template-columns:3fr 1fr;gap:16px}
  .mb4{margin-bottom:4px}.mb8{margin-bottom:8px}.mb12{margin-bottom:12px}.mb16{margin-bottom:16px}.mb24{margin-bottom:24px}
  .mt8{margin-top:8px}.mt16{margin-top:16px}
  .txt-primary{color:#1A1A2E}.txt-secondary{color:#4A4A6A}.txt-muted{color:#8888AA}
  .txt-pink{color:#C4638A}.txt-teal{color:#3A9E9B}.txt-green{color:#0EA572}.txt-red{color:#E11D48}.txt-amber{color:#D97706}
  .fw600{font-weight:600}.fw700{font-weight:700}
  .fs11{font-size:11px}.fs12{font-size:12px}.fs13{font-size:13px}
  .btn-pink{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#F0A3BC;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none}
  .btn-pink:hover{background:#E88BAA}
  .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:white;color:#4A4A6A;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;text-decoration:none}
  .btn-ghost:hover{background:#F4F5F7}
  .btn-sm{padding:5px 10px;font-size:12px}
  .input{width:100%;padding:9px 12px;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;color:#1A1A2E;outline:none;box-sizing:border-box;background:white}
  .input:focus{border-color:#F0A3BC;box-shadow:0 0 0 3px rgba(240,163,188,.15)}
  .input-label{display:block;font-size:11px;font-weight:600;color:#4A4A6A;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em}
  .select{width:100%;padding:9px 12px;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;color:#1A1A2E;outline:none;background:white;cursor:pointer}
  .chip{padding:4px 12px;border-radius:99px;font-size:12px;font-weight:500;background:#F4F5F7;color:#4A4A6A;cursor:pointer;border:none}
  .chip:hover{background:#FDE8EF;color:#C4638A}
  .chip-active{background:#F0A3BC;color:white}
  .chip-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
  .search-box{display:flex;align-items:center;gap:10px;padding:10px 14px;background:white;border:1px solid rgba(0,0,0,.09);border-radius:10px;margin-bottom:14px}
  .search-box input{border:none;outline:none;font-size:13px;color:#1A1A2E;background:transparent;flex:1}
  .product-card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;overflow:hidden;transition:box-shadow .2s}
  .product-card:hover{box-shadow:0 4px 16px rgba(240,163,188,.2);border-color:rgba(240,163,188,.4)}
  .product-img{height:120px;background:#F4F5F7;display:flex;align-items:center;justify-content:center;font-size:36px;position:relative}
  .product-body{padding:12px}
  .price-grid{display:grid;grid-template-columns:repeat(3,1fr);background:#F9FAFB;border:1px solid rgba(0,0,0,.07);border-radius:8px;padding:8px;margin:8px 0}
  .price-col{text-align:center}
  .price-col-label{font-size:9px;color:#8888AA;margin:0 0 2px}
  .price-col-val{font-size:12px;font-weight:600;color:#1A1A2E;margin:0}
  .price-col-val.pink{color:#C4638A}
  .price-col-val.muted{color:#8888AA}
  .stepper{display:flex;align-items:center;border:1px solid rgba(0,0,0,.12);border-radius:8px;overflow:hidden}
  .stepper button{background:#F4F5F7;border:none;padding:6px 10px;font-size:14px;cursor:pointer;color:#4A4A6A}
  .stepper span{font-size:13px;font-weight:600;padding:0 8px;color:#1A1A2E;min-width:30px;text-align:center}
  .add-btn{flex:1;background:#F0A3BC;color:white;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;padding:7px;display:flex;align-items:center;justify-content:center;gap:4px}
  .add-btn:hover{background:#E88BAA}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(2px);z-index:50;display:flex;align-items:center;justify-content:center;padding:16px}
  .modal{background:white;border-radius:16px;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.15)}
  .modal-title{font-size:16px;font-weight:700;color:#1A1A2E;margin:0 0 20px;display:flex;align-items:center;justify-content:space-between}
  .form-row{margin-bottom:14px}
  .stat-card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
  .stat-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#8888AA;margin:0 0 8px}
  .stat-val{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
  .stat-sub{font-size:12px;margin:0;color:#8888AA}
  .annc-card{border-left:3px solid #5CC8C5;background:#E8F8F7;border-radius:0 8px 8px 0;padding:10px 14px;margin-bottom:10px}
  .annc-card.pink{border-color:#F0A3BC;background:#FDE8EF}
  .annc-title{font-size:13px;font-weight:600;color:#1A1A2E;margin:0 0 4px}
  .annc-body{font-size:12px;color:#4A4A6A;margin:0}
  .tag-pink{background:#FDE8EF;color:#C4638A;border:1px solid rgba(240,163,188,.3);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .tag-teal{background:#E8F8F7;color:#3A9E9B;border:1px solid rgba(92,200,197,.3);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}
  .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 16px;text-align:center}
  .pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid rgba(0,0,0,.08)}
  .drawer{position:fixed;inset-y:0;right:0;width:380px;background:white;border-left:1px solid rgba(0,0,0,.09);z-index:50;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.08)}
  .drawer-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.08)}
  .drawer-body{flex:1;overflow-y:auto;padding:16px}
  .drawer-footer{border-top:1px solid rgba(0,0,0,.08);padding:16px}
  .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.2);z-index:40}
`}</style>
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
    </>
  )
}