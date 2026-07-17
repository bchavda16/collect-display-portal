"use client"
import { useState, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as XLSX from "xlsx"

const formatCurrency = (pence: number) => new Intl.NumberFormat("en-GB", { style:"currency", currency:"GBP" }).format(pence/100)

export default function AdminProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [editStock, setEditStock] = useState<{id:string;val:string}|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [form, setForm] = useState({name:"",sku:"",brandName:"",productType:"BLIND_BOX",unitCost:"",cduSize:"6",rrp:"",stockUnits:"0"})
  const [editForm, setEditForm] = useState({name:"",unitCost:"",rrp:"",cduSize:"",description:""})
  const [uploadingImg, setUploadingImg] = useState(false)
  const [imgPreview, setImgPreview] = useState<string|null>(null)
  const imgRef = useRef<HTMLInputElement>(null)

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
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-products"]}); setEditStock(null); setEditingProduct(null); setImgPreview(null) },
  })

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/products", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) })
      return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-products"]}); setShowCreate(false); setForm({name:"",sku:"",brandName:"",productType:"BLIND_BOX",unitCost:"",cduSize:"6",rrp:"",stockUnits:"0"}) },
  })

  const handleImageUpload = async (file: File, productId: string) => {
    setUploadingImg(true)
    const fd = new FormData()
    fd.append("image", file)
    fd.append("productId", productId)
    const r = await fetch("/api/products/upload", { method:"POST", body: fd })
    const d = await r.json()
    setUploadingImg(false)
    if (d.url) { setImgPreview(d.url); qc.invalidateQueries({queryKey:["admin-products"]}) }
  }

  const handleExport = async () => {
    const r = await fetch("/api/products?limit=9999")
    const d = await r.json()
    const rows = (d.data ?? []).map((p: any) => ({
      "SKU": p.sku, "Product Name": p.name, "Brand": p.brand?.name ?? "",
      "Type": p.productType?.replace(/_/g," ") ?? "",
      "Unit Cost": (p.unitCostPence/100).toFixed(2),
      "CDU Size": p.cduSize,
      "CDU Cost": ((p.unitCostPence*p.cduSize)/100).toFixed(2),
      "RRP": (p.rrpPence/100).toFixed(2),
      "Stock Units": p.stockUnits,
      "Stock Value": ((p.unitCostPence*p.stockUnits)/100).toFixed(2),
      "Status": p.status?.replace(/_/g," ") ?? "",
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws["!cols"] = [{wch:14},{wch:40},{wch:18},{wch:12},{wch:12},{wch:10},{wch:12},{wch:10},{wch:12},{wch:14},{wch:12}]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Inventory")
    XLSX.writeFile(wb, "inventory-report-"+new Date().toISOString().slice(0,10)+".xlsx")
  }

  const products = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const ff = (k: string) => (e: any) => setForm(prev => ({...prev, [k]: e.target.value}))
  const ef = (k: string) => (e: any) => setEditForm(prev => ({...prev, [k]: e.target.value}))
  const openEdit = (p: any) => { setEditingProduct(p); setImgPreview(p.images?.[0]?.url ?? null); setEditForm({name:p.name,unitCost:(p.unitCostPence/100).toFixed(2),rrp:(p.rrpPence/100).toFixed(2),cduSize:String(p.cduSize),description:p.description??""}) }

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif"},
    hdr: {display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:0},
    sub: {fontSize:13,color:"#8888AA",margin:"4px 0 0"},
    btnPink: {display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 18px",background:"#88dde1",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnSm: {display:"inline-flex",alignItems:"center",gap:4,padding:"5px 10px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer"},
    srch: {display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:10,marginBottom:16},
    srchIn: {border:"none",outline:"none",fontSize:13,color:"#1A1A2E",background:"transparent",flex:1},
    tbl: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden"},
    th: {background:"#F4F5F7",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",color:"#8888AA",padding:"10px 14px",textAlign:"left",borderBottom:"1px solid rgba(0,0,0,.08)"},
    td: {padding:"10px 14px",fontSize:13,borderBottom:"1px solid rgba(0,0,0,.06)",verticalAlign:"middle"},
    overlay: {position:"fixed",inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:540,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    mTitle: {fontSize:17,fontWeight:700,color:"#1A1A2E",margin:"0 0 20px",display:"flex",alignItems:"center",justifyContent:"space-between"},
    sLbl: {fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"#8888AA",margin:"0 0 12px",paddingBottom:8,borderBottom:"1px solid rgba(0,0,0,.07)"},
    g2: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:4},
    fg: {marginBottom:14},
    lbl: {display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase",letterSpacing:".05em"},
    inp: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box",background:"white"},
    sel: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",background:"white"},
    inpSm: {width:72,padding:"4px 8px",border:"1.5px solid #88dde1",borderRadius:6,fontSize:13,color:"#1A1A2E",outline:"none",textAlign:"center"},
    bRow: {display:"flex",gap:10,marginTop:20},
  }

  return (
    <div style={S.wrap}>
      <div style={S.hdr}>
        <div>
          <h1 style={S.title}>Inventory</h1>
          <p style={S.sub}>{data?.total ?? 0} products</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={S.btnGhost} onClick={handleExport}>📥 Export Report</button>
          <button style={S.btnPink} onClick={()=>setShowCreate(true)}>+ Add Product</button>
        </div>
      </div>

      <div style={S.srch}>
        <span style={{color:"#8888AA",fontSize:16}}>🔍</span>
        <input style={S.srchIn} placeholder="Search by name, SKU or brand…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#8888AA",fontSize:16}}>×</button>}
      </div>

      <div style={S.tbl}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>{["Image","Product","SKU","Type","Unit Cost","CDU","RRP","Stock","Status",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading
              ? <tr><td colSpan={10} style={{...S.td,textAlign:"center",color:"#8888AA",padding:40}}>Loading…</td></tr>
              : products.length===0
              ? <tr><td colSpan={10} style={{...S.td,textAlign:"center",color:"#8888AA",padding:48}}>No products found</td></tr>
              : products.map((p:any)=>(
                <tr key={p.id} style={{transition:"background .1s"}}>
                  <td style={S.td}>
                    <div style={{width:85,height:50,borderRadius:6,overflow:"hidden",background:"#F4F5F7",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <span style={{fontSize:18}}>🎁</span>}
                    </div>
                  </td>
                  <td style={S.td}>
                    <div style={{fontWeight:600,color:"#1A1A2E",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                    <div style={{fontSize:11,color:"#8888AA",marginTop:1}}>{p.brand?.name}</div>
                  </td>
                  <td style={{...S.td,fontFamily:"monospace",fontSize:11,color:"#8888AA"}}>{p.sku}</td>
                  <td style={{...S.td,color:"#4A4A6A",fontSize:12}}>{p.productType?.replace(/_/g," ")}</td>
                  <td style={{...S.td,fontWeight:600}}>{formatCurrency(p.unitCostPence)}</td>
                  <td style={{...S.td,color:"#4A4A6A"}}>×{p.cduSize}</td>
                  <td style={{...S.td,color:"#8888AA"}}>{formatCurrency(p.rrpPence)}</td>
                  <td style={S.td}>
                    {editStock?.id===p.id ? (
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input style={S.inpSm} value={editStock.val} autoFocus onChange={e=>setEditStock({id:p.id,val:e.target.value})} onKeyDown={e=>{if(e.key==="Enter")updateMutation.mutate({id:p.id,stockUnits:parseInt(editStock.val)});if(e.key==="Escape")setEditStock(null)}} />
                        <button onClick={()=>updateMutation.mutate({id:p.id,stockUnits:parseInt(editStock.val)})} style={{background:"#0EA572",border:"none",color:"white",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:12}}>✓</button>
                        <button onClick={()=>setEditStock(null)} style={{background:"none",border:"1px solid rgba(0,0,0,.12)",borderRadius:5,padding:"4px 7px",cursor:"pointer",fontSize:12,color:"#8888AA"}}>×</button>
                      </div>
                    ) : (
                      <button onClick={()=>setEditStock({id:p.id,val:String(p.stockUnits)})} style={{background:"none",border:"none",cursor:"pointer",fontWeight:600,color:p.stockUnits===0?"#E11D48":p.stockUnits<=10?"#D97706":"#1A1A2E",fontSize:13,padding:0,display:"flex",alignItems:"center",gap:4}}>
                        {p.stockUnits.toLocaleString()} <span style={{fontSize:11}}>✏️</span>
                      </button>
                    )}
                  </td>
                  <td style={S.td}>
                    <select style={{...S.sel,width:"auto",padding:"4px 8px",fontSize:12}} value={p.status} onChange={e=>updateMutation.mutate({id:p.id,status:e.target.value})}>
                      {["ACTIVE","LOW_STOCK","OUT_OF_STOCK","COMING_SOON","DISCONTINUED"].map(st=><option key={st} value={st}>{st.replace(/_/g," ")}</option>)}
                    </select>
                  </td>
                  <td style={S.td}><button style={S.btnSm} onClick={()=>openEdit(p)}>✏️ Edit</button></td>
                </tr>
              ))
            }
          </tbody>
        </table>
        {totalPages>1 && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid rgba(0,0,0,.08)"}}>
            <span style={{fontSize:13,color:"#8888AA"}}>Page {page} of {totalPages}</span>
            <div style={{display:"flex",gap:8}}>
              <button style={{...S.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <button style={{...S.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {editingProduct && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&(setEditingProduct(null),setImgPreview(null))}>
          <div style={S.modal}>
            <div style={S.mTitle}>
              <div><div>Edit Product</div><div style={{fontSize:12,fontWeight:400,color:"#8888AA",marginTop:2,fontFamily:"monospace"}}>{editingProduct.sku}</div></div>
              <button onClick={()=>{setEditingProduct(null);setImgPreview(null)}} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>
            <p style={S.sLbl}>Product Image</p>
            <div style={{display:"flex",gap:14,alignItems:"flex-start",marginBottom:20}}>
              <div style={{width:170,height:99,border:"2px dashed rgba(0,0,0,.15)",borderRadius:10,background:imgPreview?"transparent":"#FAFBFC",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,position:"relative",cursor:"pointer"}} onClick={()=>imgRef.current?.click()}>
                {imgPreview ? <img src={imgPreview} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <div style={{textAlign:"center"}}><div style={{fontSize:22}}>🖼️</div><div style={{fontSize:11,color:"#8888AA"}}>Click to upload</div></div>}
                {uploadingImg && <div style={{position:"absolute",inset:0,background:"rgba(255,255,255,.8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#88dde1",fontWeight:600}}>Uploading…</div>}
              </div>
              <div style={{flex:1}}>
                <button style={{...S.btnGhost,marginBottom:8,width:"100%",justifyContent:"center"}} onClick={()=>imgRef.current?.click()} disabled={uploadingImg}>{imgPreview?"Change Image":"Upload Image"}</button>
                {imgPreview && <button style={{...S.btnSm,width:"100%",justifyContent:"center",color:"#E11D48",borderColor:"rgba(225,29,72,.2)"}} onClick={()=>setImgPreview(null)}>Remove</button>}
                <p style={{fontSize:11,color:"#8888AA",marginTop:8}}>Max 5MB · JPG, PNG or WebP</p>
              </div>
              <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setImgPreview(URL.createObjectURL(file));await handleImageUpload(file,editingProduct.id)}} />
            </div>
            <p style={S.sLbl}>Product Details</p>
            <div style={{...S.fg,marginBottom:14}}><label style={S.lbl}>Product Name</label><input style={S.inp} value={editForm.name} onChange={ef("name")} /></div>
            <div style={{...S.fg,marginBottom:16}}><label style={S.lbl}>Description (optional)</label><textarea style={{...S.inp,resize:"none",height:60}} value={editForm.description} onChange={ef("description")} placeholder="Product description…" /></div>
            <p style={{...S.sLbl,marginTop:8}}>Pricing</p>
            <div style={S.g2}>
              <div style={S.fg}>
                <label style={S.lbl}>Unit Cost (£)</label>
                <input style={S.inp} type="number" step="0.01" value={editForm.unitCost} onChange={ef("unitCost")} />
                <div style={{fontSize:11,color:"#8888AA",marginTop:4}}>CDU cost: £{(parseFloat(editForm.unitCost||"0")*parseInt(editForm.cduSize||"1")).toFixed(2)}</div>
              </div>
              <div style={S.fg}><label style={S.lbl}>RRP (£)</label><input style={S.inp} type="number" step="0.01" value={editForm.rrp} onChange={ef("rrp")} /></div>
              <div style={S.fg}><label style={S.lbl}>CDU Size</label><input style={S.inp} type="number" min="1" value={editForm.cduSize} onChange={ef("cduSize")} /></div>
            </div>
            <div style={S.bRow}>
              <button style={{...S.btnGhost,flex:1}} onClick={()=>{setEditingProduct(null);setImgPreview(null)}}>Cancel</button>
              <button style={{...S.btnPink,flex:1}} disabled={updateMutation.isPending} onClick={()=>updateMutation.mutate({id:editingProduct.id,name:editForm.name,description:editForm.description||null,unitCostPence:Math.round(parseFloat(editForm.unitCost)*100),rrpPence:Math.round(parseFloat(editForm.rrp)*100),cduSize:parseInt(editForm.cduSize)})}>
                {updateMutation.isPending?"Saving…":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={S.modal}>
            <div style={S.mTitle}>Add Product <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button></div>
            <p style={{fontSize:12,color:"#8888AA",margin:"0 0 16px",background:"#F4F5F7",borderRadius:8,padding:"8px 12px"}}>Create the product first, then use Edit to upload an image.</p>
            <div style={S.g2}>
              <div style={{...S.fg,gridColumn:"1/-1"}}><label style={S.lbl}>Product Name</label><input style={S.inp} value={form.name} onChange={ff("name")} placeholder="e.g. Labubu Series 1" /></div>
              <div style={S.fg}><label style={S.lbl}>SKU</label><input style={S.inp} value={form.sku} onChange={ff("sku")} placeholder="e.g. PM-LBB-001" /></div>
              <div style={S.fg}><label style={S.lbl}>Brand</label><input style={S.inp} value={form.brandName} onChange={ff("brandName")} placeholder="e.g. POP MART" /></div>
              <div style={S.fg}><label style={S.lbl}>Type</label><select style={S.sel} value={form.productType} onChange={ff("productType")}>{["BLIND_BOX","FIGURE","PLUSH","ACCESSORY","BUNDLE"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}</select></div>
              <div style={S.fg}><label style={S.lbl}>CDU Size</label><input style={S.inp} type="number" value={form.cduSize} onChange={ff("cduSize")} /></div>
              <div style={S.fg}><label style={S.lbl}>Unit Cost (£)</label><input style={S.inp} type="number" step="0.01" value={form.unitCost} onChange={ff("unitCost")} placeholder="0.00" /></div>
              <div style={S.fg}><label style={S.lbl}>RRP (£)</label><input style={S.inp} type="number" step="0.01" value={form.rrp} onChange={ff("rrp")} placeholder="0.00" /></div>
              <div style={S.fg}><label style={S.lbl}>Opening Stock</label><input style={S.inp} type="number" value={form.stockUnits} onChange={ff("stockUnits")} /></div>
            </div>
            <div style={S.bRow}>
              <button style={{...S.btnGhost,flex:1}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button style={{...S.btnPink,flex:1}} disabled={createMutation.isPending} onClick={()=>createMutation.mutate({name:form.name,sku:form.sku,brandName:form.brandName,productType:form.productType,unitCostPence:Math.round(parseFloat(form.unitCost)*100),rrpPence:Math.round(parseFloat(form.rrp)*100),cduSize:parseInt(form.cduSize),stockUnits:parseInt(form.stockUnits),badges:[]})}>
                {createMutation.isPending?"Creating…":"Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
