'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Settings, LogOut, Menu, Plus } from 'lucide-react'
import { useAppState } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { AuthModal } from '@/components/AuthModal'
import LocalAmount from '@/components/LocalAmount'

export function JapHeader({ onToggleSidebar, onOpenDeposit }: { onToggleSidebar?: () => void; onOpenDeposit: () => void }) {
  const { profile } = useAppState()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const signOut = async () => {
    if (!profile.id) { setIsAuthOpen(true); return }
    setSigningOut(true)
    try {
      const result = await createClient().auth.signOut({ scope: 'local' })
      if (result.error) throw result.error
      for (const key of ['premiumverific_profile', 'premiumverific_tx', 'premiumverific_sms', 'premiumverific_smm']) localStorage.removeItem(key)
      window.location.replace('/')
    } catch { setError('Could not sign out. Please try again.'); setSigningOut(false) }
  }
  return <header className="sticky top-0 z-20 border-b bg-white px-3 py-3 sm:px-6">
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {onToggleSidebar && <button onClick={onToggleSidebar} aria-label="Open navigation" aria-controls="mobile-navigation" className="rounded-xl p-3 md:hidden"><Menu size={24} /></button>}
        <button onClick={onOpenDeposit} aria-label="Balance — add funds" className="flex min-w-0 items-center gap-2 rounded-xl bg-blue-50 px-3 py-3 text-base font-bold text-blue-800"><LocalAmount amountXaf={profile.balance_xaf} /><Plus size={18} className="shrink-0" /></button>
      </div>
      <div className="flex items-center gap-1">
        <Link href="/profile" aria-label="Profile and currency settings" className="rounded-xl p-3 hover:bg-gray-50"><Settings size={22} /></Link>
        <button onClick={() => { void signOut() }} disabled={signingOut} aria-label={profile.id ? 'Sign out' : 'Sign in'} className="rounded-xl p-3 hover:bg-red-50"><LogOut size={22} /></button>
      </div>
    </div>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
  </header>
}
