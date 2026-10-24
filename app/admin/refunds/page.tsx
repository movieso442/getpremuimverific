'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, ShieldAlert, Wallet } from 'lucide-react'

type Customer = { id: string; email: string; full_name: string | null; balance_xaf: number }
type Refund = { id: string; profile_id: string; reason: string; state: string; approved_amount_xaf: number | null; review_note: string | null; created_at: string; customer?: Customer; transaction?: { reference: string; amount: number; type: string; payment_method: string } }
type Credit = { id: string; profile_id: string; amount_xaf: number; reason: string; created_at: string }
type Action = 'approve' | 'reject' | 'mark_paid' | 'reopen'
const money = (value?: number | null) => `${Number(value || 0).toLocaleString()} XAF`
const date = (value: string) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const input = 'mt-2 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-400'

export default function RefundsPage() {
  const [requests, setRequests] = useState<Refund[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [schemaReady, setSchemaReady] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Refund | null>(null)
  const [action, setAction] = useState<Action>('approve')
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  const [payoutReference, setPayoutReference] = useState('')
  const [verified, setVerified] = useState(false)
  const [creditCustomer, setCreditCustomer] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [creditConfirmed, setCreditConfirmed] = useState(false)
  const creditRequestId = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([fetch('/api/admin/refunds', { cache: 'no-store' }), fetch('/api/admin/wallet-credits', { cache: 'no-store' })])
    const [refundData, creditData] = await Promise.all([a.json(), b.json()])
    if (!a.ok) throw new Error(refundData.error || 'Could not load refunds.')
    if (!b.ok) throw new Error(creditData.error || 'Could not load customer wallets.')
    setRequests(refundData.requests || []); setCustomers(creditData.customers || [])
    setCredits(creditData.credits || []); setSchemaReady(Boolean(creditData.schema_ready))
  }, [])
  useEffect(() => { void load().catch(reason => setError(reason.message)) }, [load])

  function begin(request: Refund, next: Action) {
    setSelected(request); setAction(next); setNote(''); setAmount(String(request.approved_amount_xaf || request.transaction?.amount || ''))
    setPayoutReference(''); setVerified(false); setError(''); setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const response = await fetch('/api/admin/refunds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: selected.id, action, note, amount_xaf: action === 'approve' ? Number(amount) : null, payout_reference: action === 'mark_paid' ? payoutReference : null, verified }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Review failed.')
      setSelected(null); setSuccess(`Request updated to ${result.state}.`); await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Review failed.') }
    finally { setBusy(false) }
  }

  async function submitCredit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    const requestId = creditRequestId.current || crypto.randomUUID()
    creditRequestId.current = requestId
    try {
      const response = await fetch('/api/admin/wallet-credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ request_id: requestId, profile_id: creditCustomer, amount_xaf: Number(creditAmount), reason: creditReason, confirmed: creditConfirmed }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Credit failed.')
      setSuccess(`Credited ${money(Number(creditAmount))}. Ledger ID: ${result.transaction_id}`)
      setCreditCustomer(''); setCreditAmount(''); setCreditReason(''); setCreditConfirmed(false); creditRequestId.current = null; await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the ledger before retrying.') }
    finally { setBusy(false) }
  }

  const open = requests.filter(request => ['pending', 'held'].includes(request.state))
  return <main className="min-h-dvh bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-10"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6"><div><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-orange-300"><ArrowLeft size={16} /> Dashboard</Link><p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-orange-400">Customer care</p><h1 className="mt-1 text-3xl font-black sm:text-4xl">Refunds & wallet credits</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Review delivery evidence, return unused deposits to their original payment source, or issue an audited wallet credit.</p></div><button onClick={() => void load().catch(reason => setError(reason.message))} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm"><RefreshCw size={16} /> Refresh</button></header>
    {error && <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/70 p-4 text-sm text-red-100">{error}</div>}{success && <div role="status" className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-4 text-sm text-emerald-100">{success}</div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]"><section className="min-w-0 space-y-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Customer requests</h2><p className="text-sm text-slate-400">{open.length} need attention</p></div><div className="flex rounded-xl border border-slate-700 p-1 text-sm"><button onClick={() => setShowAll(false)} className={`rounded-lg px-3 py-2 ${!showAll ? 'bg-orange-600 font-bold' : ''}`}>Open</button><button onClick={() => setShowAll(true)} className={`rounded-lg px-3 py-2 ${showAll ? 'bg-orange-600 font-bold' : ''}`}>All</button></div></div>
      {(showAll ? requests : open).length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">No requests in this view.</div>}
      {(showAll ? requests : open).map(request => <article key={request.id} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-all font-bold">{request.customer?.full_name || request.customer?.email || 'Customer unavailable'}</p><p className="break-all text-sm text-slate-400">{request.customer?.email}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${request.state === 'pending' ? 'bg-amber-200 text-amber-950' : request.state === 'held' ? 'bg-blue-200 text-blue-950' : 'bg-slate-700'}`}>{request.state}</span></div><div className="mt-4 grid gap-3 rounded-xl bg-slate-950/80 p-4 text-sm sm:grid-cols-2"><div><p className="text-xs uppercase text-slate-500">Original transaction</p><p className="mt-1 break-all font-mono text-xs">{request.transaction?.reference || 'Unavailable'}</p><p className="mt-1 text-slate-400">{request.transaction?.type?.replaceAll('_', ' ')} · {request.transaction?.payment_method}</p></div><div><p className="text-xs uppercase text-slate-500">Original amount</p><p className="mt-1 text-xl font-black">{money(request.transaction?.amount)}</p><p className="text-xs text-slate-500">Requested {date(request.created_at)}</p></div></div><p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{request.reason}</p>{request.review_note && <p className="mt-3 rounded-lg border border-slate-700 p-3 text-xs text-slate-400">Last review: {request.review_note}</p>}<div className="mt-5 flex flex-wrap gap-2">{request.state === 'pending' && <button onClick={() => begin(request, 'approve')} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold">{request.transaction?.type === 'deposit' ? 'Reserve original-source return' : 'Approve wallet refund'}</button>}{request.state === 'held' && <button onClick={() => begin(request, 'mark_paid')} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold">Record settled payout</button>}{['pending', 'held'].includes(request.state) && <button onClick={() => begin(request, 'reject')} className="rounded-xl border border-red-500/50 px-4 py-2.5 text-sm text-red-200">{request.state === 'held' ? 'Release & decline' : 'Decline'}</button>}{request.state === 'rejected' && <button onClick={() => begin(request, 'reopen')} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm">Reopen</button>}</div></article>)}
    </section><aside className="min-w-0 space-y-5">
      {selected && <form onSubmit={submitReview} className="space-y-4 rounded-2xl border border-orange-500/40 bg-slate-900 p-5"><h2 className="text-xl font-bold">{action === 'approve' ? 'Review refund' : action === 'mark_paid' ? 'Record payout' : action === 'reject' ? 'Decline request' : 'Reopen request'}</h2><p className="break-all text-sm text-slate-400">{selected.customer?.email} · {selected.transaction?.reference}</p>{action === 'approve' && <label className="block text-sm font-semibold">Verified amount (XAF)<input type="number" required min="1" max={selected.transaction?.amount} step="1" value={amount} onChange={event => setAmount(event.target.value)} className={input} /></label>}{action === 'mark_paid' && <label className="block text-sm font-semibold">Settled original-source payout reference<input required minLength={6} maxLength={200} value={payoutReference} onChange={event => setPayoutReference(event.target.value)} className={input} /></label>}<label className="block text-sm font-semibold">Review evidence and reason<textarea required minLength={20} maxLength={2000} rows={4} value={note} onChange={event => setNote(event.target.value)} placeholder="Supplier outcome, payment ownership, prior refunds, relevant order ID…" className={input} /></label>{['approve', 'mark_paid'].includes(action) && <label className="flex items-start gap-3 rounded-xl border border-amber-600/30 bg-amber-950/30 p-3 text-xs text-amber-100"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} className="mt-0.5" />I verified supplier/payment records, ownership, and prior credits. A deposit return is marked paid only after external payout settles.</label>}<div className="flex gap-2"><button disabled={busy || (['approve', 'mark_paid'].includes(action) && !verified)} className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold disabled:opacity-40">{busy ? 'Working…' : 'Confirm action'}</button><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-600 px-4 py-3 text-sm">Cancel</button></div></form>}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2"><Wallet className="text-orange-400" size={21} /><h2 className="text-xl font-bold">Add wallet credit</h2></div><p className="mt-2 text-sm text-slate-400">For verified goodwill or exceptional corrections. This immediately increases spendable balance and creates an audit entry. It does not send money or cancel a supplier charge.</p>{!schemaReady && <p className="mt-3 rounded-lg bg-amber-950 p-3 text-xs text-amber-100">Apply admin-wallet-credit-upgrade.sql before using this form.</p>}<form onSubmit={submitCredit} className="mt-5 space-y-4"><label className="block text-sm font-semibold">Customer<select required value={creditCustomer} onChange={event => setCreditCustomer(event.target.value)} className={input}><option value="">Select customer</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.email} · {money(customer.balance_xaf)} wallet</option>)}</select></label><label className="block text-sm font-semibold">Amount (XAF)<input required type="number" min="1" max="1000000" step="1" value={creditAmount} onChange={event => setCreditAmount(event.target.value)} className={input} /></label><label className="block text-sm font-semibold">Verified reason<textarea required minLength={20} maxLength={2000} rows={3} value={creditReason} onChange={event => setCreditReason(event.target.value)} placeholder="Why is this credit owed? Include the order reference." className={input} /></label><label className="flex items-start gap-3 text-xs text-slate-300"><input type="checkbox" checked={creditConfirmed} onChange={event => setCreditConfirmed(event.target.checked)} className="mt-0.5" />I checked the customer, amount, previous credits, and supporting evidence.</label><button disabled={busy || !creditConfirmed || !schemaReady} className="w-full rounded-xl bg-orange-600 px-4 py-3 font-bold disabled:opacity-40">{busy ? 'Working…' : 'Credit customer wallet'}</button></form></section>
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-bold">Recent manual credits</h2><div className="mt-3 space-y-3">{credits.length === 0 && <p className="text-sm text-slate-500">No manual credits yet.</p>}{credits.map(credit => <div key={credit.id} className="border-t border-slate-800 pt-3 text-sm"><p className="font-bold">{money(credit.amount_xaf)} · {customers.find(customer => customer.id === credit.profile_id)?.email || credit.profile_id}</p><p className="mt-1 text-slate-400">{credit.reason}</p><p className="mt-1 text-xs text-slate-500">{date(credit.created_at)}</p></div>)}</div></section><p className="flex gap-2 text-xs text-slate-500"><ShieldAlert size={16} className="shrink-0" />A supplier 404 is not proof of non-delivery. Keep the refund pending until the account and activation are reconciled.</p>
    </aside></div>
  </div></main>
}
