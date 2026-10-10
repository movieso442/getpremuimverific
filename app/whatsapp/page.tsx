'use client'

import { CheckCircle2, Copy, MessageSquare, Shield } from 'lucide-react'
import { useState } from 'react'

export default function WhatsAppBotPage() {
  const [copied, setCopied] = useState(false)
  const webhookUrl = typeof window === 'undefined' ? 'https://premiumverific.com/api/whatsapp/webhook' : `${window.location.origin}/api/whatsapp/webhook`
  const copy = () => { navigator.clipboard.writeText(webhookUrl); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
  return <div className="mx-auto max-w-3xl space-y-6"><section className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm"><div className="flex items-center gap-3"><MessageSquare className="h-8 w-8 text-emerald-600" /><div><h1 className="text-2xl font-extrabold">WhatsApp bot connection</h1><p className="text-sm text-gray-600">Real messages are handled only through Meta&apos;s signed webhook.</p></div></div><div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4"><p className="text-xs font-bold uppercase text-gray-500">Webhook callback URL</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-sm">{webhookUrl}</code><button onClick={copy} className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white"><Copy className="inline h-4 w-4" /> {copied ? 'Copied' : 'Copy'}</button></div></div><div className="mt-6 grid gap-3 text-sm text-gray-700"><p className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />Bot customers are created from the verified WhatsApp sender number and displayed profile name.</p><p className="flex gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />Temporary-number catalogues and reservations use the live provider; delivered OTP codes are sent back to the originating bot customer.</p><p className="flex gap-2"><Shield className="h-5 w-5 shrink-0 text-emerald-600" />The old on-page simulator has been removed: it used a placeholder phone number and could create misleading records.</p></div></section></div>
}
