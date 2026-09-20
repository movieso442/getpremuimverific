'use client'

import React, { useState } from 'react'
import { useAppState } from '@/lib/store'
import { SMM_SERVICES } from '@/lib/mockData'
import confetti from 'canvas-confetti'

export default function MassOrderPage() {
  const { createSmmOrder } = useAppState()
  const [massText, setMassText] = useState('')
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMsg(null)
    if (!massText.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter order details in format: service_id | link | quantity' })
      return
    }

    const lines = massText.trim().split('\n')
    let successCount = 0

    lines.forEach((line) => {
      const parts = line.split('|')
      if (parts.length >= 3) {
        const srvId = parseInt(parts[0].trim(), 10)
        const link = parts[1].trim()
        const qty = parseInt(parts[2].trim(), 10)
        const srv = SMM_SERVICES.find(s => s.id === srvId)

        if (srv && link && qty > 0) {
          const cost = Math.ceil((srv.rate * qty) / 1000)
          createSmmOrder(srv.id, srv.name, srv.category, link, qty, cost)
          successCount++
        }
      }
    })

    if (successCount > 0) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
      setStatusMsg({ type: 'success', text: `Successfully placed ${successCount} mass orders! View status in Orders tab.` })
      setMassText('')
    } else {
      setStatusMsg({ type: 'error', text: 'Could not parse orders. Format should be: service_id | link | quantity' })
    }
  }

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-semibold ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#f8fafc] rounded-2xl border border-gray-200/80 p-4">
          <textarea
            rows={12}
            value={massText}
            onChange={(e) => setMassText(e.target.value)}
            placeholder="service_id | link | quantity"
            className="w-full bg-transparent text-gray-800 font-mono text-sm outline-none placeholder-gray-400 resize-y"
          />
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center"
        >
          <span>SUBMIT</span>
        </button>
      </form>
    </div>
  )
}
