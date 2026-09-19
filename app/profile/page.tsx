'use client'

import React, { useState } from 'react'
import { User, Mail, Phone, Lock, Save, ShieldCheck, DollarSign } from 'lucide-react'
import { useAppState } from '@/lib/store'

export default function ProfilePage() {
  const { profile } = useAppState()
  const [fullName, setFullName] = useState(profile.full_name || 'Premium Verify Partner')
  const [phone, setPhone] = useState(profile.phone_number || '+237680209047')
  const [currency, setCurrency] = useState(profile.currency || 'XAF')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2500)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900">Profile & Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal account details, contact info, and default currency.
        </p>
      </div>

      <div className="agoverify-card p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-[#ff6b00] border border-orange-200 flex items-center justify-center text-2xl font-bold">
            {fullName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
            <p className="text-xs text-gray-500">{profile.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-orange-50 text-[#ea580c] text-[10px] font-bold uppercase">
              Role: {profile.role}
            </span>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-[#ea580c] text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Profile preferences updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-3 px-4 text-gray-900 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-500 text-sm outline-none cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
              Phone Number / WhatsApp Contact
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-3 px-4 text-gray-900 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
              Default Currency Display
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-3 px-4 text-gray-900 text-sm outline-none"
            >
              <option value="XAF">XAF (FCFA)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] text-white font-extrabold transition shadow-xs flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Preferences</span>
          </button>
        </form>
      </div>
    </div>
  )
}
