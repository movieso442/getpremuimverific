'use client'

import React from 'react'
import Link from 'next/link'
import { ThumbsUp, ArrowRight, ShieldCheck, Phone } from 'lucide-react'

export const PublicHeader: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#ff5722] to-[#ea580c] flex items-center justify-center text-white font-extrabold shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <ThumbsUp className="w-6 h-6 fill-current stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black text-gray-900 tracking-tight">PV</span>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Premium Verify</span>
            </div>
            <div className="text-[10px] font-extrabold text-[#ff5722] uppercase tracking-wider">WE LEAD. THEY FOLLOW</div>
          </div>
        </Link>

        {/* Public Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-700">
          <Link href="/services" className="hover:text-[#ff5722] transition-colors">Services Catalog</Link>
          <Link href="/privacy" className="hover:text-[#ff5722] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#ff5722] transition-colors">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-[#ff5722] transition-colors">Refund Policy</Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-xl font-extrabold text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm shadow-md shadow-orange-500/20 hover:shadow-lg transition flex items-center gap-2"
          >
            <span>Client Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </header>
  )
}
