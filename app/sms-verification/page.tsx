'use client'

import React, { useState } from 'react'
import { SMS_SERVICES, COUNTRIES } from '@/lib/mockData'
import { Smartphone, RefreshCw, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/lib/store'

export default function SmsVerificationPage() {
  const router = useRouter()
  const { profile, buySmsNumber } = useAppState()

  const [selectedService, setSelectedService] = useState(SMS_SERVICES[0])
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [activeNumber, setActiveNumber] = useState<{ number: string; code: string; status: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showInsufficientBanner, setShowInsufficientBanner] = useState(false)

  const handleGetNumber = () => {
    setShowInsufficientBanner(false)

    if (profile.balance_xaf < selectedService.price) {
      setShowInsufficientBanner(true)
      setTimeout(() => {
        router.push(`/add-funds?amount=${selectedService.price}&reason=insufficient_balance`)
      }, 1500)
      return
    }

    const createdOrder = buySmsNumber(
      selectedService.name,
      selectedService.id,
      selectedCountry.name,
      selectedCountry.code,
      selectedService.price
    )

    if (createdOrder) {
      setActiveNumber({
        number: createdOrder.phone_number,
        code: 'Waiting for SMS...',
        status: 'RECEIVING'
      })
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } })

      // Simulate SMS arrival in 5 seconds
      setTimeout(() => {
        const smsCode = Math.floor(100000 + Math.random() * 900000).toString()
        setActiveNumber({
          number: createdOrder.phone_number,
          code: smsCode,
          status: 'RECEIVED'
        })
      }, 5000)
    }
  }

  const handleCopy = () => {
    if (activeNumber) {
      navigator.clipboard.writeText(activeNumber.number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Insufficient Balance Banner */}
      {showInsufficientBanner && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-amber-900 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-sm block">Insufficient Balance ({profile.balance_xaf.toLocaleString()} XAF)</span>
              <span>You need {selectedService.price.toLocaleString()} XAF to request this SMS number. Redirecting to top up...</span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/add-funds?amount=${selectedService.price}&reason=insufficient_balance`)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shrink-0 flex items-center gap-1 transition"
          >
            <span>Top Up Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#ff5722]" />
            <span>Virtual SMS Activation (197+ Countries)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Get instant virtual phone numbers for WhatsApp, Telegram, TikTok, Facebook, Google & OpenAI verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Select Service */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">1. Select Target Platform</label>
            <select
              value={selectedService.id}
              onChange={(e) => {
                const s = SMS_SERVICES.find(srv => srv.id === e.target.value)
                if (s) setSelectedService(s)
              }}
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none focus:border-[#ff5722]"
            >
              {SMS_SERVICES.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} — {srv.price} XAF (${(srv.price/600).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Select Country */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">2. Select Country</label>
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const c = COUNTRIES.find(cnt => cnt.code === e.target.value)
                if (c) setSelectedCountry(c)
              }}
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none focus:border-[#ff5722]"
            >
              {COUNTRIES.map((cnt) => (
                <option key={cnt.code} value={cnt.code}>
                  {cnt.flag} {cnt.name} ({cnt.prefix})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGetNumber}
          className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-xs uppercase shadow-md transition flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          <span>GET VIRTUAL NUMBER ({selectedService.price} XAF)</span>
        </button>
      </div>

      {/* Number Status & Code Box */}
      {activeNumber && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900">Active Virtual Number Session</h3>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase">Assigned Phone Number</div>
              <div className="text-lg font-black text-gray-900 font-mono mt-0.5">{activeNumber.number}</div>
            </div>

            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-[#2563eb] text-white font-bold text-xs rounded-xl flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Number'}</span>
            </button>
          </div>

          <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase">Verification Code Status</div>
              <div className={`text-xl font-black font-mono mt-1 ${activeNumber.status === 'RECEIVED' ? 'text-green-600' : 'text-[#ea580c]'}`}>
                {activeNumber.code}
              </div>
            </div>

            {activeNumber.status === 'RECEIVING' && (
              <RefreshCw className="w-5 h-5 text-[#ea580c] animate-spin" />
            )}
          </div>
        </div>
      )}

    </div>
  )
}
