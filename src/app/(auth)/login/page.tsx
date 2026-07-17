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

  return (
    <div style={{minHeight:"100vh",background:"#080c14",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"system-ui,sans-serif",position:"relative",overflow:"hidden"}}>

      {/* Animated orbs */}
      <style>{`
        @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(80px,-60px) scale(1.2)}66%{transform:translate(-50px,70px) scale(.85)}}
        @keyframes orb2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-80px,60px) scale(1.15)}66%{transform:translate(60px,-80px) scale(.9)}}
        @keyframes orb3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(50px,80px) scale(.9)}66%{transform:translate(-60px,-50px) scale(1.25)}}
        @keyframes orb4{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-40px,-60px) scale(1.1)}66%{transform:translate(70px,40px) scale(.9)}}
        @keyframes orb5{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,40px) scale(.85)}66%{transform:translate(-70px,-30px) scale(1.15)}}
        .fi::placeholder{color:rgba(255,255,255,.25)}
        .fi:focus{outline:none;border-color:#88dde1 !important;box-shadow:0 0 0 3px rgba(136,221,225,.2);background:rgba(255,255,255,.12) !important}
        .sb:hover{background:#5ecfd4 !important}
        .sb:disabled{opacity:.6;cursor:not-allowed}
        .tab-on{color:#88dde1 !important;border-bottom-color:#88dde1 !important;font-weight:600 !important}
      `}</style>

      {/* Orb 1 - cyan */}
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(136,221,225,.55),transparent 70%)",top:-150,left:-150,filter:"blur(60px)",animation:"orb1 12s ease-in-out infinite"}} />
      {/* Orb 2 - purple */}
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,130,255,.5),transparent 70%)",bottom:-100,right:-100,filter:"blur(60px)",animation:"orb2 14s ease-in-out infinite"}} />
      {/* Orb 3 - blue */}
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,195,247,.45),transparent 70%)",top:"35%",left:"35%",filter:"blur(70px)",animation:"orb3 10s ease-in-out infinite"}} />
      {/* Orb 4 - teal */}
      <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(100,220,200,.4),transparent 70%)",bottom:"5%",left:"-5%",filter:"blur(60px)",animation:"orb4 11s ease-in-out infinite"}} />
      {/* Orb 5 - violet */}
      <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(206,147,216,.45),transparent 70%)",top:"5%",right:"8%",filter:"blur(60px)",animation:"orb5 13s ease-in-out infinite reverse"}} />

      {/* Card */}
      <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:26,fontWeight:800,color:"white",letterSpacing:"-.5px"}}>
            collect<span style={{color:"#88dde1"}}>&</span>display
          </div>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:".12em",textTransform:"uppercase" as const,color:"rgba(255,255,255,.4)",marginTop:4}}>
            Distribution Portal
          </div>
        </div>

        <div style={{background:"rgba(255,255,255,.07)",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,padding:28,boxShadow:"0 32px 80px rgba(0,0,0,.5)"}}>

          {/* Tabs */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.1)",marginBottom:20}}>
            {[["login","Sign In"],["register","Apply for Account"]].map(([id,label])=>(
              <button key={id} onClick={()=>{setMode(id);setError("");setRegError("")}}
                className={mode===id?"tab-on":""}
                style={{flex:1,padding:"10px 0",textAlign:"center" as const,fontSize:13,fontWeight:500,color:"rgba(255,255,255,.38)",background:"none",border:"none",cursor:"pointer",borderBottom:"2px solid transparent",marginBottom:-1,transition:"all .2s"}}>
                {label}
              </button>
            ))}
          </div>

          {mode==="login" ? (
            <div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:".05em"}}>Email address</label>
                <input className="fi" type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="you@yourstore.co.uk" autoComplete="email"
                  style={{width:"100%",padding:"11px 14px",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,fontSize:14,color:"white",boxSizing:"border-box" as const,background:"rgba(255,255,255,.08)",transition:"all .15s",fontFamily:"inherit"}} />
              </div>
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:".05em"}}>Password</label>
                <div style={{position:"relative" as const}}>
                  <input className="fi" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter your password" style={{width:"100%",padding:"11px 40px 11px 14px",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,fontSize:14,color:"white",boxSizing:"border-box" as const,background:"rgba(255,255,255,.08)",transition:"all .15s",fontFamily:"inherit"}} />
                  <button type="button" onClick={()=>setShowPassword(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.4)",fontSize:16,padding:0}}>
                    {showPassword?"🙈":"👁"}
                  </button>
                </div>
              </div>
              {error && <div style={{background:"rgba(225,29,72,.15)",border:"1px solid rgba(225,29,72,.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#ff8097",marginBottom:16}}>{error}</div>}
              <button className="sb" onClick={handleLogin} disabled={loading}
                style={{width:"100%",padding:12,background:"#88dde1",color:"#0a1420",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:".02em",transition:"background .15s"}}>
                {loading?"Signing in…":"Sign in"}
              </button>
            </div>
          ) : regSuccess ? (
            <div style={{background:"rgba(14,165,114,.12)",border:"1px solid rgba(14,165,114,.25)",borderRadius:12,padding:20,fontSize:13,color:"#4ade80",textAlign:"center" as const}}>
              <div style={{fontSize:32,marginBottom:10}}>✅</div>
              <div style={{fontWeight:700,fontSize:15,marginBottom:6,color:"white"}}>Application submitted!</div>
              <div style={{color:"rgba(255,255,255,.5)",lineHeight:1.6}}>Thank you. We will review your application and be in touch within 1–2 business days.</div>
              <button onClick={()=>{setRegSuccess(false);setMode("login");setRegForm({businessName:"",contactName:"",email:"",phone:""})}}
                style={{marginTop:14,padding:"8px 16px",background:"#88dde1",color:"#0a1420",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                Back to Sign In
              </button>
            </div>
          ) : (
            <div>
              {[
                {k:"businessName",label:"Company Name *",placeholder:"e.g. Galaxy Collectibles Ltd",type:"text"},
                {k:"contactName",label:"Full Name *",placeholder:"Your full name",type:"text"},
                {k:"email",label:"Email Address *",placeholder:"you@yourstore.co.uk",type:"email"},
                {k:"phone",label:"Phone Number",placeholder:"+44 7700 900000",type:"tel"},
              ].map(({k,label,placeholder,type})=>(
                <div key={k} style={{marginBottom:14}}>
                  <label style={{display:"block",fontSize:11,fontWeight:600,color:"rgba(255,255,255,.5)",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:".05em"}}>{label}</label>
                  <input className="fi" type={type} value={(regForm as any)[k]} onChange={e=>setRegForm(f=>({...f,[k]:e.target.value}))} placeholder={placeholder}
                    style={{width:"100%",padding:"11px 14px",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:10,fontSize:14,color:"white",boxSizing:"border-box" as const,background:"rgba(255,255,255,.08)",fontFamily:"inherit"}} />
                </div>
              ))}
              {regError && <div style={{background:"rgba(225,29,72,.15)",border:"1px solid rgba(225,29,72,.3)",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#ff8097",marginBottom:16}}>{regError}</div>}
              <button className="sb" onClick={handleRegister} disabled={regSubmitting}
                style={{width:"100%",padding:12,background:"#88dde1",color:"#0a1420",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:".02em",transition:"background .15s"}}>
                {regSubmitting?"Submitting…":"Submit Application"}
              </button>
              <p style={{textAlign:"center" as const,fontSize:12,color:"rgba(255,255,255,.3)",marginTop:12}}>We review all applications within 1–2 business days.</p>
            </div>
          )}
        </div>

        {mode==="login" && (
          <p style={{textAlign:"center" as const,fontSize:12,color:"rgba(255,255,255,.3)",marginTop:16}}>
            Need an account?{" "}
            <button onClick={()=>setMode("register")} style={{background:"none",border:"none",cursor:"pointer",color:"#88dde1",fontSize:12,padding:0,fontWeight:500}}>
              Apply here →
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#080c14",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:24,height:24,border:"2px solid #88dde1",borderTopColor:"transparent",borderRadius:"50%"}} /></div>}>
      <LoginForm />
    </Suspense>
  )
}
