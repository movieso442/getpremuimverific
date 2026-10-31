'use client'

import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

type Balance = {
  provider: string
  balance: number | null
  currency: string | null
  status: 'ok' | 'not_configured' | 'error'
  message?: string
}

function amount(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
}

export default function ProviderBalancesPanel() {
  const [balances, setBalances] = useState<Balance[] | null>(null)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/admin/provider-balances', { method: 'POST', cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load provider balances.')
      setBalances(result.balances)
      setCheckedAt(result.checked_at)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load provider balances.')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  return <section className="rounded-2xl border border-cyan-700/40 bg-slate-900 p-5" aria-label="Provider balances">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-extrabold">Provider balances</h2><p className="mt-1 text-xs text-slate-400">Live available funds at your suppliers. Refresh before topping up; these balances are not your customer-wallet balance.</p></div>
      <button type="button" onClick={() => void refresh()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-bold disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Checking…' : balances ? 'Refresh balances' : 'Check balances'}</button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">{error}</p>}
    {balances && <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{balances.map((item) => <article key={item.provider} className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
        <h3 className="text-sm font-bold text-slate-300">{item.provider}</h3>
        {item.status === 'ok' ? <p className="mt-2 text-2xl font-black">{amount(item.balance!)} <span className="text-sm font-semibold text-cyan-300">{item.currency || 'provider units'}</span></p>
          : <p className={`mt-2 text-sm ${item.status === 'error' ? 'text-amber-300' : 'text-slate-400'}`}>{item.message}</p>}
        {item.provider === '5SIM' && item.status === 'ok' && !item.currency && <p className="mt-1 text-xs text-slate-500">5SIM’s profile response does not identify a currency.</p>}
      </article>)}</div>
      {checkedAt && <p className="mt-3 text-xs text-slate-500">Checked {new Date(checkedAt).toLocaleString()}</p>}
    </>}
  </section>
}
