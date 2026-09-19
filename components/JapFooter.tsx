'use client'

import React from 'react'
import Link from 'next/link'
import { ThumbsUp } from 'lucide-react'

export const JapFooter: React.FC = () => {
  return (
    <footer className="bg-[#f4f7fa] border-t border-gray-200 mt-12 py-8 px-6 text-xs text-gray-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Thumbs up Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff5722] to-[#ff7a00] flex items-center justify-center text-white font-extrabold shadow-sm">
            <ThumbsUp className="w-5 h-5 fill-current stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black text-[#1e293b] tracking-tight">PV</span>
              <span className="text-xs font-bold text-gray-600 uppercase">Premium Verify</span>
            </div>
            <div className="text-[9px] font-extrabold text-[#ea580c] uppercase tracking-wider">WE LEAD. THEY FOLLOW</div>
          </div>
        </div>

        {/* Legal & Policy Navigation Links */}
        <div className="flex flex-wrap items-center gap-6 font-semibold text-gray-600">
          <Link href="/privacy" className="hover:text-[#ff5722] transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#ff5722] transition">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-[#ff5722] transition">Refund Policy</Link>
          <a href="https://wa.me/237680209047" target="_blank" rel="noreferrer" className="hover:text-[#ff5722] transition">Support WhatsApp</a>
        </div>

        {/* Copyright */}
        <div className="text-gray-400 font-medium text-[11px]">
          © Copyright PV (Premium Verify). All Rights Reserved.
        </div>

      </div>
    </footer>
  )
}
