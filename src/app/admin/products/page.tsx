"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatCurrencyFromPounds } from "@/lib/utils"

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [editStock, setEditStock] = useState<{id:string;val:string}|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({name:"",sku:"",brandName:"",productType:"BLIND_BOX",unitCost:"",cduSize:"6",rrp:"",stockUnits:"0"})

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(search&&{search}) })
      const r = await fetch("/api/products?"+p); return r.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => { const r = await fetch("/api/products/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); return r.json() },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-products"]}); setEditStock(null) },
  })

  const createMutation = useMutation({
    mutationFn: async (body: any) => { const r = await fetch("/api/products", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); return r.json() },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-products"]}); setShowCreate(false); setForm({name:"",sku:"",brandName:"",productType:"BLIND_BOX",unitCost:"",cduSize:"6",rrp:"",stockUnits:"0"}) },
  })

  const products = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const f = (k: string) => (e: any) => setForm(prev => ({...prev, [k]: e.target.value}))

  return (
    <div className="p-page">
      <div className="row-between mb24">
        <div><h1 className="page-title">Products</h1><p className="page-sub">{data?.total??0} products</p></div>
        <button className="btn-pink" onClick={()=>setShowCreate(true)}>+ Add Product</button>
      </div>
      <div className="search-box mb16"><span style={{color:"#8888AA"}}>🔍</span><input placeholder="Search by name, SKU or brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} /></div>
      <div className="card card-table">
        <table className="tbl">
          <thead><tr><th>Product</th><th>SKU</th><th>Type</th><th>Unit Cost</th><th>CDU</th><th>RRP</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>Loading…</td></tr>
            : products.length===0 ? <tr><td colSpan={8} style={{textAlign:"center",color:"#8888AA",padding:"32px"}}>No products found</td></tr>
            : products.map((p: any) => (
              <tr key={p.id}>
                <td><p className="fw600" style={{fontSize:13,margin:0}}>{p.name}</p><p style={{fontSize:11,color:"#8888AA",margin:0}}>{p.brand?.name}</p></td>
                <td style={{fontFamily:"monospace",fontSize:12,color:"#8888AA"}}>{p.sku}</td>
                <td className="txt-muted fs12">{p.productType?.replace(/_/g," ")}</td>
                <td className="fw600">{formatCurrencyFromPounds(p.unitCostPence)}</td>
                <td className="txt-secondary">{p.cduSize}</td>
                <td className="txt-muted">{formatCurrencyFromPounds(p.rrpPence)}</td>
                <td>
                  {editStock?.id===p.id ? (
                    <div className="row" style={{gap:4}}>
                      <input className="input" style={{width:70,padding:"4px 8px"}} value={editStock.val} onChange={e=>setEditStock({id:p.id,val:e.target.value})} onKeyDown={e=>e.key==="Enter"&&updateMutation.mutate({id:p.id,stockUnits:parseInt(editStock.val)})} autoFocus />
                      <button className="btn-ghost btn-sm" onClick={()=>updateMutation.mutate({id:p.id,stockUnits:parseInt(editStock.val)})}>✓</button>
                      <button className="btn-ghost btn-sm" onClick={()=>setEditStock(null)}>×</button>
                    </div>
                  ) : (
                    <button style={{background:"none",border:"none",cursor:"pointer",fontWeight:600,color:p.stockUnits===0?"#E11D48":p.stockUnits<=10?"#D97706":"#1A1A2E",fontSize:13}} onClick={()=>setEditStock({id:p.id,val:String(p.stockUnits)})}>
                      {p.stockUnits} ✏️
                    </button>
                  )}
                </td>
                <td>
                  <select className="select" style={{width:"auto",padding:"4px 8px",fontSize:12}} value={p.status} onChange={e=>updateMutation.mutate({id:p.id,status:e.target.value})}>
                    {["ACTIVE","LOW_STOCK","OUT_OF_STOCK","COMING_SOON","DISCONTINUED"].map(s=><option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1 && <div className="pagination"><span className="txt-muted fs13">Page {page} of {totalPages}</span><div className="row" style={{gap:8}}><button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button><button className="btn-ghost btn-sm" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button></div></div>}
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div className="modal">
            <div className="modal-title">Add Product <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#8888AA"}}>×</button></div>
            <div className="grid2"><div className="form-row" style={{gridColumn:"1/-1"}}><label className="input-label">Product Name</label><input className="input" value={form.name} onChange={f("name")} placeholder="e.g. Labubu Series 1" /></div><div className="form-row"><label className="input-label">SKU</label><input className="input" value={form.sku} onChange={f("sku")} /></div><div className="form-row"><label className="input-label">Brand</label><input className="input" value={form.brandName} onChange={f("brandName")} /></div><div className="form-row"><label className="input-label">Type</label><select className="select" value={form.productType} onChange={f("productType")}>{["BLIND_BOX","FIGURE","PLUSH","ACCESSORY","BUNDLE"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></div><div className="form-row"><label className="input-label">CDU Size</label><input className="input" type="number" value={form.cduSize} onChange={f("cduSize")} /></div><div className="form-row"><label className="input-label">Unit Cost (£)</label><input className="input" type="number" step="0.01" value={form.unitCost} onChange={f("unitCost")} /></div><div className="form-row"><label className="input-label">RRP (£)</label><input className="input" type="number" step="0.01" value={form.rrp} onChange={f("rrp")} /></div><div className="form-row"><label className="input-label">Opening Stock</label><input className="input" type="number" value={form.stockUnits} onChange={f("stockUnits")} /></div></div>
            <div className="row" style={{gap:8,marginTop:8}}><button className="btn-ghost" style={{flex:1}} onClick={()=>setShowCreate(false)}>Cancel</button><button className="btn-pink" style={{flex:1}} onClick={()=>createMutation.mutate({...form,unitCostPence:Math.round(parseFloat(form.unitCost)*100),rrpPence:Math.round(parseFloat(form.rrp)*100),cduSize:parseInt(form.cduSize),stockUnits:parseInt(form.stockUnits),badges:[]})} disabled={createMutation.isPending}>{createMutation.isPending?"Creating…":"Create Product"}</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
