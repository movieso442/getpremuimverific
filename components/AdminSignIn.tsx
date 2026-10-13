'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_OWNER_EMAIL } from '@/lib/admin/owner'

const adminHome = () => window.location.hostname === 'admin.premiumverific.com' ? '/' : '/admin'

export default function AdminSignIn() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (new URLSearchParams(window.location.search).has('error')) {
      Promise.resolve().then(() => { if (active) setError('Sign-in was not completed with the verified owner account. Please try again.') })
    }
    void fetch('/api/admin/session', { cache: 'no-store' }).then(response => {
      if (active && response.ok) window.location.replace(adminHome())
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const signIn = async (google: boolean) => {
    setBusy(true)
    setError('')
    try {
      const supabase = createClient()
      // Signing out locally lets the owner replace a customer session without
      // invalidating sessions on other devices or the customer hostname.
      await supabase.auth.signOut({ scope: 'local' })
      if (google) {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: {
          redirectTo: `${window.location.origin}${window.location.hostname === 'admin.premiumverific.com' ? '/auth/callback' : '/admin/auth/callback'}`,
          queryParams: { login_hint: ADMIN_OWNER_EMAIL, prompt: 'select_account' },
        } })
        if (error) throw error
        return
      }
      const login = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_OWNER_EMAIL, password }),
      })
      if (!login.ok) {
        const result = await login.json()
        throw new Error(result.error || 'Could not sign in.')
      }
      setPassword('')
      const response = await fetch('/api/admin/session', { cache: 'no-store' })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Administrator access was denied.')
      }
      window.location.replace(adminHome())
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not sign in. Please retry.')
      setBusy(false)
    }
  }

  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl">
      <ShieldCheck className="h-12 w-12 text-orange-500 mb-6" />
      <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Premium Verific · Owner access</p>
      <h1 className="mt-2 text-3xl font-extrabold">Administrator sign-in</h1>
      <p className="mt-3 text-base text-slate-300">Sign in to your dashboard with your admin email and password.</p>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
        <form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); void signIn(false) }}>
          <label htmlFor="admin-email" className="block text-base">Admin email</label>
          <input id="admin-email" name="email" autoComplete="username" type="email" readOnly value={ADMIN_OWNER_EMAIL} className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-base" />
          <label htmlFor="admin-password" className="block text-base">Password</label>
          <input id="admin-password" autoComplete="current-password" type="password" required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3" />
          <button disabled={busy} className="w-full rounded-xl bg-orange-600 p-4 font-bold text-white disabled:opacity-50">{busy ? <Loader2 aria-label="Signing in" className="mx-auto animate-spin" /> : 'Sign in to dashboard'}</button>
        </form>
      <details className="mt-6 text-base text-slate-300"><summary className="cursor-pointer">Other sign-in option</summary><button type="button" disabled={busy} onClick={() => void signIn(true)} className="mt-4 w-full rounded-xl bg-white p-3 font-bold text-slate-950 disabled:opacity-50">Continue with Google</button></details>
    </section>
  </div>
}
