'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppState } from '@/lib/store'
import CryptoDepositPanel from '@/components/CryptoDepositPanel'
import MobileMoneyCheckout from '@/components/MobileMoneyCheckout'

function AddFunds() {
  const params = useSearchParams()
  const { profile } = useAppState()
  const requested = Number(params.get('amount') || params.get('required'))
  const [amount, setAmount] = useState(5000)
  useEffect(() => {
    if (Number.isFinite(requested) && requested >= 3000 && requested <= 10000000) {
      void Promise.resolve().then(() => setAmount(Math.round(requested)))
    }
  }, [requested])
  return <div className="mx-auto max-w-2xl space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Premium Verify wallet</p>
      <h1 className="mt-2 text-2xl font-black">Add funds</h1>
      <p className="mt-2 text-sm text-gray-600">Choose your operator, enter your number once, then approve the payment on your phone.</p>
      <label htmlFor="deposit-amount" className="mb-2 mt-6 block text-sm font-bold">Amount (XAF)</label>
      <input id="deposit-amount" type="number" min={3000} max={10000000} step={1} value={amount} onChange={event => setAmount(Number(event.target.value))} className="w-full rounded-xl border border-gray-300 p-3 text-lg" />
      <p className="mt-2 text-xs text-gray-500">Minimum deposit: 3,000 XAF (US$5 at our wallet conversion rate).</p>
      <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[3000,5000,10000,25000].map(value => <button key={value} onClick={() => setAmount(value)} className="rounded-lg border border-gray-200 py-2 text-sm font-semibold">{value.toLocaleString()}</button>)}</div>
      <MobileMoneyCheckout amount={amount} initialReference={params.get('ref')} />
    </section>
    {profile.id && <CryptoDepositPanel profileId={profile.id} />}
    <p className="text-center text-xs text-gray-500">Wallet balance: {Number(profile.balance_xaf || 0).toLocaleString()} XAF. Payments are credited only after verification.</p>
  </div>
}
export default function AddFundsPage() { return <Suspense fallback={<p>Loading checkout...</p>}><AddFunds /></Suspense> }
