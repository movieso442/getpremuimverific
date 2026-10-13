'use client'
import { FormEvent, useState } from 'react'

export default function SupportRequest({ recovery = false }: { recovery?: boolean }) {
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    if (recovery && fields.get('ownership') !== 'on') { setError('Please confirm this is your account or page.'); return }
    const message = [recovery ? 'Facebook recovery enquiry' : 'Account store enquiry', ...Array.from(fields.entries()).filter(([key]) => key !== 'ownership').map(([key, value]) => `${key}: ${String(value).trim()}`)].join('\n')
    window.location.assign(`https://wa.me/237677034736?text=${encodeURIComponent(message)}`)
  }
  return <section className="mx-auto max-w-2xl rounded-3xl border bg-white p-6 sm:p-8">
    <h1 className="text-3xl font-extrabold">{recovery ? 'Facebook recovery' : 'Account store'}</h1>
    <p className="mt-3 text-base leading-relaxed text-gray-600">{recovery ? 'Tell our support team about your own page or account. We can guide you through official recovery options; recovery is not guaranteed.' : 'Ask our team about available accounts, suitability, pricing and delivery before you pay. No wallet charge is made here.'}</p>
    <form onSubmit={submit} className="mt-6 space-y-5">
      {recovery ? <>
        <label className="block font-semibold">Page or profile name<input name="Page name" required maxLength={120} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block font-semibold">Page or profile link<input name="Page link" type="url" required maxLength={500} placeholder="https://www.facebook.com/..." className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block font-semibold">Contact email<input name="Contact email" type="email" required maxLength={120} className="mt-2 w-full rounded-xl border p-3" /></label>
      </> : <>
        <label className="block font-semibold">Platform<select name="Platform" className="mt-2 w-full rounded-xl border p-3"><option>Facebook</option><option>Instagram</option><option>TikTok</option><option>Other</option></select></label>
        <label className="block font-semibold">What do you need?<input name="Requirements" required maxLength={300} className="mt-2 w-full rounded-xl border p-3" /></label>
        <label className="block font-semibold">Quantity<input name="Quantity" type="number" min={1} max={100} defaultValue={1} required className="mt-2 w-full rounded-xl border p-3" /></label>
      </>}
      <label className="block font-semibold">{recovery ? 'What happened?' : 'Additional details'}<textarea name="Details" required maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border p-3" /></label>
      {recovery && <label className="flex items-start gap-3 text-base"><input name="ownership" type="checkbox" required className="mt-1 h-5 w-5 shrink-0" />This is my account/page, or I am authorised to manage it.</label>}
      <p className="text-base text-gray-600">Continuing opens WhatsApp with these details for customer support. Never send passwords, payment PINs or one-time codes.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button type="submit" className="w-full rounded-xl bg-emerald-700 px-4 py-4 text-lg font-bold text-white">Continue on WhatsApp</button>
    </form>
  </section>
}
