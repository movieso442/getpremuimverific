'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CreditCard, ExternalLink, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { hostedCardUrl } from '@/lib/payments/cards'
import { topupQuote } from '@/lib/payments/topup-fees'

export default function CardCheckout({ amount, profileId, onStarted }: { amount: number; profileId: string; onStarted: () => void }) {
  const router = useRouter()
  const [status, setStatus] = useState('checking')
  const [notice, setNotice] = useState('')
  const [url, setUrl] = useState('')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const key = useRef(''), locked = useRef(false)
  const storageKey = 'pv-card.' + profileId
  const quote = topupQuote(amount, 'payunit_card')
  const check = useCallback(async () => {
    const response = await fetch('/api/payments/cards' + (key.current ? '?key=' + encodeURIComponent(key.current) : ''), { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not check payment.')
    if (result.payment) {
      setReference(result.payment.reference); setStatus(result.payment.status)
      const valid = hostedCardUrl(result.payment.checkout_url)
      const unexpired = new Date(result.payment.expires_at).getTime() > Date.now()
      setUrl(valid && unexpired ? valid.url : '')
      setNotice(result.payment.status === 'completed' ? 'Payment verified. Your wallet is credited.' : result.payment.status === 'failed' ? 'Payment was not completed. Check your card statement before trying again.' : 'Verification pending. Do not create another payment. You can resume an unexpired checkout below.')
    } else { setStatus(result.available ? 'ready' : 'unavailable') }
  }, [])
  useEffect(() => {
    try { key.current = localStorage.getItem(storageKey) || '' } catch { /* Server recovery still finds pending payments. */ }
    void check().catch(error => { setStatus('unknown'); setNotice(error.message) })
  }, [check, storageKey])
  useEffect(() => {
    if (status !== 'pending') return
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void check().catch(() => setNotice('Verification is delayed. Do not pay again; check shortly or contact support.')) }, 6000)
    return () => clearInterval(timer)
  }, [status, check])
  async function start() {
    if (locked.current) return
    locked.current = true; setBusy(true); setNotice('')
    try {
      key.current ||= crypto.randomUUID()
      localStorage.setItem(storageKey, key.current) // Persist before any money request.
      onStarted()
      const response = await fetch('/api/payments/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, accepted_fee_percent: 1.4, idempotency_key: key.current }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Checkout is unavailable.')
      setReference(result.reference); setStatus(result.status)
      const checkout = hostedCardUrl(result.checkout_url)
      if (checkout && result.status === 'pending') { setUrl(checkout.url); window.location.assign(checkout.url) }
      else setNotice(result.message || 'Check this payment before starting another top-up.')
    } catch (error) { setStatus('unknown'); setNotice(error instanceof Error ? error.message : 'Check payment before trying again.') }
    finally { setBusy(false); locked.current = false }
  }
  return <div className="space-y-5">
    <div className="rounded-2xl bg-slate-50 p-5 text-sm"><dl className="space-y-3"><div className="flex justify-between gap-3"><dt>Wallet credit</dt><dd className="font-bold">{quote.creditXaf.toLocaleString()} XAF</dd></div><div className="flex justify-between gap-3"><dt>Card fee · 1.4%</dt><dd>{quote.feeXaf.toLocaleString()} XAF</dd></div><div className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-base font-bold"><dt>Total payment</dt><dd>{quote.totalXaf.toLocaleString()} XAF</dd></div></dl></div>
    <p className="flex gap-3 text-sm text-gray-600"><ShieldCheck className="shrink-0 text-green-700" size={20} />Card details are entered on Payunit’s secure checkout, not stored by Premium Verific. Your bank may require authentication and charge its own conversion fees. Card acceptance depends on Payunit and your issuer.</p>
    {status === 'unavailable' ? <p role="status" className="rounded-xl bg-amber-50 p-4 text-amber-900">Card top-ups are not enabled yet. Please choose MTN, Orange or an available crypto method.</p> : status === 'ready' ? <button disabled={busy} onClick={() => void start()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 p-4 font-bold text-white disabled:opacity-50"><CreditCard size={20} />{busy ? 'Preparing checkout…' : `Pay ${quote.totalXaf.toLocaleString()} XAF securely`}<ExternalLink size={16} /></button> : <>
      <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{notice || 'Checking your card payment…'}</p>
      {reference && <p className="break-all text-xs text-gray-500">Payment reference: {reference}</p>}
      {status === 'pending' && url && <a href={url} className="block rounded-xl bg-orange-600 p-4 text-center font-bold text-white">Resume secure checkout</a>}
      <button type="button" onClick={() => void check().catch(error => setNotice(error.message))} className="w-full rounded-xl border border-gray-300 p-3 font-semibold">Check payment status</button>
      {['completed', 'failed'].includes(status) && <button type="button" onClick={() => { localStorage.removeItem(storageKey); key.current = ''; router.push('/dashboard') }} className="block w-full text-center font-semibold text-orange-700">Back to my dashboard</button>}
    </>}
    <p className="text-xs text-gray-500">Only the wallet credit is added to your balance. Leaving checkout does not cancel a submitted payment. Refunds require review and return to the original payment source.</p>
  </div>
}
