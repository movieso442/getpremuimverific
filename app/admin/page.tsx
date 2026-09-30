'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Banknote, ClipboardList, Loader2, RefreshCw, ShieldCheck, Users } from 'lucide-react'

type Overview = {
  generated_at: string
  schema_notice: string | null
  metrics: Record<string, number>
  profiles: Array<{ id: string; email: string; full_name: string | null; phone_number: string | null; balance_xaf: number; role: 'client' | 'admin'; created_at: string }>
  transactions: Array<{ id: string; profile_id: string; amount: number; type: string; payment_method: string; reference: string; status: string; description?: string; created_at: string }>
  smm_orders: Array<{ id: string; profile_id: string; service_name: string; quantity: number; charge_xaf: number; status: string; remains: number; created_at: string }>
  sms_orders: Array<{ id: string; profile_id: string; service_name: string; price_xaf: number; status: string; created_at: string }>
  account_orders: Array<{ id: string; profile_id: string; item_title: string; price_xaf: number; status: string; created_at: string }>
  expenses: Array<{ id: string; kind: string; amount_xaf: number; description: string; reference?: string; created_at: string }>
  manual_claims: Array<{ id: string; profile_id: string; amount_xaf: number; payment_method: string; payer_phone: string | null; transfer_reference: string; status: string; created_at: string }>
  settings: { support_email: string; support_phone: string; whatsapp_number: string; smm_markup_multiplier: number; sms_markup_multiplier: number }
  analytics: Array<{ date: string; deposits_xaf: number; sales_xaf: number; orders: number }>
}

