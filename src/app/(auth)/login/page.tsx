'use client'

import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!email || !password) { setError("Please enter your email and password"); return }
    setLoading(true)
    setError("")
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl })
    setLoading(false)
    if (res?.error) { setError("Invalid email or password") }
    else { router.push(callbackUrl) }
  }

  return (
    <>
      <style>{`
        .login-page { min-height: 100vh; background: white; display: flex; align-items: center; justify-content: center; padding: 24px; font-family: system-ui, sans-serif; position: relative; overflow: hidden; }
        .login-blob1 { position: absolute; top: -10%; right: -5%; width: 400px; height: 400px; border-radius: 50%; background: rgba(240,163,188,0.15); filter: blur(60px); pointer-events: none; }
        .login-blob2 { position: absolute; bottom: -10%; left: -5%; width: 350px; height: 350px; border-radius: 50%; background: rgba(92,200,197,0.12); filter: blur(60px); pointer-events: none; }
        .login-box { width: 100%; max-width: 380px; position: relative; z-index: 1; }
        .login-logo { text-align: center; margin-bottom: 32px; }
        .login-logo-text { font-size: 26px; font-weight: 800; color: #1A1A2E; letter-spacing: -0.5px; }
        .login-logo-text span { color: #F0A3BC; }
        .login-logo-sub { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8888AA; margin-top: 4px; }
        .login-card { background: white; border: 1px solid rgba(0,0,0,0.09); border-radius: 16px; padding: 28px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .login-card-title { font-size: 18px; font-weight: 700; color: #1A1A2E; margin: 0 0 4px; }
        .login-card-sub { font-size: 13px; color: #8888AA; margin: 0 0 24px; }
        .login-field { margin-bottom: 16px; }
        .login-label { display: block; font-size: 12px; font-weight: 500; color: #4A4A6A; margin-bottom: 6px; }
        .login-input { width: 100%; padding: 11px 14px; border: 1px solid rgba(0,0,0,0.12); border-radius: 10px; font-size: 14px; color: #1A1A2E; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
        .login-input:focus { border-color: #F0A3BC; box-shadow: 0 0 0 3px rgba(240,163,188,0.2); }
        .login-pw-wrap { position: relative; }
        .login-pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #8888AA; font-size: 16px; padding: 0; }
        .login-error { background: #FFF1F4; border: 1px solid rgba(225,29,72,0.2); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #E11D48; margin-bottom: 16px; }
        .login-btn { width: 100%; padding: 12px; background: #F0A3BC; color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .login-btn:hover { background: #E88BAA; }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .login-footer { text-align: center; font-size: 12px; color: #8888AA; margin-top: 20px; }
        .login-footer a { color: #F0A3BC; text-decoration: none; }
      `}</style>
      <div className="login-page">
        <div className="login-blob1" />
        <div className="login-blob2" />
        <div className="login-box">
          <div className="login-logo">
            <div className="login-logo-text">collect<span>&</span>display</div>
            <div className="login-logo-sub">Distribution Portal</div>
          </div>
          <div className="login-card">
            <h2 className="login-card-title">Sign in</h2>
            <p className="login-card-sub">Access your trade account</p>
            <div className="login-field">
              <label className="login-label">Email address</label>
              <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="you@yourstore.co.uk" autoComplete="email" />
            </div>
            <div className="login-field">
              <label className="login-label">Password</label>
              <div className="login-pw-wrap">
                <input className="login-input" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Enter your password" autoComplete="current-password" style={{paddingRight: 40}} />
                <button className="login-pw-toggle" type="button" onClick={() => setShowPassword(v => !v)}>{showPassword ? "🙈" : "👁"}</button>
              </div>
            </div>
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </div>
          <p className="login-footer">No account? <a href="mailto:orders@collectanddisplay.com">Contact us to get set up</a></p>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
