'use client'

import React, { useState } from 'react'
import { MessageSquare, Plus, Send } from 'lucide-react'

export default function TicketsPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [tickets, setTickets] = useState([
    { id: 401, subject: 'Speed inquiry for YouTube watch hours order #101284', status: 'Answered', date: '2026-09-14' },
    { id: 402, subject: 'UK Phone Number SMS delivery confirmation', status: 'Pending', date: '2026-09-14' }
  ])

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) return
    const newT = {
      id: Math.floor(100 + Math.random() * 900),
      subject,
      status: 'Open',
      date: new Date().toISOString().split('T')[0]
    }
    setTickets([newT, ...tickets])
    setSubject('')
    setMessage('')
    alert('Ticket submitted successfully! Response within 15 minutes.')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Create Ticket Form */}
        <form onSubmit={handleCreateTicket} className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4 shadow-2xs">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#ff5722]" />
            <span>Open a Support Ticket</span>
          </h2>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400 block mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Order #101284 speed inquiry"
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs font-semibold text-gray-800 outline-none focus:border-[#ff5722]"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400 block mb-1">Message</label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or order inquiry..."
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-xs text-gray-800 outline-none focus:border-[#ff5722]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-xs uppercase shadow-sm transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Submit Ticket</span>
          </button>
        </form>

        {/* WhatsApp direct support sidebar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900">Direct WhatsApp Support</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Need urgent assistance? Contact our live support agent directly on WhatsApp for instant resolution.
          </p>

          <a
            href="https://wa.me/237680209047"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-xl bg-[#25d366] hover:bg-[#1ebd59] text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2"
          >
            <span>Chat on WhatsApp (+237)</span>
          </a>
        </div>

      </div>

      {/* Ticket History */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xs p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Your Support Tickets</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="font-bold text-gray-500 uppercase bg-[#f8fafc]">
              <tr>
                <th className="p-3">ID</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="p-3 font-mono font-bold text-gray-900">#{t.id}</td>
                  <td className="p-3 text-gray-800">{t.subject}</td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'Answered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
