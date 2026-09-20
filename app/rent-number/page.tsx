'use client'

import React, { useState } from 'react'
import { PhoneCall, Calendar, Check, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { COUNTRIES, CountryItem } from '@/lib/mockData'
import { useAppState } from '@/lib/store'

export default function RentNumberPage() {
  const router = useRouter()
  const { profile } = useAppState()
  const [selectedDuration, setSelectedDuration] = useState<'7' | '30' | '90'>('30')
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRIES[0])
  const [rentedNumbers, setRentedNumbers] = useState<any[]>([])
  const [showInsufficientBanner, setShowInsufficientBanner] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const rates: Record<string, number> = {
    '7': 3500,   // 7 Days: 3,500 XAF
    '30': 12000, // 30 Days: 12,000 XAF
    '90': 30000, // 90 Days: 30,000 XAF
  }

  const price = rates[selectedDuration]

  const handleRentSubmit = () => {
    setShowInsufficientBanner(false)
    setSuccessMsg(null)

    if (profile.balance_xaf < price) {
      setShowInsufficientBanner(true)
      // Redirect to top-up page with amount pre-filled
      setTimeout(() => {
        router.push(`/add-funds?amount=${price}&reason=insufficient_balance`)
      }, 1500)
      return
    }

    const prefixes: Record<string, string> = { US: '+1 (407)', GB: '+44 7911', CA: '+1 (604)', CM: '+237 677', NG: '+234 803' }
    const prefix = prefixes[selectedCountry.code] || '+1 (555)'
    const generatedPhone = `${prefix} ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`

    const newRent = {
      id: 'rent_' + Math.random().toString(36).substr(2, 8),
      phone: generatedPhone,
      country: selectedCountry.name,
      flag: selectedCountry.flag,
      duration: `${selectedDuration} Days`,
      expiresAt: new Date(Date.now() + Number(selectedDuration) * 86400 * 1000).toLocaleDateString(),
      status: 'Active'
    }

    setRentedNumbers([newRent, ...rentedNumbers])
    setSuccessMsg(`Successfully rented dedicated virtual number ${generatedPhone} for ${selectedDuration} days!`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Rent Long-Term Phone Numbers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Get dedicated long-term virtual phone numbers for receiving unlimited SMS verification codes over 7, 30, or 90 days.
        </p>
      </div>

      {/* In-App Insufficient Balance Banner */}
      {showInsufficientBanner && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-amber-900 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-sm block">Insufficient Balance ({profile.balance_xaf.toLocaleString()} XAF)</span>
              <span>You need {price.toLocaleString()} XAF to rent this line. Redirecting you to the Top Up page...</span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/add-funds?amount=${price}&reason=insufficient_balance`)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shrink-0 flex items-center gap-1 transition"
          >
            <span>Top Up Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-xs font-bold text-green-800">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rental Configuration Form */}
        <div className="lg:col-span-2 agoverify-card p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-[#ff6b00]" />
            <span>Select Rental Parameters</span>
          </h2>

          {/* Country Selection */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
              1. Dedicated Country Location
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
              {COUNTRIES.map(country => (
                <button
                  key={country.code}
                  onClick={() => setSelectedCountry(country)}
                  className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition ${
                    selectedCountry.code === country.code
                      ? 'bg-orange-50/60 border-[#ff6b00] text-gray-900'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{country.name}</div>
                    <div className="text-[10px] text-gray-500">{country.prefix}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rental Duration */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
              2. Rental Duration Period
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '7 Days', val: '7', cost: '3,500 XAF' },
                { label: '30 Days', val: '30', cost: '12,000 XAF', popular: true },
                { label: '90 Days', val: '90', cost: '30,000 XAF' },
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => setSelectedDuration(item.val as any)}
                  className={`p-4 rounded-xl border text-center relative transition ${
                    selectedDuration === item.val
                      ? 'bg-orange-50/60 border-[#ff6b00] text-gray-900'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {item.popular && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#ff6b00] text-white text-[9px] font-black">
                      BEST VALUE
                    </span>
                  )}
                  <div className="text-sm font-bold text-gray-900 mb-1">{item.label}</div>
                  <div className="text-xs text-[#ea580c] font-extrabold">{item.cost}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rental Benefits */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#ea580c]" />
              <span>Private dedicated line exclusively assigned to your account</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#ea580c]" />
              <span>Unlimited incoming SMS messages for all platforms</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#ea580c]" />
              <span>Auto-renewal options available before expiry</span>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleRentSubmit}
            className="w-full py-3.5 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] text-white font-extrabold transition shadow-md flex items-center justify-center gap-2"
          >
            <span>Rent Number for {price.toLocaleString()} XAF</span>
          </button>
        </div>

        {/* Rented Numbers Overview sidebar */}
        <div className="agoverify-card p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span>Your Rented Lines ({rentedNumbers.length})</span>
          </h2>

          {rentedNumbers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-xs">
              No long-term numbers currently rented. Select country and period to activate your dedicated number.
            </div>
          ) : (
            <div className="space-y-3">
              {rentedNumbers.map(item => (
                <div key={item.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-900">{item.flag} {item.country}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-sm font-mono font-bold text-[#ea580c]">
                    {item.phone}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Expires: {item.expiresAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
