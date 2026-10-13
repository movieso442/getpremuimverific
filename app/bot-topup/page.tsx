'use client'
import { useEffect, useState } from 'react'
import TopupFlow from '@/components/TopupFlow'
import PaymentSupport from '@/components/PaymentSupport'
type Checkout = { amount_xaf: number; status: string; reference?: string | null }
export default function BotTopupPage() {
  const [token, setToken] = useState('')
  const [checkout, setCheckout] = useState<Checkout | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('token') || ''
    if (!value) { void Promise.resolve().then(() => setError('This top-up link is incomplete. Ask the bot for a new one.')); return }
    const controller = new AbortController()
    fetch(`/api/bot/topup?token=${encodeURIComponent(value)}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Payment unavailable.'); if (!controller.signal.aborted) { setToken(value); setCheckout(result) } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
    return () => controller.abort()
  }, [])
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
    {error ? <div className="mx-auto max-w-xl space-y-4"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p><PaymentSupport /></div> : !checkout ? <p className="text-center text-gray-500">Loading your payment…</p> : checkout.status === 'completed' ? <div className="mx-auto max-w-xl space-y-4"><p role="status" className="rounded-xl bg-emerald-50 p-5 font-bold text-emerald-800">Payment complete. Your wallet has been credited.</p><PaymentSupport /></div> : ['manual_pending', 'confirmed', 'rejected'].includes(checkout.status) ? <div className="mx-auto max-w-xl space-y-4"><p role="status" className="rounded-xl bg-blue-50 p-5 text-blue-900">{checkout.status === 'rejected' ? 'Payment not confirmed. Contact support before sending again.' : 'Payment being checked. Please don’t send another transfer.'}</p><PaymentSupport /></div> : <TopupFlow profileId={token} token={token} fixedAmount={checkout.amount_xaf} initialReference={checkout.status === 'pending' ? checkout.reference : null} />}
  </main>
}
