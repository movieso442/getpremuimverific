'use client'

import React from 'react'
import Link from 'next/link'
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Legal & Compliance</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">Privacy Policy</h1>
        <p className="text-xs text-gray-500">
          Last updated: September 18, 2026 • Premium Verify Official Policy (premiumverific.com)
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-2xs space-y-8 text-xs text-gray-700 leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>1. Information We Collect</span>
          </h2>
          <p>
            At <strong>Premium Verify</strong> (getpremuimverific.vercel.app / premiumverific.com), we prioritize the confidentiality and protection of our users&apos; personal data. We collect minimal information necessary to deliver our services efficiently:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li><strong>Account Information:</strong> Email address, full name, phone number, and authentication tokens when creating an account or logging in via Google OAuth.</li>
            <li><strong>Payment Data:</strong> Financial transactions processed through our secure payment aggregators (Payunit, Stripe, Coinbase Commerce, Mobile Money). We do not store raw credit card numbers or Mobile Money PINs on our servers.</li>
            <li><strong>Service Data:</strong> API requests, SMS verification logs, virtual phone number allocations, and SMM order details submitted via our platform or automated WhatsApp Assistant.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>2. How We Use Your Information</span>
          </h2>
          <p>Your information is used strictly for legitimate operational purposes:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>To process wallet deposits and service orders (SMS numbers, social media growth, API access).</li>
            <li>To transmit SMS verification codes securely to your account dashboard or automated WhatsApp bot.</li>
            <li>To provide customer support and notify you of important account updates or service announcements.</li>
            <li>To detect and prevent fraudulent transactions, unauthorized bot activity, or abuse of platform APIs.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>3. Payment Gateway Security & Third Parties</span>
          </h2>
          <p>
            We partner with PCI-DSS compliant payment gateways, including <strong>Payunit</strong> (MTN MoMo, Orange Money, Credit Cards, PayPal), <strong>Stripe</strong>, and <strong>Coinbase Commerce</strong>. Your payment data is transmitted directly to payment providers via encrypted SSL/TLS endpoints. We never sell, rent, or lease user personal data to third-party marketers.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>4. Meta WhatsApp Cloud API Privacy</span>
          </h2>
          <p>
            When interacting with our <strong>WhatsApp Automated Bot Assistant</strong>, incoming messages are processed securely via Meta Graph API. Phone numbers and message content are used solely to fulfill requested bot commands (e.g., balance inquiries, Payunit deposit link generation, SMS virtual number delivery).
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-bold text-gray-900">5. Contact Our Data Protection Team</h2>
          <p className="text-gray-600">
            If you have questions regarding this Privacy Policy or wish to request data erasure, please contact us at:
          </p>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-medium space-y-1 text-gray-800">
            <div>Email: <strong className="text-emerald-700">hello@premiumverific.com</strong></div>
            <div>WhatsApp Official Support: <strong className="text-gray-900">+237 677034736</strong></div>
          </div>
        </section>

      </div>

    </div>
  )
}
