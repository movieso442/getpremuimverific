'use client'

import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'

export const JapFooter: React.FC = () => {
  return (
    <footer className="bg-[#f4f7fa] border-t border-gray-200 mt-12 py-8 px-6 text-xs text-gray-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        <BrandLogo />

        {/* Legal & Policy Navigation Links */}
        <div className="flex flex-wrap items-center gap-6 font-semibold text-gray-600">
          <Link href="/privacy" className="hover:text-[#ff5722] transition">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#ff5722] transition">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-[#ff5722] transition">Refund Policy</Link>
          <a href="https://wa.me/237677034736" target="_blank" rel="noreferrer" className="hover:text-[#ff5722] transition">Support WhatsApp</a>
        </div>

        {/* Copyright */}
        <div className="text-gray-400 font-medium text-[11px]">
          © Copyright PV (Premium Verific). All Rights Reserved.
        </div>

      </div>
    </footer>
  )
}
