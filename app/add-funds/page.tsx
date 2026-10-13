'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAppState } from '@/lib/store'
import TopupFlow from '@/components/TopupFlow'
import LocalAmount from '@/components/LocalAmount'

function AddFunds() {
  const params = useSearchParams()
  const { profile } = useAppState()
  const requested = Number(params.get('amount') || params.get('required'))
  const [amount, setAmount] = useState(5000)
  useEffect(() => {
    if (Number.isFinite(requested) && requested > 0 && requested <= 10000000) {
      void Promise.resolve().then(() => setAmount(Math.max(3000, Math.round(requested))))
    }
  }, [requested])
  return <div className="mx-auto max-w-2xl space-y-6">
    <TopupFlow key={amount} profileId={profile.id} initialAmount={amount} initialReference={params.get('ref')} />
    <p className="text-center text-base text-gray-600">Selected wallet credit: <LocalAmount amountXaf={amount} /> · settlement {amount.toLocaleString()} XAF. Crypto is paid in the selected asset.</p>
    <p className="text-center text-xs text-gray-500">Wallet balance: {Number(profile.balance_xaf || 0).toLocaleString()} XAF. Payments are credited only after verification.</p>
  </div>
}
export default function AddFundsPage() { return <Suspense fallback={<p>Loading checkout...</p>}><AddFunds /></Suspense> }
