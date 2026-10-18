'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type RequestRow = { id: string; profile_id: string; platform: string; requirements: string; quantity: number; details: string; state: string; quote_xaf: number | null; supplier_id: string | null; supplier_reference: string | null; supplier_cost_amount: number | null; supplier_cost_currency: string | null; admin_note: string | null; created_at: string }

export default function AccountServiceReviews() {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const load = async () => {
    const response = await fetch('/api/admin/account-service-requests', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Could not load requests.')
    setRequests(result.requests || [])
  }
  useEffect(() => { void load().catch(reason => setError(reason.message)) }, [])
  const save = async (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(id); setError('')
    try {
      const response = await fetch('/api/admin/account-service-requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        id, state: fields.get('state'), supplier_id: fields.get('supplier_id') || null,
        quote_xaf: fields.get('quote_xaf') ? Number(fields.get('quote_xaf')) : null,
        supplier_reference: fields.get('supplier_reference') || null, note: fields.get('note'),
      }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save review.')
      await load()
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save review.') }
    finally { setBusy('') }
  }
  return <main className="min-h-dvh bg-slate-950 px-5 py-10 text-white"><div className="mx-auto max-w-5xl"><Link href="/admin" className="text-orange-300 underline">Back to administration</Link><h1 className="mt-4 text-3xl font-bold">Account-service requests</h1><p className="mt-2 text-slate-300">Customers see one service. Supplier selection, references and notes remain private. This review does not charge a wallet or buy from a supplier.</p>{error && <p role="alert" className="mt-5 rounded-xl bg-red-950 p-4">{error}</p>}<div className="mt-7 space-y-5">{requests.length === 0 && <p>No requests found, or the list has not loaded yet.</p>}{requests.map(item => <section key={item.id} className="rounded-2xl border border-slate-700 bg-slate-900 p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold capitalize">{item.platform} · {item.quantity} requested</h2><span className="text-orange-300">{item.state}</span></div><p className="mt-2 break-all text-xs text-slate-400">Request {item.id} · Customer profile {item.profile_id}</p><p className="mt-3">{item.requirements}</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{item.details}</p><form onSubmit={event => void save(event, item.id)} className="mt-5 grid gap-3 sm:grid-cols-2"><label>Review state<select name="state" defaultValue={item.state} className="mt-1 w-full rounded-lg bg-slate-800 p-3"><option value="pending">Pending</option><option value="reviewing">Reviewing</option><option value="quoted">Quoted</option><option value="resolved">Resolved enquiry</option><option value="declined">Declined</option><option value="cancelled">Cancelled</option></select></label><label>Private supplier<select name="supplier_id" defaultValue={item.supplier_id || ''} className="mt-1 w-full rounded-lg bg-slate-800 p-3"><option value="">Not selected</option><option value="beansms">BeanSMS</option><option value="other">Other</option></select></label><label>Indicative quote (XAF)<input name="quote_xaf" type="number" min="1" max="10000000" step="1" defaultValue={item.quote_xaf ?? ''} className="mt-1 w-full rounded-lg bg-slate-800 p-3" /></label><label>Private supplier reference<input name="supplier_reference" maxLength={200} defaultValue={item.supplier_reference || ''} className="mt-1 w-full rounded-lg bg-slate-800 p-3" /></label><label className="sm:col-span-2">Internal review note<textarea name="note" required minLength={10} maxLength={1000} defaultValue={item.admin_note || ''} className="mt-1 w-full rounded-lg bg-slate-800 p-3" /></label><button disabled={busy === item.id} className="rounded-xl bg-orange-700 p-3 font-bold disabled:opacity-50">{busy === item.id ? 'Saving…' : 'Save review'}</button></form></section>)}</div></div></main>
}
