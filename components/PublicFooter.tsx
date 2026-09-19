'use client'

import React from 'react'
import Link from 'next/link'
import { ThumbsUp, Shield, MessageCircle } from 'lucide-react'

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-100 text-sm text-gray-600 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff5722] to-[#ea580c] flex items-center justify-center text-white font-extrabold shadow-sm">
                <ThumbsUp className="w-5 h-5 fill-current stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xl font-black text-gray-900">PV</span>
                <span className="text-xs font-bold text-gray-600 block uppercase">Premium Verify</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Automated virtual SMS numbers across 197 countries and high quality social media growth services.
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-gray-900 text-sm">Services & Features</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="/services" className="hover:text-[#ff5722] transition">SMS Virtual Numbers</Link></li>
              <li><Link href="/services" className="hover:text-[#ff5722] transition">SMM Panel Growth</Link></li>
              <li><Link href="/whatsapp" className="hover:text-[#ff5722] transition">WhatsApp Assistant Bot</Link></li>
              <li><Link href="/developer" className="hover:text-[#ff5722] transition">Developer API Docs</Link></li>
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
              <div>Email: <strong className="text-gray-900">hello@premiumverific.com</strong></div>
              <div>WhatsApp Support: <strong className="text-gray-900">+237 680209047</strong></div>
              <a
                href="https://wa.me/237680209047"
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
          <div>© {new Date().getFullYear()} Premium Verify. All Rights Reserved.</div>
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
