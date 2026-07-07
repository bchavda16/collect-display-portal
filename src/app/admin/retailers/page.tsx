"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDate } from "@/lib/utils"

export default function AdminRetailersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    businessName:"", contactName:"", email:"", phone:"",
    paymentTerms:"PROFORMA",
    addressLine1:"", addressLine2:"", city:"", county:"", postcode:""
  })

  const { data, isLoading } = useQuery({
    queryKey: ["admin-retailers", search, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "20", ...(search&&{search}) })
      const r = await fetch("/api/retailers?"+p); return r.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      const r = await fetch("/api/retailers", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) })
      return r.json()
    },
    onSuccess: (d) => {
      if (d.success) {
        qc.invalidateQueries({queryKey:["admin-retailers"]})
        setShowCreate(false)
        setForm({businessName:"",contactName:"",email:"",phone:"",paymentTerms:"PROFORMA",addressLine1:"",addressLine2:"",city:"",county:"",postcode:""})
      }
    },
  })

  const retailers = data?.data ?? []
  const totalPages = data?.totalPages ?? 1
  const f = (k: string) => (e: any) => setForm(prev => ({...prev, [k]: e.target.value}))

  const s: Record<string,any> = {
    page: {padding:24,fontFamily:"system-ui,sans-serif"},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 20px"},
    rowBetween: {display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:16},
    btnPink: {display:"inline-flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#F0A3BC",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {display:"inline-flex",alignItems:"center",gap:6,padding:"7px 14px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnGhostSm: {display:"inline-flex",alignItems:"center",gap:6,padding:"5px 10px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer"},
    searchBox: {display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:10,marginBottom:16},
    searchInput: {border:"none",outline:"none",fontSize:13,color:"#1A1A2E",background:"transparent",flex:1},
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,.05)",overflow:"hidden"},
    th: {background:"#F4F5F7",fontSize:10,fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".06em",color:"#8888AA",padding:"10px 16px",textAlign:"left" as const,borderBottom:"1px solid rgba(0,0,0,.08)"},
    td: {padding:"12px 16px",fontSize:13,borderBottom:"1px solid rgba(0,0,0,.06)",verticalAlign:"middle" as const},
    overlay: {position:"fixed" as const,inset:0,background:"rgba(0,0,0,.4)",backdropFilter:"blur(2px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
    modal: {background:"white",borderRadius:16,padding:28,maxWidth:560,width:"100%",maxHeight:"90vh",overflowY:"auto" as const,boxShadow:"0 20px 60px rgba(0,0,0,.15)"},
    modalTitle: {fontSize:18,fontWeight:700,color:"#1A1A2E",margin:"0 0 24px",display:"flex",alignItems:"center",justifyContent:"space-between"},
    sectionLabel: {fontSize:10,fontWeight:700,textTransform:"uppercase" as const,letterSpacing:".08em",color:"#8888AA",margin:"0 0 12px",paddingBottom:8,borderBottom:"1px solid rgba(0,0,0,.07)"},
    grid2: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20},
    formGroup: {marginBottom:14},
    inputLabel: {display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".05em"},
    input: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white"},
    select: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",background:"white",cursor:"pointer"},
    btnRow: {display:"flex",gap:10,marginTop:24},
    actionBtn: {background:"none",border:"1px solid rgba(0,0,0,.1)",borderRadius:6,padding:"6px 8px",cursor:"pointer",color:"#8888AA"},
  }

  return (
    <div style={s.page}>
      <div style={s.rowBetween}>
        <div>
          <h1 style={s.title}>Retailers</h1>
          <p style={s.sub}>{data?.total ?? 0} accounts</p>
        </div>
        <button style={s.btnPink} onClick={()=>setShowCreate(true)}>+ Add Retailer</button>
      </div>

      <div style={s.searchBox}>
        <span style={{color:"#8888AA",fontSize:16}}>🔍</span>
        <input style={s.searchInput} placeholder="Search by business name or email…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
        {search && <button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#8888AA",fontSize:16}}>×</button>}
      </div>

      <div style={s.card}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Business","Contact","Terms","Credit Limit","Orders","Joined","Action"].map(h=>(
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{...s.td,textAlign:"center",color:"#8888AA",padding:32}}>Loading…</td></tr>
            ) : retailers.length === 0 ? (
              <tr><td colSpan={7} style={{...s.td,textAlign:"center",padding:48}}>
                <div style={{fontSize:32,marginBottom:8}}>🏪</div>
                <div style={{fontWeight:600,color:"#1A1A2E",marginBottom:4}}>No retailers yet</div>
                <div style={{fontSize:12,color:"#8888AA"}}>Add your first retailer to get started</div>
              </td></tr>
            ) : retailers.map((r: any) => (
              <tr key={r.id} style={{transition:"background .1s"}}>
                <td style={s.td}>
                  <div style={{fontWeight:600,color:"#1A1A2E",marginBottom:3}}>{r.businessName}</div>
                  <div style={{fontSize:12,color:"#8888AA"}}>{r.user?.email}</div>
                </td>
                <td style={s.td}>
                  <div style={{color:"#4A4A6A",marginBottom:2}}>{r.contactName}</div>
                  {r.phone && <div style={{fontSize:12,color:"#8888AA"}}>{r.phone}</div>}
                </td>
                <td style={s.td}><span style={{color:"#4A4A6A"}}>{r.paymentTerms?.replace(/_/g," ")}</span></td>
                <td style={s.td}><span style={{fontWeight:600,color:"#1A1A2E"}}>{r.creditLimitPence ? "£"+(r.creditLimitPence/100).toLocaleString() : "—"}</span></td>
                <td style={s.td}><span style={{color:"#4A4A6A"}}>{r._count?.orders ?? 0}</span></td>
                <td style={s.td}><span style={{color:"#8888AA"}}>{formatDate(r.createdAt)}</span></td>
                <td style={s.td}><button style={s.actionBtn} title="View">👁</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderTop:"1px solid rgba(0,0,0,.08)"}}>
            <span style={{fontSize:13,color:"#8888AA"}}>Page {page} of {totalPages}</span>
            <div style={{display:"flex",gap:8}}>
              <button style={s.btnGhostSm} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
              <button style={s.btnGhostSm} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div style={s.overlay} onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div style={s.modal}>
            <div style={s.modalTitle}>
              Add Retailer
              <button onClick={()=>setShowCreate(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#8888AA",padding:0,lineHeight:1}}>×</button>
            </div>

            <p style={s.sectionLabel}>Business Details</p>
            <div style={s.grid2}>
              <div style={{...s.formGroup,gridColumn:"1/-1"}}><label style={s.inputLabel}>Business Name</label><input style={s.input} value={form.businessName} onChange={f("businessName")} placeholder="e.g. Galaxy Collectibles Ltd" /></div>
              <div style={s.formGroup}><label style={s.inputLabel}>Contact Name</label><input style={s.input} value={form.contactName} onChange={f("contactName")} placeholder="Full name" /></div>
              <div style={s.formGroup}><label style={s.inputLabel}>Email Address</label><input style={s.input} type="email" value={form.email} onChange={f("email")} placeholder="owner@business.com" /></div>
              <div style={s.formGroup}><label style={s.inputLabel}>Phone Number</label><input style={s.input} value={form.phone} onChange={f("phone")} placeholder="+44 7700 900000" /></div>
              <div style={s.formGroup}><label style={s.inputLabel}>Payment Terms</label>
                <select style={s.select} value={form.paymentTerms} onChange={f("paymentTerms")}>
                  {["PROFORMA","NET_14","NET_30","NET_60"].map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                </select>
              </div>
            </div>

            <p style={{...s.sectionLabel,marginTop:8}}>Delivery Address</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{...s.formGroup,gridColumn:"1/-1"}}><label style={s.inputLabel}>Address Line 1</label><input style={s.input} value={form.addressLine1} onChange={f("addressLine1")} placeholder="Street address" /></div>
              <div style={{...s.formGroup,gridColumn:"1/-1"}}><label style={s.inputLabel}>Address Line 2 (optional)</label><input style={s.input} value={form.addressLine2} onChange={f("addressLine2")} placeholder="Apartment, unit, building…" /></div>
              <div style={s.formGroup}><label style={s.inputLabel}>City</label><input style={s.input} value={form.city} onChange={f("city")} placeholder="City" /></div>
              <div style={s.formGroup}><label style={s.inputLabel}>County (optional)</label><input style={s.input} value={form.county} onChange={f("county")} placeholder="County" /></div>
              <div style={s.formGroup}><label style={s.inputLabel}>Postcode</label><input style={s.input} value={form.postcode} onChange={f("postcode")} placeholder="e.g. M1 2AB" /></div>
            </div>

            <div style={s.btnRow}>
              <button style={{...s.btnGhost,flex:1}} onClick={()=>setShowCreate(false)}>Cancel</button>
              <button style={{...s.btnPink,flex:2,justifyContent:"center"}} onClick={()=>createMutation.mutate({businessName:form.businessName,contactName:form.contactName,email:form.email,phone:form.phone||undefined,paymentTerms:form.paymentTerms,address:{line1:form.addressLine1,line2:form.addressLine2||undefined,city:form.city,county:form.county||undefined,postcode:form.postcode,country:"GB"}})} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "✉ Create & Send Welcome Email"}
              </button>
            </div>
            {createMutation.data && !createMutation.data.success && (
              <p style={{color:"#E11D48",fontSize:13,marginTop:10,textAlign:"center"}}>{createMutation.data.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
