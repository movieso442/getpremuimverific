'use client'

import React, { useState } from 'react'
import {
  Search,
  Settings,
  Sun,
  Moon,
  DollarSign,
  LogOut,
  Menu,
  RotateCw
} from 'lucide-react'
import { useAppState } from '@/lib/store'
import { AuthModal } from '@/components/AuthModal'

interface JapHeaderProps {
  onToggleSidebar?: () => void
  onOpenDeposit: () => void
}

export const JapHeader: React.FC<JapHeaderProps> = ({ onToggleSidebar, onOpenDeposit }) => {
  const { profile, smmOrders, smsOrders, accountOrders } = useAppState()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currency, setCurrency] = useState<'USD' | 'XAF'>('USD')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  // Balance calculation
  const balanceUsd = (profile.balance_xaf / 600).toFixed(3)
  const totalOrdersCount = (smmOrders?.length || 0) + (smsOrders?.length || 0) + (accountOrders?.length || 0)
  const displayName = profile.full_name || profile.email?.split('@')[0] || 'Guest'

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
      {/* Left items: Menu button & Badges */}
      <div className="flex items-center gap-3 flex-wrap">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition md:hidden"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Welcome Badge */}
        <div className="bg-[#f0f7ff] text-[#2563eb] text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xs">
          <span>Welcome:</span>
          <span className="font-bold text-[#1d4ed8]">
            {displayName}
          </span>
        </div>

        {/* Total Orders Badge */}
        <div className="bg-[#f0f7ff] text-[#2563eb] text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 shadow-2xs">
          <span>Total Orders:</span>
          <span className="font-bold text-[#1d4ed8]">{totalOrdersCount}</span>
        </div>

        {/* Current Balance Badge */}
        <div className="bg-[#f0f7ff] text-[#2563eb] text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-2 shadow-2xs">
          <span>Current Balance:</span>
          <span className="font-extrabold text-[#1d4ed8]">
            {currency === 'USD' ? `$${balanceUsd}` : `${profile.balance_xaf.toLocaleString()} XAF`}
          </span>
          <button
            onClick={onOpenDeposit}
            className="hover:rotate-180 transition-transform duration-300 text-[#2563eb]"
            title="Deposit Funds / Refresh"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right items: Search bar & Utilities */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative hidden lg:block w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-[#f8fafc] border border-gray-200 rounded-full py-1.5 px-4 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-[#2563eb] focus:bg-white transition"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-gray-500">
          <button
            onClick={() => alert('Settings: Account preferences and API keys in Profile tab.')}
            className="p-2 rounded-full hover:bg-gray-100 hover:text-gray-900 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-100 hover:text-gray-900 transition"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setCurrency(currency === 'USD' ? 'XAF' : 'USD')}
            className="p-2 rounded-full hover:bg-gray-100 hover:text-gray-900 transition font-bold text-xs"
            title="Switch Currency (USD / XAF)"
          >
            <DollarSign className="w-4 h-4 text-[#ea580c]" />
          </button>

          <button
            onClick={() => setIsAuthOpen(true)}
            className="p-2 rounded-full hover:bg-red-50 hover:text-red-600 transition"
            title="Login / Account"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  )
}
