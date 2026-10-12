'use client'
import Link from 'next/link'
import { X, Wallet } from 'lucide-react'

export function DepositModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <section role="dialog" aria-modal="true" aria-label="Add wallet funds" className="relative w-full max-w-md rounded-2xl bg-white p-6">
      <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-2"><X size={20} /></button>
      <Wallet className="mb-3 text-orange-600" /><h2 className="text-xl font-bold">Add wallet funds</h2>
      <p className="my-4 text-sm text-gray-600">Choose MTN MoMo or Orange Money in your secure checkout, or submit a crypto deposit for verification. Minimum deposit: 3,000 XAF.</p>
      <Link href="/add-funds" onClick={onClose} className="block rounded-xl bg-orange-600 p-3 text-center font-bold text-white">Open wallet checkout</Link>
    </section>
  </div>
}
