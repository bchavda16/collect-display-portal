"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDate } from "@/lib/utils"


function PresenceDot({ lastSeenAt }: { lastSeenAt?: string }) {
  if (!lastSeenAt) return <span style={{fontSize:11,color:"#CCCCCC"}}>Never</span>
  
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  const mins = Math.floor(diff / 60000)
  
  if (mins < 5) return (
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block",boxShadow:"0 0 0 2px rgba(34,197,94,.3)"}} />
      <span style={{fontSize:11,color:"#22c55e",fontWeight:600}}>Online now</span>
    </div>
  )
  if (mins < 30) return (
    <div style={{display:"flex",alignItems:"center",gap:5}}>
      <span style={{width:8,height:8,borderRadius:"50%",background:"#f59e0b",display:"inline-block"}} />
      <span style={{fontSize:11,color:"#f59e0b",fontWeight:600}}>{mins}m ago</span>
    </div>
  )
  if (mins < 60) return <span style={{fontSize:11,color:"#AAAAAA"}}>{mins}m ago</span>
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return <span style={{fontSize:11,color:"#CCCCCC"}}>{hrs}h ago</span>
  const days = Math.floor(hrs / 24)
  return <span style={{fontSize:11,color:"#DDDDDD"}}>{days}d ago</span>
}

