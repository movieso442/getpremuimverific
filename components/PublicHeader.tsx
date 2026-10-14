'use client'

import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'
import { ArrowRight } from 'lucide-react'

export const PublicHeader: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-md bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" aria-label="Premium Verific home"><BrandLogo /></Link>

        {/* Public Navigation Links */}
        <nav aria-label="Public navigation" className="hidden xl:flex items-center gap-5 text-sm font-semibold text-gray-700">
          <Link href="/virtual-numbers" className="hover:text-[#ff5722] transition-colors">Virtual numbers</Link>
          <Link href="/social-media-growth" className="hover:text-[#ff5722] transition-colors">Social services</Link>
          <Link href="/downloads" className="hover:text-[#ff5722] transition-colors">Get the App</Link>
          <Link href="/privacy" className="hover:text-[#ff5722] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#ff5722] transition-colors">Terms of Service</Link>
          <Link href="/refunds" className="hover:text-[#ff5722] transition-colors">Refunds</Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/login"
            className="px-3 sm:px-5 min-h-11 flex items-center rounded-xl font-extrabold text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition"
          >
            Sign In
          </Link>
          <Link
            href="/sms-verification"
            className="hidden sm:flex px-6 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm shadow-md shadow-orange-500/20 hover:shadow-lg transition items-center gap-2"
          >
            <span>Get a Number</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </header>
  )
}
