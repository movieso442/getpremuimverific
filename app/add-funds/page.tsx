'use client'

import { Suspense, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, ShieldCheck, Smartphone } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAppState } from '@/lib/store'

type Notice = { type: 'success' | 'error' | 'info'; text: string }

function AddFundsContent() {
  const searchParams = useSearchParams()
  const requestedAmount = searchParams.get('amount') || searchParams.get('required')
  const paymentReference = searchParams.get('ref')
  const { profile } = useAppState()
  const [amount, setAmount] = useState(5000)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (requestedAmount && Number(requestedAmount) > 0) setAmount(Number(requestedAmount))
  }, [requestedAmount])

  useEffect(() => {
    if (!paymentReference) return
    let cancelled = false
    let attempts = 0

    const verify = async () => {
      try {
        const response = await fetch(`/api/payments/payunit?ref=${encodeURIComponent(paymentReference)}`)
        const result = await response.json()
        if (cancelled) return
        if (result.credited) {
          setNotice({ type: 'success', text: 'Payment confirmed. Your wallet has been credited.' })
          return
        }
        setNotice({ type: 'info', text: 'Payment is awaiting Payunit confirmation. Your wallet is not credited until it is verified.' })
        attempts += 1
        if (attempts < 12) window.setTimeout(verify, 5000)
      } catch {
        if (!cancelled) setNotice({ type: 'info', text: 'We are still waiting for the payment confirmation.' })
      }
    }

    void verify()
    return () => { cancelled = true }
  }, [paymentReference])

  const startCheckout = async () => {
    if (!Number.isFinite(amount) || amount < 500) {
      setNotice({ type: 'error', text: 'Enter a deposit of at least 500 XAF.' })
      return
    }

    setLoading(true)
    setNotice(null)
    try {
      const response = await fetch('/api/payments/payunit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'XAF', phone_number: phoneNumber }),
      })
      const result = await response.json()
      if (response.ok && result.payment_url) {
        window.location.assign(result.payment_url)
        return
      }
      setNotice({ type: 'error', text: result.error || 'Payunit could not start the payment. Your wallet was not credited.' })
    } catch {
      setNotice({ type: 'error', text: 'Could not connect to the payment service. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const noticeStyles = notice?.type === 'success'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : notice?.type === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-blue-50 border-blue-200 text-blue-800'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 bg-linear-to-r from-orange-50 to-white border-b border-orange-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5722] text-white flex items-center justify-center shrink-0"><CreditCard className="w-6 h-6" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Add funds securely</h1>
              <p className="text-sm text-gray-600 mt-1">You will complete payment on Payunit&apos;s hosted checkout. We never collect your card PIN, card number, or CVV.</p>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {searchParams.get('reason') === 'insufficient_balance' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex gap-3"><AlertTriangle className="w-5 h-5 shrink-0" />Your current wallet balance is too low for that order. Add funds to continue.</div>
          )}
          {notice && <div className={`p-4 rounded-xl border text-sm font-medium ${noticeStyles}`}>{notice.text}</div>}

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Deposit amount (XAF)</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[2000, 5000, 10000, 25000].map((value) => (
                <button key={value} type="button" onClick={() => setAmount(value)} className={`py-2 rounded-lg border text-sm font-bold ${amount === value ? 'border-[#ff5722] bg-orange-50 text-[#e64a19]' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>{value.toLocaleString()}</button>
              ))}
            </div>
            <div className="relative"><input aria-label="Deposit amount in XAF" type="number" min="500" step="500" value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg font-bold outline-none focus:border-[#ff5722]" /><span className="absolute right-4 top-4 text-sm font-bold text-gray-400">XAF</span></div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Mobile Money number <span className="font-normal text-gray-500">(optional)</span></label>
            <div className="relative"><Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" /><input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="e.g. +237 6xx xxx xxx" className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 outline-none focus:border-[#ff5722]" /></div>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-gray-800"><ShieldCheck className="w-5 h-5 text-emerald-600" />Verified wallet credit only</div>
            <p>Your balance changes only when Payunit&apos;s server-side status check confirms the exact amount and reference.</p>
          </div>

          <button type="button" onClick={startCheckout} disabled={loading} className="w-full rounded-xl bg-[#ff5722] hover:bg-[#e64a19] disabled:opacity-60 py-3.5 text-white font-extrabold flex justify-center items-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            Continue to Payunit — {amount.toLocaleString()} XAF
          </button>
        </div>
      </section>

      <p className="text-center text-xs text-gray-500">Wallet: {Number(profile.balance_xaf || 0).toLocaleString()} XAF · MTN MoMo, Orange Money, card, and other channels shown by Payunit at checkout.</p>
    </div>
  )
}

export default function AddFundsPage() {
  return <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading secure checkout…</div>}><AddFundsContent /></Suspense>
}
