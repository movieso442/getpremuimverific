'use client'

import Link from 'next/link'
import { ShieldCheck, Store } from 'lucide-react'

export default function AccountsPage() {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"><Store className="mx-auto h-10 w-10 text-orange-500" /><h1 className="mt-4 text-2xl font-extrabold text-gray-900">Account store is not available yet</h1><p className="mt-3 text-sm leading-6 text-gray-600">We do not list or deliver account products until a verified supplier, fulfillment process, and customer-protection policy are connected. No simulated credentials or charges are issued here.</p><div className="mt-6 flex justify-center gap-3"><Link href="/sms-verification" className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white">Get a temporary number</Link><Link href="/tickets" className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold text-gray-700">Contact support</Link></div><p className="mt-5 inline-flex items-center gap-2 text-xs text-emerald-700"><ShieldCheck className="h-4 w-4" />Safe launch mode: no fabricated account data.</p></section>
}