const xaf = (value: number | string | undefined) => `${Number(value || 0).toLocaleString()} XAF`
const when = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const badge = (status: string) => status === 'completed' ? 'bg-emerald-100 text-emerald-800' : status === 'failed' || status === 'canceled' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncingCatalog, setSyncingCatalog] = useState(false)
  const [expense, setExpense] = useState({ kind: 'provider_cost', amount_xaf: '', description: '', reference: '' })
  const [settings, setSettings] = useState<Overview['settings'] | null>(null)
  const [reviewingClaim, setReviewingClaim] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Access denied')
      setData(result)
      setSettings(result.settings)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the administrator portal.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const profileById = useMemo(() => new Map(data?.profiles.map((profile) => [profile.id, profile]) || []), [data])
  const matchingTransactions = useMemo(() => (data?.transactions || []).filter((transaction) => {
    const customer = profileById.get(transaction.profile_id)
    const needle = filter.toLowerCase().trim()
    return !needle || [transaction.reference, transaction.type, transaction.status, customer?.email, customer?.full_name].some((value) => value?.toLowerCase().includes(needle))
  }), [data, filter, profileById])

  const addExpense = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/admin/financial-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expense, amount_xaf: Number(expense.amount_xaf) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not record the expense.')
      setExpense({ kind: 'provider_cost', amount_xaf: '', description: '', reference: '' })
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not record the expense.')
    } finally {
      setSaving(false)
    }
  }

  const changeRole = async (profileId: string, role: 'admin' | 'client') => {
    const response = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: profileId, role }) })
    if (!response.ok) {
      const result = await response.json()
      setError(result.error || 'Could not update the user role.')
      return
    }
    await load()
  }

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save settings.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  const reviewManualPayment = async (claimId: string, action: 'confirm' | 'reject') => {
    setReviewingClaim(claimId)
    try {
      const response = await fetch('/api/admin/manual-payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim_id: claimId, action }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not review this payment.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not review this payment.')
    } finally {
      setReviewingClaim(null)
    }
  }

  const syncCatalogue = async () => {
    setSyncingCatalog(true)
    try {
      const response = await fetch('/api/admin/catalog/sync', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sync the live JAP catalogue.')
      setError(`Live JAP catalogue refreshed: ${result.synced} services.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sync the live JAP catalogue.')
    } finally {
      setSyncingCatalog(false)
    }
  }

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white"><Loader2 className="w-7 h-7 animate-spin" /></div>
  if (error && !data) {
    const needsSignIn = error === 'Sign in is required.'
    return <div className="min-h-screen grid place-items-center bg-slate-950 p-6"><div className="max-w-md rounded-2xl bg-white p-7 text-center"><ShieldCheck className="mx-auto text-orange-600 w-10 h-10 mb-3" /><h1 className="font-extrabold text-xl">Administrator portal</h1><p className="text-sm text-gray-600 mt-2">{error}</p><p className="text-xs text-gray-500 mt-4">Sign in with a profile whose role is <code>admin</code>.</p>{needsSignIn && <Link href="/login?next=/admin" className="inline-flex mt-5 rounded-xl bg-orange-600 hover:bg-orange-500 px-4 py-2.5 text-sm font-bold text-white">Sign in to administrator portal</Link>}</div></div>
  }
  if (!data) return null

  const cards = [
    ['Recorded profit', data.metrics.recorded_profit_xaf, 'Sales minus provider fees and recorded operating costs'],
    ['Customer service sales', data.metrics.service_sales_xaf, 'Completed SMM, SMS, and account purchases'],
    ['Cash received', data.metrics.cash_received_xaf, 'Completed Payunit wallet top-ups'],
    ['Wallet liability', data.metrics.wallet_liability_xaf, 'Customer balances currently held on platform'],
  ]

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div><p className="text-orange-400 text-xs font-bold uppercase tracking-[0.2em]">Premium Verify</p><h1 className="text-3xl font-black mt-1">Administrator portal</h1><p className="text-slate-400 text-sm mt-1">Live platform financial, customer, payment, and fulfillment monitoring.</p></div>
          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2.5 font-bold text-sm"><RefreshCw className="w-4 h-4" />Refresh live data</button>
        </header>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-100 p-4 text-sm">{error}</div>}
        {data.schema_notice && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-100 p-4 text-sm flex gap-3"><AlertTriangle className="w-5 h-5 shrink-0" />{data.schema_notice}</div>}

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(([label, value, description], index) => <div key={label as string} className={`rounded-2xl p-5 border ${index === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}><p className="text-sm text-slate-400">{label}</p><p className="text-2xl font-black mt-2">{xaf(value as number)}</p><p className="text-xs text-slate-500 mt-2">{description}</p></div>)}
        </section>

        <section className="grid lg:grid-cols-[1fr_.9fr] gap-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><div className="flex items-center justify-between"><div><h2 className="font-extrabold">7-day activity</h2><p className="text-xs text-slate-400 mt-1">Completed service sales, wallet deposits, and submitted orders.</p></div><ClipboardList className="w-5 h-5 text-sky-400" /></div><div className="mt-5 space-y-3">{data.analytics.map((day) => <div key={day.date} className="grid grid-cols-[70px_1fr_1fr_55px] gap-3 text-xs items-center"><span className="text-slate-400">{day.date.slice(5)}</span><span className="text-emerald-300">Sales {xaf(day.sales_xaf)}</span><span className="text-orange-300">Cash {xaf(day.deposits_xaf)}</span><span className="text-right text-slate-300">{day.orders} orders</span></div>)}</div></div>
          {settings && <form onSubmit={saveSettings} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3"><div><h2 className="font-extrabold">Public contact & pricing</h2><p className="text-xs text-slate-400 mt-1">Changes update the footer and WhatsApp button across the public site.</p></div><input required aria-label="Official support email" value={settings.support_email} onChange={(event) => setSettings({ ...settings, support_email: event.target.value })} placeholder="Official support email" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm" /><input required aria-label="Support phone" value={settings.support_phone} onChange={(event) => setSettings({ ...settings, support_phone: event.target.value })} placeholder="Support phone" className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm" /><input required aria-label="WhatsApp number" value={settings.whatsapp_number} onChange={(event) => setSettings({ ...settings, whatsapp_number: event.target.value })} placeholder="WhatsApp digits e.g. 2376..." className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm" /><div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">SMM multiplier<input required type="number" min="1" max="10" step="0.1" value={settings.smm_markup_multiplier} onChange={(event) => setSettings({ ...settings, smm_markup_multiplier: Number(event.target.value) })} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" /></label><label className="text-xs text-slate-400">SMS multiplier<input required type="number" min="1" max="10" step="0.1" value={settings.sms_markup_multiplier} onChange={(event) => setSettings({ ...settings, sms_markup_multiplier: Number(event.target.value) })} className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white" /></label></div><p className="text-[11px] text-amber-200">At 3×, a $2 provider service is sold for $6 before any rounding.</p><button disabled={saving} className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-60 rounded-lg py-3 font-bold text-sm">{saving ? 'Saving…' : 'Save contact & price rules'}</button></form>}
        </section>

        <section className="grid lg:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><Banknote className="text-orange-400 w-5 h-5" /><p className="text-2xl font-black mt-3">{xaf(data.metrics.pending_payments_xaf)}</p><p className="text-sm text-slate-400">{data.metrics.pending_payments_count} pending payment(s)</p></div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><ClipboardList className="text-sky-400 w-5 h-5" /><p className="text-2xl font-black mt-3">{data.metrics.active_smm_orders}</p><p className="text-sm text-slate-400">SMM orders pending provider completion</p></div>
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5"><Users className="text-violet-400 w-5 h-5" /><p className="text-2xl font-black mt-3">{data.metrics.customers}</p><p className="text-sm text-slate-400">Registered customer profiles</p></div>
        </section>

        <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"><div className="p-5 border-b border-slate-800"><h2 className="font-extrabold">Manual mobile-money review</h2><p className="text-xs text-slate-400 mt-1">Confirm only after matching the amount and reference in your MTN/Orange account. Confirmation creates one completed wallet deposit; claims do not credit a wallet by themselves.</p></div><div className="overflow-x-auto"><table className="w-full min-w-180 text-sm"><thead className="text-left text-xs uppercase text-slate-400 bg-slate-800/50"><tr><th className="p-3">Customer</th><th className="p-3">Method</th><th className="p-3">Amount</th><th className="p-3">Payer / reference</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{data.manual_claims.map((claim) => <tr key={claim.id} className="border-t border-slate-800"><td className="p-3">{profileById.get(claim.profile_id)?.full_name || profileById.get(claim.profile_id)?.email || 'Unknown'}</td><td className="p-3">{claim.payment_method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'}</td><td className="p-3 font-bold">{xaf(claim.amount_xaf)}</td><td className="p-3 text-xs"><p>{claim.payer_phone || 'No payer phone'}</p><p className="font-mono text-slate-400">{claim.transfer_reference}</p></td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${badge(claim.status)}`}>{claim.status}</span></td><td className="p-3">{claim.status === 'pending' ? <div className="flex gap-2"><button disabled={reviewingClaim === claim.id} onClick={() => void reviewManualPayment(claim.id, 'confirm')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold">Confirm</button><button disabled={reviewingClaim === claim.id} onClick={() => void reviewManualPayment(claim.id, 'reject')} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold">Reject</button></div> : <span className="text-xs text-slate-500">Reviewed</span>}</td></tr>)}</tbody></table>{data.manual_claims.length === 0 && <p className="p-5 text-sm text-slate-400">No manual payments awaiting review.</p>}</div></section>

        <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h2 className="font-extrabold">Live provider catalogue</h2><p className="text-xs text-slate-400 mt-1">Pull the current JAP services, limits, and supplier rates into Supabase. Customer prices use your SMM multiplier, and checkout verifies JAP again immediately before charging.</p></div>
          <button type="button" onClick={() => void syncCatalogue()} disabled={syncingCatalog} className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-4 py-3 font-bold text-sm"><RefreshCw className={`w-4 h-4 ${syncingCatalog ? 'animate-spin' : ''}`} />{syncingCatalog ? 'Syncing catalogue…' : 'Sync JAP catalogue'}</button>
        </section>

        <section className="grid lg:grid-cols-[1.2fr_.8fr] gap-6">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"><div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-3 justify-between"><div><h2 className="font-extrabold">Transaction ledger</h2><p className="text-xs text-slate-400 mt-1">Verified and failed wallet transactions. No browser action can credit these records.</p></div><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search reference or customer" className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-orange-400" /></div><div className="overflow-x-auto"><table className="w-full min-w-180 text-sm"><thead className="text-left text-xs uppercase text-slate-400 bg-slate-800/50"><tr><th className="p-3">Reference</th><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead><tbody>{matchingTransactions.slice(0, 100).map((transaction) => <tr key={transaction.id} className="border-t border-slate-800"><td className="p-3 font-mono text-xs">{transaction.reference}</td><td className="p-3">{profileById.get(transaction.profile_id)?.email || 'Unknown'}</td><td className="p-3 capitalize">{transaction.type.replace('_', ' ')}</td><td className="p-3 font-bold">{xaf(transaction.amount)}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${badge(transaction.status)}`}>{transaction.status}</span></td><td className="p-3 text-xs text-slate-400">{when(transaction.created_at)}</td></tr>)}</tbody></table></div></div>

          <form onSubmit={addExpense} className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4 h-fit"><div><h2 className="font-extrabold">Record a platform expense</h2><p className="text-xs text-slate-400 mt-1">Add JAP/5SIM costs, Payunit fees, or business expenses. This makes profit real rather than estimated.</p></div><select value={expense.kind} onChange={(event) => setExpense({ ...expense, kind: event.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm"><option value="provider_cost">Provider cost</option><option value="payment_fee">Payment fee</option><option value="operating_expense">Operating expense</option><option value="adjustment">Adjustment</option></select><input required type="number" min="1" placeholder="Amount (XAF)" value={expense.amount_xaf} onChange={(event) => setExpense({ ...expense, amount_xaf: event.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm" /><input required placeholder="Description" value={expense.description} onChange={(event) => setExpense({ ...expense, description: event.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm" /><input placeholder="Reference (optional)" value={expense.reference} onChange={(event) => setExpense({ ...expense, reference: event.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm" /><button disabled={saving} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-60 rounded-lg py-3 font-bold text-sm">{saving ? 'Saving…' : 'Record expense'}</button></form>
        </section>

        <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"><div className="p-5 border-b border-slate-800"><h2 className="font-extrabold">Fulfilment monitor</h2><p className="text-xs text-slate-400 mt-1">Monitor provider delivery across social-media and temporary-number orders.</p></div><div className="overflow-x-auto"><table className="w-full min-w-180 text-sm"><thead className="text-left text-xs uppercase text-slate-400 bg-slate-800/50"><tr><th className="p-3">Type</th><th className="p-3">Customer</th><th className="p-3">Service</th><th className="p-3">Value</th><th className="p-3">Progress</th><th className="p-3">Status</th><th className="p-3">Created</th></tr></thead><tbody>{[...data.smm_orders.map((order) => ({ ...order, type: 'SMM', value: order.charge_xaf, progress: order.remains ? `${order.remains} remaining` : 'Complete' })), ...data.sms_orders.map((order) => ({ ...order, type: 'SMS', value: order.price_xaf, progress: order.status === 'received' ? 'Code received' : 'Awaiting SMS' })), ...data.account_orders.map((order) => ({ ...order, type: 'Account', service_name: order.item_title, value: order.price_xaf, progress: 'Delivery order' }))].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100).map((order) => <tr key={`${order.type}-${order.id}`} className="border-t border-slate-800"><td className="p-3 font-bold text-sky-300">{order.type}</td><td className="p-3">{profileById.get(order.profile_id)?.email || 'Unknown'}</td><td className="p-3 max-w-80 truncate">{order.service_name}</td><td className="p-3 font-bold">{xaf(order.value)}</td><td className="p-3 text-xs text-slate-400">{order.progress}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${badge(order.status)}`}>{order.status}</span></td><td className="p-3 text-xs text-slate-400">{when(order.created_at)}</td></tr>)}</tbody></table></div></section>

        <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden"><div className="p-5 border-b border-slate-800"><h2 className="font-extrabold">Customers & administrator access</h2><p className="text-xs text-slate-400 mt-1">Promote trusted staff only. Access is enforced server-side on every administrator API request.</p></div><div className="overflow-x-auto"><table className="w-full min-w-180 text-sm"><thead className="text-left text-xs uppercase text-slate-400 bg-slate-800/50"><tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Wallet</th><th className="p-3">Joined</th><th className="p-3">Role</th></tr></thead><tbody>{data.profiles.map((profile) => <tr key={profile.id} className="border-t border-slate-800"><td className="p-3"><p className="font-semibold">{profile.full_name || 'Unnamed customer'}</p><p className="text-xs text-slate-400">{profile.email}</p></td><td className="p-3 text-slate-300">{profile.phone_number || '—'}</td><td className="p-3 font-bold">{xaf(profile.balance_xaf)}</td><td className="p-3 text-xs text-slate-400">{when(profile.created_at)}</td><td className="p-3"><select aria-label={`Role for ${profile.email}`} value={profile.role} onChange={(event) => void changeRole(profile.id, event.target.value as 'admin' | 'client')} className="rounded-lg bg-slate-800 border border-slate-700 p-2 text-xs"><option value="client">Client</option><option value="admin">Admin</option></select></td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  )
}
