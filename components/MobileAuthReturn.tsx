'use client'
import { useEffect, useRef, useState } from 'react'
import { mobileReturnUrl } from '@/lib/auth/flows'

export default function MobileAuthReturn() {
  const [destination, setDestination] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const processed = useRef<{ destination: string | null } | null>(null)
  useEffect(() => {
    const result = processed.current ? processed.current.destination : window.location.hash ? null : mobileReturnUrl(window.location.search)
    processed.current = { destination: result }
    // Remove the one-use code from visible history before any navigation.
    window.history.replaceState(null, '', '/auth/mobile-callback')
    let active = true
    void Promise.resolve().then(() => {
      if (!active) return
      setDestination(result); setChecked(true)
      if (result) window.location.replace(result)
    })
    return () => { active = false }
  }, [])
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12"><section className="w-full space-y-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
    <h1 className="text-2xl font-black">Return to premiumverific</h1>
    <p role="status" className="text-slate-600">{!checked ? 'Preparing your app sign-in…' : destination ? 'Continue in the app to finish signing in. If it did not open automatically, tap below.' : 'This app sign-in link is incomplete or expired. Return to the app and start sign-in again.'}</p>
    {destination && <a href={destination} className="block rounded-xl bg-orange-700 p-4 text-center font-bold text-white">Open premiumverific app</a>}
    <p className="text-sm text-slate-500">If you opened an email on another device, confirm the address and then sign in on your phone. This page does not sign you into the website.</p>
  </section></main>
}
