'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ThumbsUp,
  PlusSquare,
  List,
  RotateCw,
  Wallet,
  Ticket,
  Sliders,
  RefreshCw,
  Star,
  ChevronRight,
  Smartphone,
  PhoneCall,
  UserCheck,
  ShieldCheck,
  Bot,
  Code2,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { useAppState } from '@/lib/store'
import { AuthModal } from '@/components/AuthModal'

interface SidebarProps {
  onOpenDeposit: () => void
  mobile?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenDeposit, mobile = false }) => {
  const pathname = usePathname()
  const { profile } = useAppState()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // Primary JAP panel links matching exact screenshot menu
  const primaryLinks = [
    { label: 'New Order', href: '/dashboard', icon: PlusSquare },
    { label: 'Mass Order', href: '/massorder', icon: PlusSquare },
    { label: 'Orders', href: '/orders', icon: List },
    { label: 'Subscriptions', href: '/subscriptions', icon: RotateCw },
    { label: 'Add Funds', href: '/add-funds', icon: Wallet },
    { label: 'Tickets', href: '/tickets', icon: Ticket },
    { label: 'Services', href: '/services', icon: Sliders },
    { label: 'Updates', href: '/updates', icon: RefreshCw },
    { label: 'VIP Updates', href: '/vip-updates', icon: Star },
  ]

  // AgoVerify integrated services
  const agoVerifyLinks = [
    { label: 'SMS Numbers', href: '/sms-verification', icon: Smartphone, badge: '197+ Countries' },
    { label: 'Rent Number', href: '/rent-number', icon: PhoneCall, badge: 'Long Term' },
    { label: 'Accounts Store', href: '/accounts', icon: UserCheck, badge: 'TikTok/FB' },
    { label: 'FB Recovery', href: '/accounts#rescue', icon: ShieldCheck, badge: 'Recovery' },
  ]

  const extraLinks = [
    { label: 'Get the Mobile App', href: '/downloads', icon: Smartphone },
    { label: 'AI Growth Assistant', href: '/ai-assistant', icon: Bot },
    { label: 'Developer API', href: '/developer', icon: Code2 },
  ]

  return (
    <>
      <aside className={`${mobile ? 'w-full min-h-dvh' : 'w-64 sticky top-0 h-screen'} bg-white border-r border-gray-200 flex flex-col justify-between p-4 overflow-y-auto shrink-0 z-30 shadow-2xs`}>
        <div>
          
          {/* Brand Header: JAP style Thumbs Up Logo with Premium Verify */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff5722] to-[#ff7a00] flex items-center justify-center text-white font-extrabold shadow-md group-hover:scale-105 transition">
                <ThumbsUp className="w-5.5 h-5.5 fill-current stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-black text-[#ff5722] tracking-tighter">PV</span>
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-tight">Premium Verify</span>
                </div>
                <span className="text-[9px] font-black text-[#ea580c] uppercase tracking-widest block leading-none">
                  WE LEAD. THEY FOLLOW
                </span>
              </div>
            </Link>

            <button className="text-gray-400 hover:text-gray-600 transition" title="Toggle Sidebar">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Primary JAP Panel Navigation List */}
          <div className="space-y-1 mb-4">
            {primaryLinks.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href === '/dashboard' && (pathname === '/' || pathname === '/smm-panel'))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                    isActive
                      ? 'bg-[#fff5f2] text-[#ff5722] shadow-2xs'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {/* Left Orange Accent Line for Active state (matching JAP screenshot) */}
                  {isActive && (
                    <span className="absolute left-0 top-1 bottom-1 w-1 bg-[#ff5722] rounded-r-md" />
                  )}
                  
                  <div className={`p-1 rounded ${isActive ? 'bg-[#ff5722] text-white' : 'text-gray-500'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Section Divider: AgoVerify Services */}
          <div className="pt-3 border-t border-gray-100 mb-2">
            <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 mb-2">
              Virtual SMS & Store
            </div>
            <div className="space-y-1">
              {agoVerifyLinks.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-extrabold bg-orange-100 text-[#ea580c] px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Show More toggle */}
          {showMore && (
            <div className="pt-2 border-t border-gray-100 space-y-1">
              <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider px-3 mb-1">
                More Features
              </div>
              {extraLinks.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}

          <button
            onClick={() => setShowMore(!showMore)}
            className="w-full mt-3 py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center gap-1.5 transition border border-gray-200"
          >
            <span>{showMore ? 'Show Less' : 'Show More'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>

        </div>

        {/* Deposit & Sign In Footer */}
        <div className="pt-4 border-t border-gray-200 space-y-2 mt-4">
          <button
            onClick={onOpenDeposit}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ea580c] text-white font-extrabold text-xs shadow-sm hover:opacity-95 transition flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Deposit Funds (MoMo/USDT)</span>
          </button>

          <button
            onClick={() => setIsAuthOpen(true)}
            className="w-full py-2 px-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-400" />
            <span>Account / Sign In</span>
          </button>
        </div>
      </aside>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  )
}
