'use client'

import { Code2, ShieldCheck } from 'lucide-react'

export default function DeveloperPage() {
  return <section className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"><Code2 className="mx-auto h-10 w-10 text-orange-500" /><h1 className="mt-4 text-2xl font-extrabold text-gray-900">Developer API access is not enabled yet</h1><p className="mt-3 text-sm leading-6 text-gray-600">API keys and outbound webhooks are hidden until server-side key authentication, rate limits, delivery signatures, and audit logs are complete. This prevents issuing keys that cannot safely authorize real purchases.</p><p className="mt-5 inline-flex items-center gap-2 text-xs text-emerald-700"><ShieldCheck className="h-4 w-4" />No simulated API keys or webhooks are created.</p></section>
}
