"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

export default function AccountPage() {
  const [tab, setTab] = useState("details")
  const [editing, setEditing] = useState(false)
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({current:"",next:"",confirm:""})
  const [pwMsg, setPwMsg] = useState("")

  const { data: account, isLoading, refetch } = useQuery({
    queryKey: ["account"],
    queryFn: async () => { const r = await fetch("/api/account"); return r.json() },
  })

  const handleSave = async () => {
    setSaving(true)
    await fetch("/api/account", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({contactName, phone}) })
    setSaving(false); setEditing(false); refetch()
  }

  const handlePw = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg("Passwords do not match"); return }
    const r = await fetch("/api/account/password", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({currentPassword:pwForm.current,newPassword:pwForm.next}) })
    const d = await r.json()
    setPwMsg(d.success ? "Password updated!" : d.error ?? "Failed")
    if (d.success) setPwForm({current:"",next:"",confirm:""})
  }

  const tierBadge: Record<string,string> = { PLATINUM:"badge-purple", GOLD:"badge-amber", SILVER:"badge-teal", STANDARD:"badge-grey" }

  return (
    <>
    <style>{`
      .p-page{padding:24px;font-family:system-ui,sans-serif}
      .page-title{font-size:22px;font-weight:700;color:#1A1A2E;margin:0 0 4px}
      .page-sub{font-size:13px;color:#8888AA;margin:0 0 24px}
      .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.05)}
      .card-pad{padding:16px}
      .row{display:flex;align-items:center;gap:12px}
      .row-between{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .mb8{margin-bottom:8px}.mb16{margin-bottom:16px}.mb24{margin-bottom:24px}.mt16{margin-top:16px}
      .txt-primary{color:#1A1A2E}.txt-muted{color:#8888AA}.txt-pink{color:#C4638A}
      .fw600{font-weight:600}.fs12{font-size:12px}.fs13{font-size:13px}
      .btn-pink{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#F0A3BC;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer}
      .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:white;color:#4A4A6A;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;font-weight:500;cursor:pointer}
      .btn-sm{padding:5px 10px;font-size:12px}
      .input{width:100%;padding:9px 12px;border:1px solid rgba(0,0,0,.12);border-radius:8px;font-size:13px;color:#1A1A2E;outline:none;box-sizing:border-box;background:white}
      .input:focus{border-color:#F0A3BC}
      .input-label{display:block;font-size:11px;font-weight:600;color:#4A4A6A;margin-bottom:5px;text-transform:uppercase;letter-spacing:.05em}
      .form-row{margin-bottom:14px}
      .tab-nav{display:flex;border-bottom:2px solid rgba(0,0,0,.08);margin-bottom:24px}
      .tab{padding:10px 18px;font-size:13px;font-weight:500;color:#8888AA;cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px}
      .tab.active{color:#F0A3BC;border-bottom-color:#F0A3BC;font-weight:600}
      .detail-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06);font-size:13px}
      .detail-row:last-child{border-bottom:none}
      .detail-label{color:#8888AA}
      .badge{display:inline-flex;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600}
      .badge-amber{background:#FEF3C7;color:#D97706}
      .badge-purple{background:#F3EEFF;color:#7C3AED}
      .badge-teal{background:#E8F8F7;color:#3A9E9B}
      .badge-grey{background:#F4F5F7;color:#8888AA}
    `}</style>
    <div className="p-page" style={{maxWidth:800}}>
      <h1 className="page-title">My Account</h1>
      <p className="page-sub">Manage your business details and preferences</p>
      <div className="tab-nav">
        {[["details","Business Details"],["security","Security"]].map(([id,label])=>(
          <button key={id} className={"tab"+(tab===id?" active":"")} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>
      {isLoading ? <p className="txt-muted fs13">Loading…</p> : !account ? <p className="txt-muted fs13">Failed to load account</p> : tab==="details" ? (
        <div className="grid2">
          <div>
            <h2 className="fw600 txt-primary mb8" style={{fontSize:14}}>Business</h2>
            <div className="card card-pad mb16">
              {[["Business Name",account.businessName],["Email",account.email],["VAT Number",account.vatNumber??"—"]].map(([l,v])=>(
                <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="fw600">{v}</span></div>
              ))}
            </div>
            <div className="row-between mb8"><h2 className="fw600 txt-primary" style={{fontSize:14,margin:0}}>Contact</h2>{!editing&&<button className="btn-ghost btn-sm" onClick={()=>{setEditing(true);setContactName(account.contactName);setPhone(account.phone??"")}}>Edit</button>}</div>
            <div className="card card-pad">
              {editing ? (
                <>
                  <div className="form-row"><label className="input-label">Contact Name</label><input className="input" value={contactName} onChange={e=>setContactName(e.target.value)} /></div>
                  <div className="form-row"><label className="input-label">Phone</label><input className="input" value={phone} onChange={e=>setPhone(e.target.value)} /></div>
                  <div className="row"><button className="btn-pink btn-sm" onClick={handleSave} disabled={saving}>{saving?"Saving…":"Save"}</button><button className="btn-ghost btn-sm" onClick={()=>setEditing(false)}>Cancel</button></div>
                </>
              ) : (
                <>
                  <div className="detail-row"><span className="detail-label">Contact Name</span><span className="fw600">{account.contactName}</span></div>
                  <div className="detail-row"><span className="detail-label">Phone</span><span className="fw600">{account.phone??"—"}</span></div>
                </>
              )}
            </div>
          </div>
          <div>
            <h2 className="fw600 txt-primary mb8" style={{fontSize:14}}>Delivery Addresses</h2>
            {account.addresses?.map((a: any) => (
              <div key={a.id} className="card card-pad mb8">
                {a.label&&<p className="fw600 fs13 txt-pink mb8" style={{margin:"0 0 6px"}}>{a.label}</p>}
                <p className="fs13 txt-secondary" style={{margin:0,lineHeight:1.8}}>{a.line1}{a.line2?", "+a.line2:""}<br/>{a.city}{a.county?", "+a.county:""}<br/><span style={{fontFamily:"monospace",fontSize:12}}>{a.postcode}</span></p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{maxWidth:400}}>
          <div className="card card-pad">
            <h2 className="fw600 txt-primary mb16" style={{fontSize:14}}>Change Password</h2>
            <div className="form-row"><label className="input-label">Current Password</label><input className="input" type="password" value={pwForm.current} onChange={e=>setPwForm(p=>({...p,current:e.target.value}))} /></div>
            <div className="form-row"><label className="input-label">New Password</label><input className="input" type="password" value={pwForm.next} onChange={e=>setPwForm(p=>({...p,next:e.target.value}))} /></div>
            <div className="form-row"><label className="input-label">Confirm Password</label><input className="input" type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} /></div>
            {pwMsg&&<p style={{fontSize:13,color:pwMsg.includes("updated")?"#0EA572":"#E11D48",margin:"0 0 12px"}}>{pwMsg}</p>}
            <button className="btn-pink" onClick={handlePw}>Update Password</button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
