'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Wallet } from 'lucide-react'
import { CRYPTO_METHODS, isCryptoMethod, type CryptoMethod } from '@/lib/payments/manual-crypto'
import { depositXaf, type MobileMoneyMethod } from '@/lib/payments/mobile-money'
import { topupQuote } from '@/lib/payments/topup-fees'
import MobileMoneyCheckout from './MobileMoneyCheckout'
import CryptoDepositPanel from './CryptoDepositPanel'
import PaymentSupport from './PaymentSupport'

type Method = MobileMoneyMethod | CryptoMethod
export default function TopupFlow({ profileId, token, fixedAmount, initialAmount = 5000, initialReference }: {
  profileId: string; token?: string; fixedAmount?: number; initialAmount?: number; initialReference?: string | null
}) {
  const [method, setMethod] = useState<Method | null>(initialReference ? 'mtn_momo' : null)
  const [stage, setStage] = useState<'method' | 'amount' | 'pay'>(initialReference ? 'pay' : 'method')
  const [amount, setAmount] = useState(fixedAmount ?? initialAmount)
  const [started, setStarted] = useState(Boolean(initialReference))
  const [reference, setReference] = useState(initialReference)
  const [checking, setChecking] = useState(Boolean(profileId))
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState({ mobile: true, crypto: true })
  const [availabilityNotice, setAvailabilityNotice] = useState('')
  useEffect(() => {
    if (!profileId) return
    const controller = new AbortController()
    fetch(`/api/payments/manual-crypto${token ? `?token=${encodeURIComponent(token)}` : ''}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Unable to check your recent payments.')
        if (controller.signal.aborted) return
        setAvailability({ mobile: result.mobile_available !== false, crypto: result.crypto_available !== false })
        setAvailabilityNotice(result.availability_notice || '')
        const claim = result.pending_claim
        const payment = result.pending_mobile
        if (claim) {
          if (!isCryptoMethod(claim.payment_method)) { setError('A payment is being checked. Contact support before sending another transfer.'); return }
          setMethod(claim.payment_method); setAmount(Number(claim.amount_xaf)); setStage('pay'); setStarted(true)
        } else if (payment && !token) {
          if (!['mtn_momo', 'orange_money'].includes(payment.payment_method)) { setError('An existing payment needs checking. Contact support before paying again.'); return }
          setMethod(payment.payment_method); setAmount(Number(payment.amount)); setReference(payment.reference); setStage('pay'); setStarted(true)
        } else if (payment && token && payment.reference !== initialReference) {
          setError('An existing payment is being checked. Contact support before paying again.')
        }
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message) })
      .finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [profileId, token, initialReference])
  const valid = depositXaf(amount) !== null
  const quote = valid ? topupQuote(amount) : null
  const choose = (value: Method) => { setMethod(value); setStage(fixedAmount ? 'pay' : 'amount') }
  const name = method === 'mtn_momo' ? 'MTN MoMo' : method === 'orange_money' ? 'Orange Money' : method ? CRYPTO_METHODS[method].label : ''
  return <div className="mx-auto max-w-xl space-y-5">
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-5 py-6 sm:px-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600"><Wallet size={16} />Premium Verific wallet</div>
        <h1 className="text-2xl font-black text-gray-900">Add funds</h1>
        <ol aria-label="Top-up steps" className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
          {['method', 'amount', 'pay'].map((value, index) => <li key={value} aria-current={stage === value ? 'step' : undefined} className={stage === value ? 'text-orange-700' : 'text-gray-500'}>{index + 1}. {['Method', 'Amount', 'Payment'][index]}</li>)}
        </ol>
      </header>
      <div className="space-y-5 px-5 py-6 sm:px-8">
        {availabilityNotice && <p role="status" className="rounded-xl bg-amber-50 p-4 text-base text-amber-900">{availabilityNotice}</p>}
        {stage !== 'method' && !started && <button type="button" onClick={() => setStage(stage === 'pay' && !fixedAmount ? 'amount' : 'method')} className="flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} />Back</button>}
        {checking ? <p className="text-sm text-gray-500">Checking your recent payments…</p> : error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p> : stage === 'method' ? <>
          <h2 className="font-bold text-gray-900">How would you like to pay?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['mtn_momo', 'orange_money'] as const).map(value => <button key={value} type="button" disabled={!availability.mobile} onClick={() => choose(value)} className="flex min-h-20 items-center justify-between rounded-2xl border border-gray-200 p-4 text-left hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-60"><span><strong className="block text-gray-900">{value === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'}</strong><span className="text-xs text-gray-500">{availability.mobile ? 'Approve on your phone' : 'Temporarily unavailable'}</span></span><ArrowRight size={18} /></button>)}
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Crypto</h3>
          <div className="grid gap-3 sm:grid-cols-2">{Object.entries(CRYPTO_METHODS).map(([key, option]) => <button key={key} type="button" disabled={!availability.crypto} onClick={() => choose(key as CryptoMethod)} className="flex min-h-20 items-center justify-between rounded-2xl border border-gray-200 p-4 text-left hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-60"><span><strong className="block text-gray-900">{option.asset}</strong><span className="text-xs text-gray-500">{option.label.split(' · ')[1]}</span></span><ArrowRight size={18} /></button>)}</div>
        </> : stage === 'amount' ? <>
          <h2 className="font-bold text-gray-900">Add funds with {name}</h2>
          <label htmlFor="deposit-amount" className="block text-sm font-semibold">Amount to add to your wallet (XAF)</label>
          <input id="deposit-amount" type="number" min={3000} max={10000000} step={1} value={amount || ''} onChange={event => setAmount(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 p-4 text-xl font-bold" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[3000, 5000, 10000, 25000].map(value => <button type="button" key={value} onClick={() => setAmount(value)} className="rounded-xl border border-gray-200 py-3 text-sm font-semibold">{value.toLocaleString()}</button>)}</div>
          <p className="text-xs text-gray-500">Minimum: 3,000 XAF. Service fee: 2% on top.</p>
          {quote && <p className="rounded-xl bg-gray-50 p-4 text-sm">Wallet receives <strong>{quote.creditXaf.toLocaleString()} XAF</strong> · Fee <strong>{quote.feeXaf.toLocaleString()} XAF</strong></p>}
          <button type="button" disabled={!valid} onClick={() => setStage('pay')} className="w-full rounded-xl bg-orange-600 p-4 font-bold text-white disabled:opacity-50">Continue</button>
        </> : method && <>
          <h2 className="font-bold text-gray-900">{name}</h2>
          {!profileId ? <a href="/login?next=/add-funds" className="block rounded-xl bg-orange-600 p-4 text-center font-bold text-white">Sign in to continue</a> : (isCryptoMethod(method) ? !availability.crypto : !availability.mobile)
            ? <p className="text-base text-amber-900">This payment method needs checking. Please do not send another payment; contact support for its status.</p> : method === 'mtn_momo' || method === 'orange_money'
            ? <MobileMoneyCheckout amount={amount} token={token} initialReference={reference} selectedMethod={method} onStarted={() => setStarted(true)} />
            : <CryptoDepositPanel profileId={profileId} token={token} selectedMethod={method} walletAmount={amount} onStarted={() => setStarted(true)} />}
        </>}
      </div>
    </section>
    <PaymentSupport />
  </div>
}
