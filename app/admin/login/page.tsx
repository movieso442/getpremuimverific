'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_OWNER_EMAIL } from '@/lib/admin/owner'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (new URLSearchParams(window.location.search).has('error')) {
      Promise.resolve().then(() => { if (active) setError('Sign-in was not completed with the verified owner account. Please try again.') })
    }
    void fetch('/api/admin/session', { cache: 'no-store' }).then(response => {
      if (active && response.ok) window.location.replace('/admin')
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
          redirectTo: `${window.location.origin}/admin/auth/callback`,
          queryParams: { login_hint: ADMIN_OWNER_EMAIL, prompt: 'select_account' },
        } })
        if (error) throw error
        return
      }
      const { error: authError } = await supabase.auth.signInWithPassword({ email: ADMIN_OWNER_EMAIL, password })
      if (authError) throw authError
      const response = await fetch('/api/admin/session', { cache: 'no-store' })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Administrator access was denied.')
      }
      window.location.replace('/admin')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not sign in. Please retry.')
      setBusy(false)
    }
  }

  return <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
    <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl">
      <ShieldCheck className="h-12 w-12 text-orange-500 mb-6" />
      <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Premium Verify · Owner access</p>
      <h1 className="mt-2 text-3xl font-extrabold">Administrator sign-in</h1>
      <p className="mt-3 text-sm text-slate-400">Manage your platform securely. This sign-in is separate from the customer portal.</p>
      <p className="my-5 break-all rounded-xl bg-slate-800 p-3 text-sm">{ADMIN_OWNER_EMAIL}</p>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
      <button disabled={busy} onClick={() => void signIn(true)} className="w-full rounded-xl bg-white p-3 font-bold text-slate-950 disabled:opacity-50">{busy ? <Loader2 className="mx-auto animate-spin" /> : 'Continue with Google'}</button>
      <p className="mt-3 text-xs text-slate-400">Choose your owner Google account. No website password is needed.</p>
      <details className="mt-6 text-sm text-slate-300"><summary className="cursor-pointer">Use an existing password instead</summary>
        <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void signIn(false) }}>
          <label htmlFor="admin-password" className="block">Owner account password</label>
          <input id="admin-password" autoComplete="current-password" type="password" required value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3" />
          <button disabled={busy} className="w-full rounded-xl bg-orange-600 p-3 font-bold text-white disabled:opacity-50">Sign in as owner</button>
        </form>
      </details>
      <p className="mt-6 text-xs text-slate-500">Other accounts cannot access administrator tools, even if their profile has an admin role.</p>
    </section>
  </div>
}
