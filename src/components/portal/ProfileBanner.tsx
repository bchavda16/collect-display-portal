"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePathname } from "next/navigation"

export function ProfileBanner() {
  const pathname = usePathname()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ contactName:"", phone:"", vatNumber:"", line1:"", line2:"", city:"", county:"", postcode:"" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const { data: account, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: async () => { const r = await fetch("/api/account"); return r.json() },
  })

  // Don't show on account page itself
  if (pathname === "/account" || isLoading) return null
  if (!account || account.hasAddress) return null

  const handleSave = async () => {
    if (!form.line1 || !form.city || !form.postcode) { setError("Address line 1, city and postcode are required"); return }
    setSaving(true); setError("")
    const r = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(form.contactName && { contactName: form.contactName }),
        ...(form.phone && { phone: form.phone }),
        ...(form.vatNumber && { vatNumber: form.vatNumber }),
        address: { line1: form.line1, line2: form.line2, city: form.city, county: form.county, postcode: form.postcode },
      }),
    })
    const d = await r.json()
    setSaving(false)
    if (d.success) { qc.invalidateQueries({ queryKey: ["account"] }); setShowForm(false) }
    else { setError(d.error ?? "Failed to save") }
  }

  return (
    <>
    <div style={{ background:"#FEF3C7", borderBottom:"1px solid rgba(217,119,6,.2)", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, fontFamily:"system-ui,sans-serif" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:18 }}>⚠️</span>
        <div>
          <span style={{ fontSize:13, fontWeight:600, color:"#92400E" }}>Complete your profile before placing an order</span>
          <span style={{ fontSize:12, color:"#B45309", marginLeft:8 }}>We need your delivery address to process orders.</span>
        </div>
      </div>
      <button onClick={() => { setShowForm(true); if(account) setForm(f => ({...f, contactName: account.contactName ?? "", phone: account.phone ?? "", vatNumber: account.vatNumber ?? ""})) }}
        style={{ padding:"7px 16px", background:"#D97706", color:"white", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0 }}>
        Complete Profile
      </button>
    </div>

    {showForm && (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", backdropFilter:"blur(2px)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
        onClick={e => e.target === e.currentTarget && setShowForm(false)}>
        <div style={{ background:"white", borderRadius:16, padding:28, maxWidth:520, width:"100%", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.15)", fontFamily:"system-ui,sans-serif" }}>
          <div style={{ fontSize:18, fontWeight:700, color:"#1A1A2E", margin:"0 0 6px" }}>Complete Your Profile</div>
          <p style={{ fontSize:13, color:"#8888AA", margin:"0 0 20px" }}>We need your delivery address before you can place orders.</p>

          <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#8888AA", margin:"0 0 12px", paddingBottom:8, borderBottom:"1px solid rgba(0,0,0,.07)" }}>Delivery Address</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            {[
              { k:"line1", label:"Address Line 1 *", placeholder:"Street address", full:true },
              { k:"line2", label:"Address Line 2", placeholder:"Apartment, unit… (optional)", full:true },
              { k:"city", label:"City *", placeholder:"City" },
              { k:"county", label:"County", placeholder:"County (optional)" },
              { k:"postcode", label:"Postcode *", placeholder:"e.g. M1 2AB" },
            ].map(({ k, label, placeholder, full }) => (
              <div key={k} style={{ gridColumn: full ? "1/-1" : "auto", marginBottom:4 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#4A4A6A", marginBottom:5, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
                <input value={(form as any)[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} placeholder={placeholder}
                  style={{ width:"100%", padding:"10px 12px", border:"1.5px solid rgba(0,0,0,.12)", borderRadius:8, fontSize:13, color:"#1A1A2E", outline:"none", boxSizing:"border-box" as const, background:"white" }} />
              </div>
            ))}
          </div>

          <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".08em", color:"#8888AA", margin:"0 0 12px", paddingBottom:8, borderBottom:"1px solid rgba(0,0,0,.07)" }}>Business Details (optional)</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>
            {[
              { k:"phone", label:"Phone Number", placeholder:"+44 7700 900000" },
              { k:"vatNumber", label:"VAT Number", placeholder:"GB123456789 (if registered)" },
            ].map(({ k, label, placeholder }) => (
              <div key={k}>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#4A4A6A", marginBottom:5, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
                <input value={(form as any)[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} placeholder={placeholder}
                  style={{ width:"100%", padding:"10px 12px", border:"1.5px solid rgba(0,0,0,.12)", borderRadius:8, fontSize:13, color:"#1A1A2E", outline:"none", boxSizing:"border-box" as const, background:"white" }} />
              </div>
            ))}
          </div>

          {error && <div style={{ background:"#FFF1F4", border:"1px solid rgba(225,29,72,.2)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#E11D48", marginBottom:16 }}>{error}</div>}

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, padding:"10px 0", background:"white", color:"#4A4A6A", border:"1px solid rgba(0,0,0,.12)", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer" }}>Later</button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex:2, padding:"10px 0", background:"#F0A3BC", color:"white", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", opacity:saving?.6:1 }}>
              {saving ? "Saving…" : "Save & Continue"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
