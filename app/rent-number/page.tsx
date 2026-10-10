'use client'

import Link from 'next/link'
import { Clock3, ShieldCheck } from 'lucide-react'

export default function RentNumberPage() {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"><Clock3 className="mx-auto h-10 w-10 text-orange-500" /><h1 className="mt-4 text-2xl font-extrabold text-gray-900">Long-term number rental is coming soon</h1><p className="mt-3 text-sm leading-6 text-gray-600">This service remains unavailable until a real long-term-number provider is connected. We will never generate a fake number or charge your wallet for an unfulfilled rental.</p><div className="mt-6"><Link href="/sms-verification" className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white">Use temporary SMS verification</Link></div><p className="mt-5 inline-flex items-center gap-2 text-xs text-emerald-700"><ShieldCheck className="h-4 w-4" />Only verified, deliverable services are enabled.</p></section>
}
