'use client'

import { useEffect, useState } from 'react'

type CheckoutState = { amount_xaf: number; expires_at: string; status: string }

export default function BotTopupPage() {
  const [checkout, setCheckout] = useState<CheckoutState | null>(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [method, setMethod] = useState<'mtn_momo' | 'orange_money'>('mtn_momo')
  const [reference, setReference] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const token = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('token') || ''

  useEffect(() => {
    if (!token) { setError('This secure top-up link is incomplete. Return to the bot for a new one.'); return }
    fetch(`/api/bot/topup?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'This secure top-up link is unavailable.')
        setCheckout(payload)
      })
      .catch((reason: Error) => setError(reason.message))
  }, [token])

  async function continueToPayunit() {
    setStarting(true)
    setError('')
    try {
      const response = await fetch('/api/bot/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not start payment.')
      if (payload.status === 'completed') { setCheckout((current) => current ? { ...current, status: 'completed' } : current); return }
      window.location.assign(payload.payment_url)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start payment.')
      setStarting(false)
    }
  }

  async function submitManualPayment(event: React.FormEvent) {
    event.preventDefault()
    setStarting(true)
    setError('')
    try {
      const response = await fetch('/api/bot/topup/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, payment_method: method, payer_phone: payerPhone, transfer_reference: reference }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not submit this payment for review.')
      setCheckout((current) => current ? { ...current, status: 'manual_pending' } : current)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit this payment for review.')
    } finally {
      setStarting(false)
    }
  }

  return <main className="min-h-screen bg-slate-950 px-5 py-16 text-slate-100"><section className="mx-auto max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-7 shadow-2xl"><p className="text-sm font-bold uppercase tracking-widest text-orange-400">Premium Verify</p><h1 className="mt-3 text-3xl font-black">Secure wallet top-up</h1>{error && <p className="mt-5 rounded-xl bg-red-950/60 p-4 text-sm text-red-200">{error}</p>}{!checkout ? <p className="mt-5 text-slate-300">Loading your secure checkout...</p> : checkout.status === 'completed' ? <p className="mt-5 rounded-xl bg-emerald-950/60 p-4 text-emerald-200">Payment confirmed. Your wallet has been credited.</p> : checkout.status === 'manual_pending' ? <p className="mt-5 rounded-xl bg-amber-950/60 p-4 text-sm text-amber-100">Your payment was submitted for verification. It will be credited only after the transfer is confirmed. For help, contact 677034736.</p> : <><p className="mt-4 text-slate-300">This link is linked to the customer who requested it in the bot.</p><div className="my-6 rounded-2xl bg-slate-800 p-5"><p className="text-sm text-slate-400">Amount to add</p><p className="mt-1 text-3xl font-black text-white">{checkout.amount_xaf.toLocaleString()} XAF</p></div><button onClick={continueToPayunit} disabled={starting} className="w-full rounded-xl bg-orange-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-60">{starting ? 'Opening secure checkout...' : 'Continue to secure payment'}</button><div className="my-6 border-t border-slate-700 pt-6"><h2 className="font-bold">Manual mobile-money payment</h2><p className="mt-2 text-sm text-slate-300">If the secure checkout is unavailable, use your own phone to pay exactly {checkout.amount_xaf.toLocaleString()} XAF. Never share your mobile-money PIN with us.</p><div className="mt-4 rounded-xl bg-slate-800 p-4 text-sm"><p><b>MTN MoMo:</b> *126*9*677336798*{checkout.amount_xaf}#</p><p className="mt-3"><b>Orange Money:</b> #150*1*1*640796062*{checkout.amount_xaf}#</p></div><form onSubmit={submitManualPayment} className="mt-4 space-y-3"><select value={method} onChange={(event) => setMethod(event.target.value as 'mtn_momo' | 'orange_money')} className="w-full rounded-lg bg-slate-800 p-3 text-sm"><option value="mtn_momo">MTN MoMo</option><option value="orange_money">Orange Money</option></select><input value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} placeholder="Payer phone number (optional)" className="w-full rounded-lg bg-slate-800 p-3 text-sm" /><input required value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Reference from payment confirmation" className="w-full rounded-lg bg-slate-800 p-3 text-sm" /><button disabled={starting} className="w-full rounded-xl border border-orange-400 px-4 py-3 font-bold text-orange-200 disabled:opacity-60">I have paid - submit for verification</button></form></div><p className="mt-4 text-center text-xs text-slate-400">This link expires at {new Date(checkout.expires_at).toLocaleTimeString()}. Support: 677034736.</p></>}</section></main>
}
