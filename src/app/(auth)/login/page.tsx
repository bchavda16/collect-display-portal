'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl })
    setLoading(false)
    if (res?.error) { setError('Invalid email or password') }
    else { router.push(callbackUrl) }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-80 h-80 rounded-full bg-teal/10 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            collect<span className="text-brand">&</span>display
          </h1>
          <p className="text-xs text-text-muted uppercase tracking-widest mt-1">Distribution Portal</p>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Sign in</h2>
            <p className="text-sm text-text-secondary mt-0.5">Access your trade account</p>
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="you@yourstore.co.uk"
            autoComplete="email"
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-8 text-text-muted hover:text-text-primary"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-light border border-rose/20 px-3 py-2">
              <p className="text-xs text-rose">{error}</p>
            </div>
          )}

          <Button size="lg" loading={loading} onClick={handleSubmit} className="w-full">
            Sign in
          </Button>
        </div>

        <p className="text-center text-xs text-text-muted">
          No account?{' '}
          <a href="mailto:orders@collectanddisplay.com" className="text-brand hover:text-brand-hover">
            Contact us to get set up
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
