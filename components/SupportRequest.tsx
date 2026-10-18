'use client'
import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'

type AccountRequest = { id: string; platform: string; requirements: string; quantity: number; state: string; quote_xaf: number | null; created_at: string }

export default function SupportRequest({ recovery = false }: { recovery?: boolean }) {
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [requests, setRequests] = useState<AccountRequest[]>([])
  useEffect(() => {
    if (recovery) return
    let active = true
    void fetch('/api/account-service-requests', { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : { requests: [] })
      .then(result => { if (active) setRequests(result.requests || []) })
      .catch(() => undefined)
    return () => { active = false }
  }, [recovery])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    setError(''); setSaved('')
    const fields = new FormData(form)
    if (recovery && fields.get('ownership') !== 'on') { setError('Please confirm this is your account or page.'); return }
    if (recovery) {
      const message = ['Facebook recovery enquiry', ...Array.from(fields.entries()).filter(([key]) => key !== 'ownership').map(([key, value]) => `${key}: ${String(value).trim()}`)].join('\n')
      window.location.assign(`https://wa.me/237640796062?text=${encodeURIComponent(message)}`)
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/account-service-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        platform: fields.get('platform'), requirements: fields.get('requirements'), quantity: Number(fields.get('quantity')), details: fields.get('details'),
      }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not send the request.')
      setSaved(`Request ${result.id} received. We will review availability and price before any payment.`)
      form.reset()
      setRequests(current => [{ id: result.id, platform: String(fields.get('platform')), requirements: String(fields.get('requirements')), quantity: Number(fields.get('quantity')), state: 'pending', quote_xaf: null, created_at: new Date().toISOString() }, ...current])
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send the request.') }
    finally { setBusy(false) }
  }
  return <section className="mx-auto max-w-2xl rounded-3xl border bg-white p-6 sm:p-8">
    <h1 className="text-3xl font-extrabold">{recovery ? 'Facebook recovery' : 'Account store'}</h1>
    <p className="mt-3 text-base leading-relaxed text-gray-600">{recovery ? 'Tell our support team about your own page or account. We can guide you through official recovery options; recovery is not guaranteed.' : 'Tell us what you need. Our team checks availability, suitability and a quote before any purchase. Sending this request does not charge your wallet or guarantee delivery.'}</p>
    <form onSubmit={submit} className="mt-6 space-y-5">
      {recovery ? <>
        <label className="block font-semibold">Page or profile name<input name="Page name" required maxLength={120} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block font-semibold">Page or profile link<input name="Page link" type="url" required maxLength={500} placeholder="https://www.facebook.com/..." className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block font-semibold">Contact email<input name="Contact email" type="email" required maxLength={120} className="mt-2 w-full rounded-xl border p-3" /></label>
      </> : <>
        <label className="block font-semibold">Platform<select name="platform" className="mt-2 w-full rounded-xl border p-3"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="other">Other</option></select></label>
        <label className="block font-semibold">What do you need?<input name="requirements" required minLength={10} maxLength={300} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block font-semibold">Quantity<input name="quantity" type="number" min={1} max={100} defaultValue={1} required className="mt-2 w-full rounded-xl border p-3" /></label>
      </>}
      <label className="block font-semibold">{recovery ? 'What happened?' : 'Additional details'}<textarea name={recovery ? 'Details' : 'details'} required minLength={recovery ? undefined : 10} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border p-3" /></label>
      {recovery && <label className="flex items-start gap-3 text-base"><input name="ownership" type="checkbox" required className="mt-1 h-5 w-5 shrink-0" />This is my account/page, or I am authorised to manage it.</label>}
      <p className="text-base text-gray-600">{recovery ? 'Continuing opens WhatsApp with these details for customer support.' : 'Sign in to send this request privately. Our team will contact you after review.'} Never send passwords, payment PINs or one-time codes.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {saved && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-800">{saved}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-700 px-4 py-4 text-lg font-bold text-white disabled:opacity-50">{recovery ? 'Continue on WhatsApp' : busy ? 'Sending…' : 'Send request for review'}</button>
    </form>
    {!recovery && <div className="mt-8 border-t pt-6"><h2 className="text-xl font-bold">Your requests</h2>{requests.length ? <ul className="mt-3 space-y-3">{requests.map(item => <li key={item.id} className="rounded-xl border p-3"><span className="font-semibold capitalize">{item.platform}</span> · {item.quantity} · {item.state}<p className="mt-1 text-sm text-gray-600">{item.requirements}</p>{item.quote_xaf != null && <p className="text-sm font-semibold">Indicative quote: {Number(item.quote_xaf).toLocaleString()} XAF. Do not pay until confirmed by support.</p>}</li>)}</ul> : <p className="mt-2 text-gray-600">No requests yet. <Link href="/login" className="text-orange-700 underline">Sign in</Link> to see requests from your account.</p>}</div>}
  </section>
}
