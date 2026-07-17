"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export default function AccountPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState("details")
  const [editing, setEditing] = useState(false)
  const [editingAddr, setEditingAddr] = useState(false)
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [vatNumber, setVatNumber] = useState("")
  const [addr, setAddr] = useState({line1:"",line2:"",city:"",county:"",postcode:""})
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({current:"",next:"",confirm:""})
  const [pwMsg, setPwMsg] = useState("")

  const { data: account, isLoading, refetch } = useQuery({
    queryKey: ["account"],
    queryFn: async () => { const r = await fetch("/api/account"); return r.json() },
  })

  const handleSave = async () => {
    setSaving(true)
    await fetch("/api/account", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({contactName, phone, vatNumber}) })
    setSaving(false); setEditing(false); refetch()
  }

  const handleSaveAddr = async () => {
    if (!addr.line1||!addr.city||!addr.postcode) return
    setSaving(true)
    await fetch("/api/account", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({address:addr}) })
    setSaving(false); setEditingAddr(false); refetch()
  }

  const handlePw = async () => {
    if (pwForm.next!==pwForm.confirm){setPwMsg("Passwords do not match");return}
    const r = await fetch("/api/account/password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({currentPassword:pwForm.current,newPassword:pwForm.next})})
    const d = await r.json()
    setPwMsg(d.success?"Password updated!":d.error??"Failed")
    if(d.success)setPwForm({current:"",next:"",confirm:""})
  }

  const S: any = {
    wrap: {padding:24,fontFamily:"system-ui,sans-serif",maxWidth:820},
    title: {fontSize:22,fontWeight:700,color:"#1A1A2E",margin:"0 0 4px"},
    sub: {fontSize:13,color:"#8888AA",margin:"0 0 20px"},
    tabs: {display:"flex",borderBottom:"2px solid rgba(0,0,0,.08)",marginBottom:24},
    tab: (a:boolean) => ({padding:"10px 18px",fontSize:13,fontWeight:a?600:500,color:a?"#88dde1":"#8888AA",background:"none",border:"none",cursor:"pointer",borderBottom:"2px solid",borderBottomColor:a?"#88dde1":"transparent",marginBottom:-2}),
    card: {background:"white",border:"1px solid rgba(0,0,0,.09)",borderRadius:12,padding:16,boxShadow:"0 1px 4px rgba(0,0,0,.05)",marginBottom:16},
    grid2: {display:"grid",gridTemplateColumns:"1fr 1fr",gap:16},
    sHead: {fontSize:12,fontWeight:700,color:"#1A1A2E",margin:"0 0 12px",display:"flex",alignItems:"center",justifyContent:"space-between"},
    dr: {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid rgba(0,0,0,.06)",fontSize:13},
    dl: {color:"#8888AA"},
    dv: {fontWeight:600,color:"#1A1A2E"},
    inp: {width:"100%",padding:"10px 12px",border:"1.5px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,color:"#1A1A2E",outline:"none",boxSizing:"border-box" as const,background:"white"},
    lbl: {display:"block",fontSize:11,fontWeight:600,color:"#4A4A6A",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:".05em"},
    fg: {marginBottom:14},
    btnPink: {display:"inline-flex",alignItems:"center",padding:"8px 16px",background:"#88dde1",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},
    btnGhost: {display:"inline-flex",alignItems:"center",padding:"7px 14px",background:"white",color:"#4A4A6A",border:"1px solid rgba(0,0,0,.12)",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer"},
    btnSm: {padding:"5px 10px",fontSize:12},
    noAddr: {background:"#FEF3C7",border:"1px solid rgba(217,119,6,.2)",borderRadius:10,padding:"14px 16px",fontSize:13,color:"#92400E",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},
  }

  if (isLoading) return <div style={{padding:24,fontFamily:"system-ui",color:"#8888AA"}}>Loading…</div>

  const defaultAddr = account?.addresses?.[0]

  return (
    <div style={S.wrap}>
      <h1 style={S.title}>My Account</h1>
      <p style={S.sub}>Manage your business details and delivery address</p>

      {!account?.hasAddress && (
        <div style={{...S.noAddr,marginBottom:20}}>
          <span>⚠️ Add your delivery address to enable ordering</span>
          <button style={{...S.btnPink,...S.btnSm}} onClick={()=>{setEditingAddr(true);setTab("address")}}>Add Address</button>
        </div>
      )}

      <div style={S.tabs}>
        {[["details","Business Details"],["address","Delivery Address"],["security","Security"]].map(([id,label])=>(
          <button key={id} style={S.tab(tab===id)} onClick={()=>setTab(id as any)}>{label}</button>
        ))}
      </div>

      {tab==="details" && (
        <div style={S.grid2}>
          <div>
            <div style={S.card}>
              <div style={S.sHead}>Business <span style={{fontSize:10,fontWeight:600,color:"#8888AA"}}>READ ONLY</span></div>
              {[["Business Name",account?.businessName],["Email",account?.email]].map(([l,v])=>(
                <div key={l} style={S.dr}><span style={S.dl}>{l}</span><span style={S.dv}>{v}</span></div>
              ))}
            </div>
            <div style={S.card}>
              <div style={S.sHead}>
                Contact
                {!editing && <button style={{...S.btnGhost,...S.btnSm}} onClick={()=>{setEditing(true);setContactName(account?.contactName??"");setPhone(account?.phone??"");setVatNumber(account?.vatNumber??"")}}>Edit</button>}
              </div>
              {editing ? (
                <>
                  <div style={S.fg}><label style={S.lbl}>Contact Name</label><input style={S.inp} value={contactName} onChange={e=>setContactName(e.target.value)} /></div>
                  <div style={S.fg}><label style={S.lbl}>Phone</label><input style={S.inp} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+44 7700 900000" /></div>
                  <div style={S.fg}><label style={S.lbl}>VAT Number</label><input style={S.inp} value={vatNumber} onChange={e=>setVatNumber(e.target.value)} placeholder="GB123456789 (if registered)" /></div>
                  <div style={{display:"flex",gap:8}}><button style={{...S.btnPink,...S.btnSm}} onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save"}</button><button style={{...S.btnGhost,...S.btnSm}} onClick={()=>setEditing(false)}>Cancel</button></div>
                </>
              ) : (
                <>
                  {[["Contact Name",account?.contactName],["Phone",account?.phone??"—"],["VAT Number",account?.vatNumber??"Not registered"]].map(([l,v])=>(
                    <div key={l} style={S.dr}><span style={S.dl}>{l}</span><span style={S.dv}>{v}</span></div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab==="address" && (
        <div style={{maxWidth:500}}>
          {!defaultAddr && !editingAddr ? (
            <div style={S.card}>
              <div style={{textAlign:"center",padding:"24px 0"}}>
                <div style={{fontSize:36,marginBottom:10}}>📍</div>
                <p style={{fontWeight:600,color:"#1A1A2E",margin:"0 0 6px"}}>No delivery address saved</p>
                <p style={{fontSize:13,color:"#8888AA",margin:"0 0 16px"}}>You need an address before you can place orders.</p>
                <button style={S.btnPink} onClick={()=>setEditingAddr(true)}>+ Add Delivery Address</button>
              </div>
            </div>
          ) : editingAddr ? (
            <div style={S.card}>
              <div style={S.sHead}>{defaultAddr?"Edit Address":"Add Address"}</div>
              {[
                {k:"line1",label:"Address Line 1 *",placeholder:"Street address",full:true},
                {k:"line2",label:"Address Line 2",placeholder:"Apartment, unit… (optional)",full:true},
                {k:"city",label:"City *",placeholder:"City"},
                {k:"county",label:"County",placeholder:"County (optional)"},
                {k:"postcode",label:"Postcode *",placeholder:"e.g. M1 2AB"},
              ].map(({k,label,placeholder})=>(
                <div key={k} style={S.fg}>
                  <label style={S.lbl}>{label}</label>
                  <input style={S.inp} value={(addr as any)[k]} onChange={e=>setAddr(a=>({...a,[k]:e.target.value}))} placeholder={placeholder} />
                </div>
              ))}
              <div style={{display:"flex",gap:8}}>
                <button style={{...S.btnPink}} onClick={handleSaveAddr} disabled={saving}>{saving?"Saving…":"Save Address"}</button>
                <button style={S.btnGhost} onClick={()=>setEditingAddr(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={S.card}>
              <div style={S.sHead}>
                Delivery Address
                <button style={{...S.btnGhost,...S.btnSm}} onClick={()=>{setEditingAddr(true);setAddr({line1:defaultAddr.line1,line2:defaultAddr.line2??"",city:defaultAddr.city,county:defaultAddr.county??"",postcode:defaultAddr.postcode})}}>Edit</button>
              </div>
              <address style={{fontSize:13,color:"#4A4A6A",lineHeight:1.9,fontStyle:"normal"}}>
                {defaultAddr.line1}<br/>
                {defaultAddr.line2 && <>{defaultAddr.line2}<br/></>}
                {defaultAddr.city}{defaultAddr.county?", "+defaultAddr.county:""}<br/>
                <span style={{fontFamily:"monospace",fontSize:12}}>{defaultAddr.postcode}</span>
              </address>
            </div>
          )}
        </div>
      )}

      {tab==="security" && (
        <div style={{maxWidth:400}}>
          <div style={S.card}>
            <div style={S.sHead}>Change Password</div>
            {[{k:"current",label:"Current Password"},{k:"next",label:"New Password"},{k:"confirm",label:"Confirm New Password"}].map(({k,label})=>(
              <div key={k} style={S.fg}>
                <label style={S.lbl}>{label}</label>
                <input style={S.inp} type="password" value={(pwForm as any)[k]} onChange={e=>setPwForm(p=>({...p,[k]:e.target.value}))} />
              </div>
            ))}
            {pwMsg && <p style={{fontSize:13,color:pwMsg.includes("updated")?"#0EA572":"#E11D48",margin:"0 0 12px"}}>{pwMsg}</p>}
            <button style={S.btnPink} onClick={handlePw}>Update Password</button>
          </div>
        </div>
      )}
    </div>
  )
}
