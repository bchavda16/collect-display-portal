"use client"

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const [mode, setMode] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [regForm, setRegForm] = useState({businessName:"",contactName:"",email:"",phone:""})
  const [regSubmitting, setRegSubmitting] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)
  const [regError, setRegError] = useState("")

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter your email and password"); return }
    setLoading(true); setError("")
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl })
    setLoading(false)
    if (res?.error) { setError("Invalid email or password") }
    else { router.push(callbackUrl) }
  }

  const handleRegister = async () => {
    if (!regForm.businessName || !regForm.contactName || !regForm.email) { setRegError("Please fill in all required fields"); return }
    setRegSubmitting(true); setRegError("")
    const r = await fetch("/api/applications", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(regForm) })
    const d = await r.json()
    setRegSubmitting(false)
    if (d.success) { setRegSuccess(true) }
    else { setRegError(d.error ?? "Failed to submit application") }
  }

  const css = `
    .lp{min-height:100vh;background:white;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;position:relative;overflow:hidden}
    .b1{position:absolute;top:-10%;right:-5%;width:400px;height:400px;border-radius:50%;background:rgba(136,221,225,.15);filter:blur(60px);pointer-events:none}
    .b2{position:absolute;bottom:-10%;left:-5%;width:350px;height:350px;border-radius:50%;background:rgba(92,200,197,.12);filter:blur(60px);pointer-events:none}
    .lbox{width:100%;max-width:400px;position:relative;z-index:1}
    .logo{text-align:center;margin-bottom:28px}
    .logo-t{font-size:26px;font-weight:800;color:#1A1A2E;letter-spacing:-.5px}
    .logo-t span{color:#88dde1}
    .logo-s{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#8888AA;margin-top:4px}
    .card{background:white;border:1px solid rgba(0,0,0,.09);border-radius:16px;padding:28px;box-shadow:0 4px 24px rgba(0,0,0,.06)}
    .tabs{display:flex;border-bottom:2px solid rgba(0,0,0,.08);margin-bottom:20px}
    .tab{flex:1;padding:10px 0;text-align:center;font-size:13px;font-weight:500;color:#8888AA;background:none;border:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px}
    .tab.on{color:#88dde1;border-bottom-color:#88dde1;font-weight:600}
    .fg{margin-bottom:16px}
    .fl{display:block;font-size:11px;font-weight:600;color:#4A4A6A;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em}
    .fi{width:100%;padding:11px 14px;border:1.5px solid rgba(0,0,0,.12);border-radius:10px;font-size:14px;color:#1A1A2E;outline:none;box-sizing:border-box;transition:border-color .15s}
    .fi:focus{border-color:#88dde1;box-shadow:0 0 0 3px rgba(136,221,225,.15)}
    .pw{position:relative}
    .pt{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#8888AA;font-size:16px;padding:0}
    .err{background:#FFF1F4;border:1px solid rgba(225,29,72,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:#E11D48;margin-bottom:16px}
    .ok{background:#EAFAF3;border:1px solid rgba(14,165,114,.2);border-radius:12px;padding:20px;font-size:13px;color:#0EA572;margin-bottom:16px;text-align:center}
    .sb{width:100%;padding:12px;background:#88dde1;color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer}
    .sb:hover{background:#5ecfd4}
    .sb:disabled{opacity:.6;cursor:not-allowed}
    .req{color:#E11D48;margin-left:2px}
    .foot{text-align:center;font-size:12px;color:#8888AA;margin-top:16px}
  `

  return (
    <div>
      <style dangerouslySetInnerHTML={{__html: css}} />
      <div className="lp">
        <div className="b1" />
        <div className="b2" />
        <div className="lbox">
          <div className="logo">
            <div className="logo-t">collect<span>&amp;</span>display</div>
            <div className="logo-s">Distribution Portal</div>
          </div>
          <div className="card">
            <div className="tabs">
              <button className={"tab"+(mode==="login"?" on":"")} onClick={()=>{setMode("login");setError("");setRegError("")}}>Sign In</button>
              <button className={"tab"+(mode==="register"?" on":"")} onClick={()=>{setMode("register");setError("");setRegError("")}}>Apply for Account</button>
            </div>

            {mode==="login" ? (
              <div>
                <div className="fg">
                  <label className="fl">Email address</label>
                  <input className="fi" type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="you@yourstore.co.uk" autoComplete="email" />
                </div>
                <div className="fg">
                  <label className="fl">Password</label>
                  <div className="pw">
                    <input className="fi" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter your password" style={{paddingRight:40}} />
                    <button className="pt" type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?"🙈":"👁"}</button>
                  </div>
                </div>
                {error && <div className="err">{error}</div>}
                <button className="sb" onClick={handleLogin} disabled={loading}>{loading?"Signing in…":"Sign in"}</button>
              </div>
            ) : regSuccess ? (
              <div className="ok">
                <div style={{fontSize:32,marginBottom:10}}>✅</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>Application submitted!</div>
                <div style={{color:"#4A4A6A",lineHeight:1.6}}>Thank you for applying. We will review your application and be in touch within 1–2 business days.</div>
                <button onClick={()=>{setRegSuccess(false);setMode("login");setRegForm({businessName:"",contactName:"",email:"",phone:""})}} style={{marginTop:14,padding:"8px 16px",background:"#88dde1",color:"white",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}}>Back to Sign In</button>
              </div>
            ) : (
              <div>
                <div className="fg">
                  <label className="fl">Company Name <span className="req">*</span></label>
                  <input className="fi" value={regForm.businessName} onChange={e=>setRegForm(f=>({...f,businessName:e.target.value}))} placeholder="e.g. Galaxy Collectibles Ltd" />
                </div>
                <div className="fg">
                  <label className="fl">Full Name <span className="req">*</span></label>
                  <input className="fi" value={regForm.contactName} onChange={e=>setRegForm(f=>({...f,contactName:e.target.value}))} placeholder="Your full name" />
                </div>
                <div className="fg">
                  <label className="fl">Email Address <span className="req">*</span></label>
                  <input className="fi" type="email" value={regForm.email} onChange={e=>setRegForm(f=>({...f,email:e.target.value}))} placeholder="you@yourstore.co.uk" />
                </div>
                <div className="fg">
                  <label className="fl">Phone Number</label>
                  <input className="fi" type="tel" value={regForm.phone} onChange={e=>setRegForm(f=>({...f,phone:e.target.value}))} placeholder="+44 7700 900000" />
                </div>
                {regError && <div className="err">{regError}</div>}
                <button className="sb" onClick={handleRegister} disabled={regSubmitting}>{regSubmitting?"Submitting…":"Submit Application"}</button>
                <p className="foot" style={{marginTop:12}}>We review all applications within 1–2 business days.</p>
              </div>
            )}
          </div>
          {mode==="login" && <p className="foot">Need an account? <button onClick={()=>setMode("register")} style={{background:"none",border:"none",cursor:"pointer",color:"#88dde1",fontSize:12,padding:0,fontWeight:500}}>Apply here →</button></p>}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:24,height:24,border:"2px solid #88dde1",borderTopColor:"transparent",borderRadius:"50%"}} /></div>}>
      <LoginForm />
    </Suspense>
  )
}
