"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatCurrency } from "@/lib/utils"

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [editStock, setEditStock] = useState<{id:string;val:string}|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [form, setForm] = useState({name:"",sku:"",brandName:"",productType:"BLIND_BOX",unitCost:"",cduSize:"6",rrp:"",stockUnits:"0"})
  const [editForm, setEditForm] = useState({name:"",unitCost:"",rrp:"",cduSize:"",description:""})

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", search, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(search&&{search}) })
      const r = await fetch("/api/products?"+p); return r.json()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const r = await fetch("/api/products/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-products"]}); setEditStock(null); setEditingProduct(null) },
  })

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/products", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-products"]}); setShowCreate(false); setForm({name:"",sku:"",brandName:"",productType:"BLIND_BOX",unitCost:"",cduSize:"6",rrp:"",stockUnits:"0"}) },
  })

  const products = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const f = (k: string) => (e: any) => setForm(prev => ({...prev, [k]: e.target.value}))
  const ef = (k: string) => (e: any) => setEditForm(prev => ({...prev, [k]: e.target.value}))

  const openEdit = (p: any) => {
    setEditingProduct(p)
    setEditForm({
      name: p.name,
      unitCost: (p.unitCostPence / 100).toFixed(2),
      rrp: (p.rrpPence / 100).toFixed(2),
      cduSize: String(p.cduSize),
      description: p.description ?? "",
    })
  }

  const s: Record<string,any> = {
    page: {padding:24,fontFamily:"system-ui,sans-serif"},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 20px"},
    rowBetween: {display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:16},
    btnPink: {display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 18px",background:"#F0A3BC",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnSm: {display:"inline-flex",alignItems:"center",gap:4,padding:"5px 10px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer"},
    searchBox: {display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:10,marginBottom:16},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden"},
    th: {background:"#F4F5F7",fontSize:10,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em",color:"#8888AA",padding:"10px 16px",textAlign:"left" as const,borderBottom:"1px solid rgba(0,0,0,.08)"},
    td: {padding:"12px 16px",fontSize:13,borderBottom:"1px solid rgba(0,0,0,.06)",verticalAlign:"middle" as const},
    overlay: {position:"fixed" as const,inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:520,width:"100%",maxHeight:"90vh",overflowY:"auto" as const,boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    modalTitle: {fontSize:18,fontWeight:700,color:"#1A1A2E",margin:"0 0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"},
    sLabel: {fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".08em",color:"#8888AA",margin:"0 0 12px",paddingBottom:8,borderBottom:"1px solid rgba(0,0,0,.07)"},
    grid2: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16},
    fGroup: {marginBottom:14},
    iLabel: {display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".05em"},
    input: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white"},
    select: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",background:"white"},
    btnRow: {display:"flex",gap:10,marginTop:24},
    inputSm: {width:72,padding:"4px 8px",border:"1.5px solid #F0A3BC",borderRadius:6,fontSize:13,color:"#1A1A2E",outline:"none",textAlign:"center" as const},
  }

  return (
    <div style={s.page}>
      <div style={s.rowBetween}>
        <div><h1 style={s.title}>Products</h1><p style={s.sub}>{data?.total ?? 0} products</p></div>
        <button style={s.btnPink} onClick={()=>setShowCreate(true)}>+ Add Product</button>
      </div>

      <div style={s.searchBox}>
        <span style={{color:"#8888AA",fontSize:16}}>🔍</span>
        <input style={{border:"none",outline:"none",fontSize:13,color:"#1A1A2E",background:"transparent",flex:1}} placeholder="Search by name, SKU or brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#8888AA",fontSize:16}}>×</button>}
      </div>

      <div style={s.card}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>{["Product","SKU","Type","Unit Cost","CDU","RRP","Stock","Status","Actions"].map(h=><th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={9} style={{...s.td,textAlign:"center",color:"#8888AA",padding:32}}>Loading…</td></tr>
            : products.length===0 ? <tr><td colSpan={9} style={{...s.td,textAlign:"center",color:"#8888AA",padding:48}}>No products found</td></tr>
            : products.map((p: any) => (
              <tr key={p.id}>
                <td style={s.td}>
                  <div style={{fontWeight:600,color:"#1A1A2E",marginBottom:2}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#8888AA"}}>{p.brand?.name}</div>
                </td>
                <td style={{...s.td,fontFamily:"monospace",fontSize:12,color:"#8888AA"}}>{p.sku}</td>
                <td style={{...s.td,color:"#4A4A6A"}}>{p.productType?.replace(/_/g," ")}</td>
                <td style={{...s.td,fontWeight:600}}>{formatCurrency(p.unitCostPence)}</td>
                <td style={{...s.td,color:"#4A4A6A"}}>×{p.cduSize}</td>
                <td style={{...s.td,color:"#8888AA"}}>{formatCurrency(p.rrpPence)}</td>
                <td style={s.td}>
                  {editStock?.id===p.id ? (
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <input style={s.inputSm} value={editStock.val} onChange={e=>setEditStock({id:p.id,val:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")updateMutation.mutate({id:p.id,stockUnits:parseInt(editStock.val)});if(e.key==="Escape")setEditStock(null)}} autoFocus />
                      <button onClick={()=>updateMutation.mutate({id:p.id,stockUnits:parseInt(editStock.val)})} style={{background:"#0EA572",border:"none",color:"white",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:12}}>✓</button>
                      <button onClick={()=>setEditStock(null)} style={{background:"none",border:"1px solid rgba(0,0,0,.12)",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:12,color:"#8888AA"}}>×</button>
                    </div>
                  ) : (
                    <button onClick={()=>setEditStock({id:p.id,val:String(p.stockUnits)})} style={{background:"none",border:"none",cursor:"pointer",fontWeight:600,color:p.stockUnits===0?"#E11D48":p.stockUnits<=10?"#D97706":"#1A1A2E",fontSize:13,padding:0,display:"flex",alignItems:"center",gap:4}}>
                      {p.stockUnits.toLocaleString()} <span style={{fontSize:11}}>✏️</span>
                    </button>
                  )}
                </td>
                <td style={s.td}>
                  <select style={{...s.select,width:"auto",padding:"4px 8px",fontSize:12}} value={p.status} onChange={e=>updateMutation.mutate({id:p.id,status:e.target.value})}>
                    {["ACTIVE","LOW_STOCK","OUT_OF_STOCK","COMING_SOON","DISCONTINUED"].map(st=><option key={st} value={st}>{st.replace(/_/g," ")}</option>)}
                  </select>
                </td>
                <td style={s.td}>
                  <button style={s.btnSm} onClick={()=>openEdit(p)}>✏️ Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid rgba(0,0,0,.08)"}}>
            <span style={{fontSize:13,color:"#8888AA"}}>Page {page} of {totalPages}</span>
            <div style={{display:"flex",gap:8}}>
              <button style={{...s.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <button style={{...s.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&setEditingProduct(null)}>
          <div style={s.modal}>
            <div style={s.modalTitle}>
              <div>
                <div style={{fontSize:16}}>Edit Product</div>
                <div style={{fontSize:12,fontWeight:400,color:"#8888AA",marginTop:2,fontFamily:"monospace"}}>{editingProduct.sku}</div>
              </div>
              <button onClick={()=>setEditingProduct(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0,lineHeight:1}}>×</button>
            </div>

            <p style={s.sLabel}>Product Details</p>
            <div style={{...s.fGroup,marginBottom:16}}>
              <label style={s.iLabel}>Product Name</label>
              <input style={s.input} value={editForm.name} onChange={ef("name")} />
            </div>
            <div style={{...s.fGroup,marginBottom:16}}>
              <label style={s.iLabel}>Description (optional)</label>
              <textarea style={{...s.input,resize:"none" as const,height:70}} value={editForm.description} onChange={ef("description")} placeholder="Product description…" />
            </div>

            <p style={{...s.sLabel,marginTop:8}}>Pricing</p>
            <div style={s.grid2}>
              <div style={s.fGroup}>
                <label style={s.iLabel}>Unit Cost (£)</label>
                <input style={s.input} type="number" step="0.01" value={editForm.unitCost} onChange={ef("unitCost")} />
                <div style={{fontSize:11,color:"#8888AA",marginTop:4}}>CDU cost: £{editForm.unitCost && editForm.cduSize ? (parseFloat(editForm.unitCost||"0") * parseInt(editForm.cduSize||"1")).toFixed(2) : "—"}</div>
              </div>
              <div style={s.fGroup}>
                <label style={s.iLabel}>RRP (£)</label>
                <input style={s.input} type="number" step="0.01" value={editForm.rrp} onChange={ef("rrp")} />
              </div>
              <div style={s.fGroup}>
                <label style={s.iLabel}>CDU Size</label>
                <input style={s.input} type="number" min="1" value={editForm.cduSize} onChange={ef("cduSize")} />
              </div>
            </div>

            <div style={s.btnRow}>
              <button style={{...s.btnGhost,flex:1}} onClick={()=>setEditingProduct(null)}>Cancel</button>
              <button style={{...s.btnPink,flex:1}} disabled={updateMutation.isPending} onClick={()=>updateMutation.mutate({
                id: editingProduct.id,
                name: editForm.name,
                description: editForm.description || null,
                unitCostPence: Math.round(parseFloat(editForm.unitCost) * 100),
                rrpPence: Math.round(parseFloat(editForm.rrp) * 100),
                cduSize: parseInt(editForm.cduSize),
              })}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE PRODUCT MODAL */}
      {showCreate && (
        <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={s.modal}>
            <div style={s.modalTitle}>Add Product <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0,lineHeight:1}}>×</button></div>
            <div style={s.grid2}>
              <div style={{...s.fGroup,gridColumn:"1/-1"}}><label style={s.iLabel}>Product Name</label><input style={s.input} value={form.name} onChange={f("name")} placeholder="e.g. Labubu Series 1" /></div>
              <div style={s.fGroup}><label style={s.iLabel}>SKU</label><input style={s.input} value={form.sku} onChange={f("sku")} placeholder="e.g. PM-LBB-001" /></div>
              <div style={s.fGroup}><label style={s.iLabel}>Brand</label><input style={s.input} value={form.brandName} onChange={f("brandName")} placeholder="e.g. POP MART" /></div>
              <div style={s.fGroup}><label style={s.iLabel}>Type</label><select style={s.select} value={form.productType} onChange={f("productType")}>{["BLIND_BOX","FIGURE","PLUSH","ACCESSORY","BUNDLE"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></div>
              <div style={s.fGroup}><label style={s.iLabel}>CDU Size</label><input style={s.input} type="number" value={form.cduSize} onChange={f("cduSize")} /></div>
              <div style={s.fGroup}><label style={s.iLabel}>Unit Cost (£)</label><input style={s.input} type="number" step="0.01" value={form.unitCost} onChange={f("unitCost")} placeholder="0.00" /></div>
              <div style={s.fGroup}><label style={s.iLabel}>RRP (£)</label><input style={s.input} type="number" step="0.01" value={form.rrp} onChange={f("rrp")} placeholder="0.00" /></div>
              <div style={s.fGroup}><label style={s.iLabel}>Opening Stock</label><input style={s.input} type="number" value={form.stockUnits} onChange={f("stockUnits")} /></div>
            </div>
            <div style={s.btnRow}>
              <button style={{...s.btnGhost,flex:1}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button style={{...s.btnPink,flex:1}} disabled={createMutation.isPending} onClick={()=>createMutation.mutate({name:form.name,sku:form.sku,brandName:form.brandName,productType:form.productType,unitCostPence:Math.round(parseFloat(form.unitCost)*100),rrpPence:Math.round(parseFloat(form.rrp)*100),cduSize:parseInt(form.cduSize),stockUnits:parseInt(form.stockUnits),badges:[]})}>{createMutation.isPending?"Creating…":"Create Product"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
