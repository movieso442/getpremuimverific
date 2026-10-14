'use client'

import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'
import { MessageCircle } from 'lucide-react'
import { usePlatformSettings } from '@/lib/platform/usePlatformSettings'

export const PublicFooter: React.FC = () => {
  const settings = usePlatformSettings()
  return (
    <footer className="bg-white border-t border-gray-100 text-sm text-gray-600 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <BrandLogo />
            <p className="text-xs text-gray-500 leading-relaxed">
              Automated virtual SMS numbers across 197 countries and high quality social media growth services.
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-gray-900 text-sm">Services & Features</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="/virtual-numbers" className="hover:text-[#ff5722] transition">SMS Virtual Numbers</Link></li>
              <li><Link href="/sms-verification-guide" className="hover:text-[#ff5722] transition">SMS verification guide</Link></li>
              <li><Link href="/social-media-growth" className="hover:text-[#ff5722] transition">Social media services</Link></li>
              <li><Link href="/whatsapp" className="hover:text-[#ff5722] transition">WhatsApp Assistant Bot</Link></li>
              <li><Link href="/downloads" className="hover:text-[#ff5722] transition">Download our App</Link></li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-gray-900 text-sm">Legal & Compliance</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacy" className="hover:text-[#ff5722] transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-[#ff5722] transition">Terms of Service</Link></li>
              <li><Link href="/refund-policy" className="hover:text-[#ff5722] transition">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-gray-900 text-sm">Customer Support</h3>
            <div className="text-xs space-y-2">
              <div>Email: <strong className="text-gray-900">{settings.support_email}</strong></div>
              <div>WhatsApp Support: <strong className="text-gray-900">{settings.support_phone}</strong></div>
              <a
                href={`https://wa.me/${settings.whatsapp_number}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition mt-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-100 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <div>© {new Date().getFullYear()} Premium Verific. All Rights Reserved.</div>
          <div className="flex items-center gap-6 font-medium">
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/refund-policy" className="hover:text-gray-600">Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
