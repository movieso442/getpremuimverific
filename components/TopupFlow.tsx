'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Wallet } from 'lucide-react'
import { CRYPTO_METHODS, isCryptoMethod, type CryptoMethod } from '@/lib/payments/manual-crypto'
import { depositXaf, type MobileMoneyMethod } from '@/lib/payments/mobile-money'
import { topupQuote } from '@/lib/payments/topup-fees'
import MobileMoneyCheckout from './MobileMoneyCheckout'
import CryptoDepositPanel from './CryptoDepositPanel'
import PaymentSupport from './PaymentSupport'
import UsdtEstimate from './UsdtEstimate'
import {useTranslations} from 'next-intl'
import { usePlatformSettings } from '@/lib/platform/usePlatformSettings'

type Method = MobileMoneyMethod | CryptoMethod
export default function TopupFlow({ profileId, token, fixedAmount, initialAmount = 5000, initialReference }: {
  profileId: string; token?: string; fixedAmount?: number; initialAmount?: number; initialReference?: string | null
}) {
  const t = useTranslations('Topup')
  const c = useTranslations('Common')
  const minimumXaf = usePlatformSettings().minimum_topup_xaf
  const router = useRouter()
  const [method, setMethod] = useState<Method | null>(initialReference ? 'mtn_momo' : null)
  const [stage, setStage] = useState<'method' | 'amount' | 'pay'>(initialReference ? 'pay' : 'method')
  const [amount, setAmount] = useState(fixedAmount ?? initialAmount)
  const [started, setStarted] = useState(Boolean(initialReference))
  const [reference, setReference] = useState(initialReference)
  const [checking, setChecking] = useState(Boolean(profileId))
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState({ mobile: true, crypto: true })
  const [availabilityNotice, setAvailabilityNotice] = useState('')
  const checkoutId = useRef<string | null>(null)
  const recordCheckout = (state: 'started' | 'cancelled', selected: Method) => {
    // Bot-only identities have no verified website email. Tracking is optional
    // and its failure must never delay navigation or a real payment.
    if (!profileId || token || !checkoutId.current) return
    void fetch('/api/customer/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ id: checkoutId.current, state, method: selected }) }).catch(() => undefined)
  }
  const leaveCheckout = () => {
    if (started && !window.confirm(t('leaveWarning'))) return
    if (method) recordCheckout('cancelled', method)
    router.push('/')
  }
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
  const valid = depositXaf(amount, 'XAF', minimumXaf) !== null
  const quote = valid ? topupQuote(amount, method || 'usdt_trc20', minimumXaf) : null
  const choose = (value: Method) => {
    checkoutId.current ||= crypto.randomUUID()
    recordCheckout('started', value)
    setMethod(value); setStage(fixedAmount ? 'pay' : 'amount')
  }
  const name = method === 'mtn_momo' ? 'MTN MoMo' : method === 'orange_money' ? 'Orange Money' : method ? CRYPTO_METHODS[method].label : ''
  return <div className="mx-auto max-w-xl space-y-5">
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-5 py-6 sm:px-8">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-600"><Wallet size={16} />{t('wallet')}</div>
        <h1 className="text-2xl font-black text-gray-900">{t('addFunds')}</h1>
        <ol aria-label={t('steps')} className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
          {['method', 'amount', 'pay'].map((value, index) => <li key={value} aria-current={stage === value ? 'step' : undefined} className={stage === value ? 'text-orange-700' : 'text-gray-500'}>{index + 1}. {[t('method'), t('amount'), t('payment')][index]}</li>)}
        </ol>
      </header>
      <div className="space-y-5 px-5 py-6 sm:px-8">
        {availabilityNotice && <p role="status" className="rounded-xl bg-amber-50 p-4 text-base text-amber-900">{availabilityNotice}</p>}
        {stage !== 'method' && !started && <button type="button" onClick={() => setStage(stage === 'pay' && !fixedAmount ? 'amount' : 'method')} className="flex items-center gap-2 text-sm font-semibold text-gray-600"><ArrowLeft size={16} />{c('back')}</button>}
        {checking ? <p className="text-sm text-gray-500">{t('checking')}</p> : error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p> : stage === 'method' ? <>
          <h2 className="font-bold text-gray-900">{t('chooseMethod')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['mtn_momo', 'orange_money'] as const).map(value => <button key={value} type="button" disabled={!availability.mobile} onClick={() => choose(value)} className="flex min-h-20 items-center justify-between rounded-2xl border border-gray-200 p-4 text-left hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-60"><span><strong className="block text-gray-900">{value === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'}</strong><span className="text-xs text-gray-500">{availability.mobile ? t('approvePhone') : t('unavailable')}</span></span><ArrowRight size={18} /></button>)}
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{t('crypto')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">{Object.entries(CRYPTO_METHODS).map(([key, option]) => <button key={key} type="button" disabled={!availability.crypto} onClick={() => choose(key as CryptoMethod)} className="flex min-h-20 items-center justify-between rounded-2xl border border-gray-200 p-4 text-left hover:border-orange-400 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:opacity-60"><span><strong className="block text-gray-900">{option.asset}</strong><span className="text-xs text-gray-500">{option.label.split(' · ')[1]}</span></span><ArrowRight size={18} /></button>)}</div>
        </> : stage === 'amount' ? <>
          <h2 className="font-bold text-gray-900">{t('addWith', {method: name})}</h2>
          <label htmlFor="deposit-amount" className="block text-sm font-semibold">{t('walletAmount')}</label>
          <input id="deposit-amount" type="number" min={minimumXaf} max={10000000} step={1} value={amount || ''} onChange={event => setAmount(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 p-4 text-xl font-bold" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[minimumXaf, 5000, 10000, 25000].map(value => <button type="button" key={value} onClick={() => setAmount(value)} className="rounded-xl border border-gray-200 py-3 text-sm font-semibold">{value.toLocaleString()}</button>)}</div>
          <p className="text-xs text-gray-500">{method === 'mtn_momo' || method === 'orange_money' ? t('minimumMobile', {amount: minimumXaf.toLocaleString()}) : t('minimumCrypto', {amount: minimumXaf.toLocaleString()})}</p>
          {quote && method === 'usdt_trc20' && <UsdtEstimate creditXaf={quote.creditXaf} feeXaf={quote.feeXaf} />}
          {quote && <p className="rounded-xl bg-gray-50 p-4 text-sm">{t('walletReceives', {amount: quote.creditXaf.toLocaleString(), fee: quote.feeXaf.toLocaleString()})}</p>}
          <button type="button" disabled={!valid} onClick={() => setStage('pay')} className="w-full rounded-xl bg-orange-600 p-4 font-bold text-white disabled:opacity-50">{c('continue')}</button>
        </> : method && <>
          <h2 className="font-bold text-gray-900">{name}</h2>
          {!profileId ? <a href="/login?next=/add-funds" className="block rounded-xl bg-orange-600 p-4 text-center font-bold text-white">{t('signInContinue')}</a> : (isCryptoMethod(method) ? !availability.crypto : !availability.mobile)
            ? <p className="text-base text-amber-900">{t('methodChecking')}</p> : method === 'mtn_momo' || method === 'orange_money'
            ? <MobileMoneyCheckout amount={amount} token={token} initialReference={reference} selectedMethod={method} onStarted={() => setStarted(true)} />
            : <CryptoDepositPanel profileId={profileId} token={token} selectedMethod={method} walletAmount={amount} onStarted={() => setStarted(true)} />}
        </>}
      </div>
    </section>
    {stage !== 'method' && <button type="button" onClick={leaveCheckout} className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700">{started ? t('leave') : t('cancel')}</button>}
    <PaymentSupport />
  </div>
}