export default function AdminRetailersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editingRetailer, setEditingRetailer] = useState<any>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [form, setForm] = useState({ businessName:"", contactName:"", email:"", phone:"", paymentTerms:"PROFORMA", addressLine1:"", addressLine2:"", city:"", county:"", postcode:"" })
  const [editForm, setEditForm] = useState({ businessName:"", contactName:"", phone:"", vatNumber:"", paymentTerms:"PROFORMA", creditLimitPence:"", isActive:true, addressLine1:"", addressLine2:"", city:"", county:"", postcode:"" })
  const [saveMsg, setSaveMsg] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["admin-retailers", search, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(search&&{search}) })
      const r = await fetch("/api/retailers?"+p); return r.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (body: any) => { const r = await fetch("/api/retailers", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); return r.json() },
    onSuccess: (d) => { if (d.success) { qc.invalidateQueries({queryKey:["admin-retailers"]}); setShowCreate(false); setForm({businessName:"",contactName:"",email:"",phone:"",paymentTerms:"PROFORMA",addressLine1:"",addressLine2:"",city:"",county:"",postcode:""}) } },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => { const r = await fetch("/api/retailers/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) }); return r.json() },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-retailers"]}); setSaveMsg("Saved!"); setTimeout(()=>setSaveMsg(""),2000) },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const r = await fetch("/api/retailers/"+id, { method:"DELETE" }); return r.json() },
    onSuccess: () => { qc.invalidateQueries({queryKey:["admin-retailers"]}); setDeleteConfirm(null); setEditingRetailer(null) },
  })

  const retailers = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const ff = (k: string) => (e: any) => setForm(prev => ({...prev, [k]: e.target.value}))
  const ef = (k: string) => (e: any) => setEditForm(prev => ({...prev, [k]: e.target.value === "true" ? true : e.target.value === "false" ? false : e.target.value}))

  const openEdit = (r: any) => {
    const addr = r.addresses?.[0]
    setEditForm({
      businessName: r.businessName, contactName: r.contactName,
      phone: r.phone ?? "", vatNumber: r.vatNumber ?? "",
      paymentTerms: r.paymentTerms ?? "PROFORMA",
      creditLimitPence: r.creditLimitPence ? String(r.creditLimitPence/100) : "",
      isActive: r.user?.isActive ?? true,
      addressLine1: addr?.line1 ?? "", addressLine2: addr?.line2 ?? "",
      city: addr?.city ?? "", county: addr?.county ?? "", postcode: addr?.postcode ?? "",
    })
    setEditingRetailer(r)
    setSaveMsg("")
  }

  const handleUpdate = () => {
    updateMutation.mutate({
      id: editingRetailer.id,
      businessName: editForm.businessName,
      contactName: editForm.contactName,
      phone: editForm.phone || null,
      vatNumber: editForm.vatNumber || null,
      paymentTerms: editForm.paymentTerms,
      creditLimitPence: editForm.creditLimitPence ? Math.round(parseFloat(editForm.creditLimitPence)*100) : null,
      isActive: editForm.isActive,
      ...(editForm.addressLine1 && { address: { line1: editForm.addressLine1, line2: editForm.addressLine2||null, city: editForm.city, county: editForm.county||null, postcode: editForm.postcode } }),
    })
  }

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif"},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 20px"},
    hdr: {display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20},
    btnPink: {display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 18px",background:"#88dde1",color:"#0a1420",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer"},
    btnGhost: {display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnSm: {padding:"5px 10px",fontSize:12},
    btnRed: {display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:"white",color:"#E11D48",border:"1px solid rgba(225,29,72,.2)",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer"},
    searchBox: {display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:10,marginBottom:16},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden"},
    th: {background:"#F4F5F7",fontSize:10,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em",color:"#8888AA",padding:"10px 16px",textAlign:"left" as const,borderBottom:"1px solid rgba(0,0,0,.08)"},
    td: {padding:"12px 16px",fontSize:13,borderBottom:"1px solid rgba(0,0,0,.06)",verticalAlign:"middle" as const},
    overlay: {position:"fixed" as const,inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:580,width:"100%",maxHeight:"90vh",overflowY:"auto" as const,boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    sLabel: {fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".08em",color:"#8888AA",margin:"16px 0 12px",paddingBottom:8,borderBottom:"1px solid rgba(0,0,0,.07)"},
    grid2: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},
    fg: {marginBottom:12},
    iLabel: {display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".05em"},
    input: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white"},
    select: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",background:"white"},
  }

  return (
    <div style={S.wrap}>
      <div style={S.hdr}>
        <div><h1 style={S.title}>Retailers</h1><p style={S.sub}>{data?.total??0} accounts</p></div>
        <button style={S.btnPink} onClick={()=>setShowCreate(true)}>+ Add Retailer</button>
      </div>

      <div style={S.searchBox}>
        <span style={{color:"#8888AA",fontSize:16}}>🔍</span>
        <input style={{border:"none",outline:"none",fontSize:13,color:"#1A1A2E",background:"transparent",flex:1}} placeholder="Search by name or email…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#8888AA",fontSize:16}}>×</button>}
      </div>

      <div style={S.card}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Business","Contact","Terms","Credit Limit","Orders","Status","Last Seen","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={8} style={{...S.td,textAlign:"center",color:"#8888AA",padding:32}}>Loading…</td></tr>
            : retailers.length===0 ? <tr><td colSpan={8} style={{...S.td,textAlign:"center",padding:48}}>
                <div style={{fontSize:32,marginBottom:8}}>🏪</div>
                <div style={{fontWeight:600,color:"#1A1A2E",marginBottom:4}}>No retailers yet</div>
                <div style={{fontSize:12,color:"#8888AA"}}>Add your first retailer to get started</div>
              </td></tr>
            : retailers.map((r: any) => (
              <tr key={r.id}>
                <td style={S.td}>
                  <div style={{fontWeight:600,color:"#1A1A2E",marginBottom:3}}>{r.businessName}</div>
                  <div style={{fontSize:12,color:"#8888AA"}}>{r.user?.email}</div>
                </td>
                <td style={S.td}>
                  <div style={{color:"#4A4A6A",marginBottom:2}}>{r.contactName}</div>
                  {r.phone&&<div style={{fontSize:12,color:"#8888AA"}}>{r.phone}</div>}
                </td>
                <td style={{...S.td,color:"#4A4A6A"}}>{r.paymentTerms?.replace(/_/g," ")}</td>
                <td style={{...S.td,fontWeight:600,color:"#1A1A2E"}}>{r.creditLimitPence?"£"+(r.creditLimitPence/100).toLocaleString():"—"}</td>
                <td style={{...S.td,color:"#4A4A6A"}}>{r._count?.orders??0}</td>
                <td style={S.td}>
                  <span style={{display:"inline-flex",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:600,background:r.user?.isActive?"#EAFAF3":"#FFF1F4",color:r.user?.isActive?"#0EA572":"#E11D48"}}>
                    {r.user?.isActive?"Active":"Suspended"}
                  </span>
                </td>
                <td style={S.td}><PresenceDot lastSeenAt={r.user?.lastSeenAt} /></td>
                <td style={S.td}>
                  <button style={{...S.btnGhost,...S.btnSm}} onClick={()=>openEdit(r)}>✏️ Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid rgba(0,0,0,.08)"}}>
            <span style={{fontSize:13,color:"#8888AA"}}>Page {page} of {totalPages}</span>
            <div style={{display:"flex",gap:8}}>
              <button style={{...S.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <button style={{...S.btnGhost,padding:"5px 10px",fontSize:12}} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingRetailer && !deleteConfirm && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setEditingRetailer(null)}>
          <div style={S.modal}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
              <div>
                <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E"}}>Edit Retailer</div>
                <div style={{fontSize:12,color:"#8888AA",marginTop:2}}>{editingRetailer.user?.email}</div>
              </div>
              <button onClick={()=>setEditingRetailer(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>

            <p style={S.sLabel}>Business Details</p>
            <div style={S.grid2}>
              <div style={{...S.fg,gridColumn:"1/-1"}}><label style={S.iLabel}>Business Name</label><input style={S.input} value={editForm.businessName} onChange={ef("businessName")} /></div>
              <div style={S.fg}><label style={S.iLabel}>Contact Name</label><input style={S.input} value={editForm.contactName} onChange={ef("contactName")} /></div>
              <div style={S.fg}><label style={S.iLabel}>Phone</label><input style={S.input} value={editForm.phone} onChange={ef("phone")} placeholder="+44 7700 900000" /></div>
              <div style={S.fg}><label style={S.iLabel}>VAT Number</label><input style={S.input} value={editForm.vatNumber} onChange={ef("vatNumber")} placeholder="GB123456789" /></div>
              <div style={S.fg}><label style={S.iLabel}>Payment Terms</label>
                <select style={S.select} value={editForm.paymentTerms} onChange={ef("paymentTerms")}>
                  {["PROFORMA","NET_14","NET_30","NET_60"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                </select>
              </div>
              <div style={S.fg}><label style={S.iLabel}>Credit Limit (£)</label><input style={S.input} type="number" step="100" value={editForm.creditLimitPence} onChange={ef("creditLimitPence")} placeholder="e.g. 5000" /></div>
              <div style={S.fg}><label style={S.iLabel}>Account Status</label>
                <select style={S.select} value={String(editForm.isActive)} onChange={ef("isActive")}>
                  <option value="true">Active</option>
                  <option value="false">Suspended</option>
                </select>
              </div>
            </div>

            <p style={S.sLabel}>Delivery Address</p>
            <div style={S.grid2}>
              <div style={{...S.fg,gridColumn:"1/-1"}}><label style={S.iLabel}>Address Line 1</label><input style={S.input} value={editForm.addressLine1} onChange={ef("addressLine1")} placeholder="Street address" /></div>
              <div style={{...S.fg,gridColumn:"1/-1"}}><label style={S.iLabel}>Address Line 2</label><input style={S.input} value={editForm.addressLine2} onChange={ef("addressLine2")} placeholder="Optional" /></div>
              <div style={S.fg}><label style={S.iLabel}>City</label><input style={S.input} value={editForm.city} onChange={ef("city")} /></div>
              <div style={S.fg}><label style={S.iLabel}>County</label><input style={S.input} value={editForm.county} onChange={ef("county")} /></div>
              <div style={S.fg}><label style={S.iLabel}>Postcode</label><input style={S.input} value={editForm.postcode} onChange={ef("postcode")} /></div>
            </div>

            {saveMsg && <div style={{background:"#EAFAF3",border:"1px solid rgba(14,165,114,.2)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#0EA572",marginBottom:12}}>✓ {saveMsg}</div>}

            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button style={{...S.btnRed,...S.btnSm}} onClick={()=>setDeleteConfirm(editingRetailer)}>🗑 Delete Account</button>
              <div style={{flex:1}} />
              <button style={{...S.btnGhost}} onClick={()=>setEditingRetailer(null)}>Cancel</button>
              <button style={{...S.btnPink}} onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending?"Saving…":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setDeleteConfirm(null)}>
          <div style={{...S.modal,maxWidth:420}}>
            <div style={{textAlign:"center",padding:"8px 0 16px"}}>
              <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
              <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",marginBottom:8}}>Delete {deleteConfirm.businessName}?</div>
              <div style={{fontSize:13,color:"#8888AA",marginBottom:24,lineHeight:1.6}}>This will permanently delete the retailer account, all their addresses and basket items. Their order history will be preserved. This cannot be undone.</div>
              <div style={{display:"flex",gap:10}}>
                <button style={{...S.btnGhost,flex:1}} onClick={()=>setDeleteConfirm(null)}>Cancel</button>
                <button style={{flex:1,padding:"9px 18px",background:"#E11D48",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}} onClick={()=>deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending?"Deleting…":"Yes, Delete Account"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={S.modal}>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              Add Retailer <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0}}>×</button>
            </div>
            <p style={S.sLabel}>Business Details</p>
            <div style={S.grid2}>
              <div style={{...S.fg,gridColumn:"1/-1"}}><label style={S.iLabel}>Business Name</label><input style={S.input} value={form.businessName} onChange={ff("businessName")} placeholder="e.g. Galaxy Collectibles Ltd" /></div>
              <div style={S.fg}><label style={S.iLabel}>Contact Name</label><input style={S.input} value={form.contactName} onChange={ff("contactName")} placeholder="Full name" /></div>
              <div style={S.fg}><label style={S.iLabel}>Email Address</label><input style={S.input} type="email" value={form.email} onChange={ff("email")} placeholder="owner@business.com" /></div>
              <div style={S.fg}><label style={S.iLabel}>Phone</label><input style={S.input} value={form.phone} onChange={ff("phone")} placeholder="+44 7700 900000" /></div>
              <div style={S.fg}><label style={S.iLabel}>Payment Terms</label>
                <select style={S.select} value={form.paymentTerms} onChange={ff("paymentTerms")}>
                  {["PROFORMA","NET_14","NET_30","NET_60"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                </select>
              </div>
            </div>
            <p style={S.sLabel}>Delivery Address</p>
            <div style={S.grid2}>
              <div style={{...S.fg,gridColumn:"1/-1"}}><label style={S.iLabel}>Address Line 1</label><input style={S.input} value={form.addressLine1} onChange={ff("addressLine1")} placeholder="Street address" /></div>
              <div style={{...S.fg,gridColumn:"1/-1"}}><label style={S.iLabel}>Address Line 2 (optional)</label><input style={S.input} value={form.addressLine2} onChange={ff("addressLine2")} /></div>
              <div style={S.fg}><label style={S.iLabel}>City</label><input style={S.input} value={form.city} onChange={ff("city")} /></div>
              <div style={S.fg}><label style={S.iLabel}>County (optional)</label><input style={S.input} value={form.county} onChange={ff("county")} /></div>
              <div style={S.fg}><label style={S.iLabel}>Postcode</label><input style={S.input} value={form.postcode} onChange={ff("postcode")} placeholder="e.g. M1 2AB" /></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button style={{...S.btnGhost,flex:1}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button style={{...S.btnPink,flex:2}} onClick={()=>createMutation.mutate({businessName:form.businessName,contactName:form.contactName,email:form.email,phone:form.phone||undefined,paymentTerms:form.paymentTerms,address:{line1:form.addressLine1,line2:form.addressLine2||undefined,city:form.city,county:form.county||undefined,postcode:form.postcode,country:"GB"}})} disabled={createMutation.isPending}>
                {createMutation.isPending?"Creating…":"✉ Create & Send Welcome Email"}
              </button>
            </div>
            {createMutation.data&&!createMutation.data.success&&<p style={{color:"#E11D48",fontSize:13,marginTop:10,textAlign:"center"}}>{createMutation.data.error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
