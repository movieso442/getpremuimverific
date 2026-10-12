'use client'
import { useEffect, useRef, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { cameroonPhone, type MobileMoneyMethod } from '@/lib/payments/mobile-money'
import { recordAnalytics } from './AnalyticsTracker'

export default function MobileMoneyCheckout({ amount, token, initialReference }: { amount: number; token?: string; initialReference?: string | null }) {
  const [method, setMethod] = useState<MobileMoneyMethod>('mtn_momo')
  const [phone, setPhone] = useState('')
  const [reference, setReference] = useState(initialReference || '')
  const [status, setStatus] = useState(initialReference ? 'pending' : 'ready')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null)
  const [pollVersion, setPollVersion] = useState(0)
  const locked = useRef(false)
  const compactId = initialReference?.match(/^PV([a-f0-9]{32})$/i)?.[1]
  const requestId = useRef(compactId ? compactId.replace(/^(........)(....)(....)(....)(............)$/, '$1-$2-$3-$4-$5') : '')

  useEffect(() => {
    if (!reference && !token) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const controller = new AbortController()
    const check = async () => {
      try {
        const url = token ? `/api/bot/topup?token=${encodeURIComponent(token)}` : `/api/payments/payunit?ref=${encodeURIComponent(reference)}`
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (stopped) return
        if (!response.ok) { setMessage(result.error || 'Could not check payment.'); if (response.status === 404 && !token) setStatus('ready'); return }
        setStatus(result.status)
        if (Number.isFinite(result.amount_xaf)) setPaymentAmount(result.amount_xaf)
        if (result.status === 'completed') { setMessage('Payment confirmed. Your wallet has been credited.'); return }
        if (result.status === 'failed' || result.status === 'rejected') { setMessage('This payment was not completed. Check your mobile-money account before starting another.'); return }
        if (result.status === 'pending') setMessage('Approve the payment on your phone. Enter your PIN only in your operator’s prompt, never here. We are checking your payment securely.')
        attempts++
        if (attempts < 120) timer = setTimeout(check, 5000)
        else setMessage('Confirmation is taking longer. Keep the payment reference and check your wallet before trying again.')
      } catch { if (!stopped) { attempts++; setMessage('Connection interrupted. Check your wallet before trying another payment.'); if (attempts < 120) timer = setTimeout(check, 10000) } }
    }
    void check()
    return () => { stopped = true; controller.abort(); clearTimeout(timer) }
  }, [reference, token, pollVersion])

  const pay = async (event: React.FormEvent) => {
    event.preventDefault()
    if (locked.current) return
    if (!cameroonPhone(phone) || !Number.isFinite(amount) || amount < 3000) { setMessage('Enter your Cameroon mobile number and at least 3,000 XAF.'); return }
    locked.current = true
    setBusy(true)
    setPaymentAmount(amount)
    setMessage('Sending the payment request to your phone…')
    requestId.current ||= crypto.randomUUID()
    if (!token) {
      const expectedReference = 'PV' + requestId.current.replace(/-/g, '')
      setReference(expectedReference)
      setStatus('pending')
      const url = new URL(window.location.href)
      url.searchParams.set('ref', expectedReference)
      window.history.replaceState(null, '', url)
    }
    // Optional analytics must never interrupt a payment (e.g. blocked storage).
    try { recordAnalytics('checkout_started', token ? '/bot-topup' : '/add-funds', { amount_xaf: amount, method }) } catch {}
    try {
      const response = await fetch(token ? '/api/bot/topup' : '/api/payments/payunit', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, amount, currency: 'XAF', phone_number: phone, payment_method: method, idempotency_key: requestId.current }) })
      const result = await response.json()
      if (result.reference) {
        setReference(result.reference)
        if (!token) { const url = new URL(window.location.href); url.searchParams.set('ref', result.reference); window.history.replaceState(null, '', url) }
      }
      if (!response.ok) throw new Error(result.error || 'Could not start payment.')
      setStatus(result.status || 'pending')
      setMessage(result.credited ? 'Payment confirmed. Your wallet has been credited.' : 'Check your phone for the payment request. Do not submit another payment while confirmation is pending.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Check your payment status before retrying. Your request will not be resent automatically.')
      try { recordAnalytics('checkout_start_failed', token ? '/bot-topup' : '/add-funds', { amount_xaf: amount, method }) } catch {}
    }
    finally { setBusy(false); locked.current = false; setPollVersion(value => value + 1) }
  }
  const pending = status === 'pending' || status === 'manual_pending'
  return <form onSubmit={pay} className="space-y-4 text-gray-900">
    <div className="grid grid-cols-2 gap-3" aria-label="Payment operator">
      {(['mtn_momo', 'orange_money'] as const).map(value => <button key={value} type="button" disabled={busy || pending} aria-pressed={method === value} onClick={() => setMethod(value)} className={`rounded-xl border-2 px-3 py-4 text-sm font-bold ${method === value ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'}`}>{value === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'}</button>)}
    </div>
    <label className="block text-sm font-semibold" htmlFor={token ? 'bot-payment-phone' : 'payment-phone'}>Your mobile-money number</label>
    <input id={token ? 'bot-payment-phone' : 'payment-phone'} required type="tel" autoComplete="tel" inputMode="tel" value={phone} disabled={busy || pending} onChange={event => setPhone(event.target.value)} placeholder="+237 6XX XXX XXX" className="w-full rounded-xl border border-gray-300 bg-white p-3 text-base" />
    <p className="flex gap-2 text-xs text-gray-600"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />You approve on your phone. We never ask for your PIN.</p>
    {message && <p role="status" aria-live="polite" className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">{message}</p>}
    {reference && <p className="break-all text-xs text-gray-500">Payment reference: {reference}</p>}
    {reference && paymentAmount !== null && <p className="text-sm font-semibold text-gray-700">This payment: {paymentAmount.toLocaleString()} XAF</p>}
    <button disabled={busy || pending || status === 'completed'} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 font-bold text-white disabled:opacity-60">{busy && <Loader2 className="h-5 w-5 animate-spin" />}{pending ? 'Waiting for phone approval' : status === 'completed' ? 'Wallet credited' : `Pay ${amount.toLocaleString()} XAF`}</button>
    {status === 'failed' && !token && <button type="button" onClick={() => { requestId.current = ''; setReference(''); setStatus('ready'); setMessage('Check your operator account before retrying.'); }} className="text-sm font-semibold text-orange-700">Start a new payment</button>}
    {status === 'failed' && token && <p className="text-sm text-gray-600">Return to the bot for a new top-up link. Check your operator account before paying again.</p>}
  </form>
}
