import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function CardReturn() {
  // Neither the URL nor landing on this page is proof that money was received.
  return <main className="mx-auto max-w-lg px-5 py-16"><section className="space-y-5 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
    <ShieldCheck className="text-orange-600" size={40} />
    <h1 className="text-2xl font-black">Let’s check your payment</h1>
    <p className="text-gray-600">Your wallet updates only after we verify the payment. A completed or cancelled checkout page is not a payment receipt. Please don’t pay again while verification is pending.</p>
    <Link href="/add-funds" className="block rounded-xl bg-orange-600 p-4 text-center font-bold text-white">Return to my wallet</Link>
    <p className="text-sm text-gray-500">Using the Android app? Close this browser window and return to Wallet to check your payment.</p>
  </section></main>
}
