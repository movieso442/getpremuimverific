'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Shield, AlertTriangle, CheckCircle2, Scale } from 'lucide-react'

export default function TermsOfServicePage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-[#ff5722] font-extrabold text-xs uppercase tracking-wider">
          <Scale className="w-4 h-4" />
          <span>Terms & Platform Agreement</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">Terms of Service</h1>
        <p className="text-xs text-gray-500">
          Last updated: September 18, 2026 • Premium Verify Official Policy (premiumverific.com)
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-2xs space-y-8 text-xs text-gray-700 leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#ff5722]" />
            <span>1. Acceptance of Terms</span>
          </h2>
          <p>
            By creating an account, accessing, or placing orders on <strong>Premium Verify</strong> (premiumverific.com / getpremuimverific.vercel.app), or interacting with our automated WhatsApp Assistant, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must discontinue platform usage immediately.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#ff5722]" />
            <span>2. Account & Wallet Balance Rules</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li><strong>Account Security:</strong> You are responsible for safeguarding your login credentials and for activity performed through your account.</li>
            <li><strong>Wallet Deposits:</strong> Wallet deposits are initiated through Payunit&apos;s hosted checkout. A balance is credited only after our server verifies the exact Payunit amount and transaction reference.</li>
            <li><strong>Non-Transferable Balance:</strong> Wallet funds are non-transferable between separate accounts.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#ff5722]" />
            <span>3. Service SLA & Delivery Policies</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li><strong>SMS Virtual Verification:</strong> Virtual phone numbers are allocated for single-use SMS verification. Availability, delivery time, and any provider cancellation are shown on the order; no long-term rental is currently sold.</li>
            <li><strong>SMM Panel Orders:</strong> Delivery times for social media growth services (followers, views, likes) depend on provider node speeds. Instant speed estimates are non-binding guarantees.</li>
            <li><strong>Acceptable Use:</strong> You agree not to use virtual numbers or services for illegal activities, harassment, spamming, or fraudulent account generation.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#ff5722]" />
            <span>4. Platform Availability</span>
          </h2>
          <p>
            Customer-facing developer API keys, outbound webhooks, account-store products, and long-term number rentals are not currently offered. They will be announced only after their secure fulfillment and audit controls are live.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-bold text-gray-900">5. Modifications & Contact</h2>
          <p className="text-gray-600">
            We reserve the right to modify these terms at any time. Continued use of Premium Verify constitutes acceptance of revised terms. For inquiries, contact:
          </p>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 font-medium space-y-1 text-gray-800">
            <div>Email Support: <strong className="text-[#ea580c]">hello@premiumverific.com</strong></div>
            <div>WhatsApp Helpline: <strong className="text-gray-900">+237 680209047</strong></div>
          </div>
        </section>

      </div>

    </div>
  )
}
