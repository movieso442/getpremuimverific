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
            <li><strong>Account Security:</strong> You are responsible for safeguarding your login credentials and developer API keys. Any action taken using your API key is attributed to your account.</li>
            <li><strong>Wallet Deposits:</strong> Deposits made via Payunit (MTN MoMo, Orange Money, Visa/Mastercard, PayPal), Stripe, or USDT Crypto are converted into wallet balance (XAF/USD) for purchasing platform services.</li>
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
            <li><strong>SMS Virtual Verification:</strong> Virtual phone numbers are allocated for single-use SMS verification or rental periods. If an SMS verification code does not arrive within the 20-minute window, the order is automatically canceled and funds are fully returned to your wallet.</li>
            <li><strong>SMM Panel Orders:</strong> Delivery times for social media growth services (followers, views, likes) depend on provider node speeds. Instant speed estimates are non-binding guarantees.</li>
            <li><strong>Acceptable Use:</strong> You agree not to use virtual numbers or services for illegal activities, harassment, spamming, or fraudulent account generation.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#ff5722]" />
            <span>4. API Usage & Rate Limits</span>
          </h2>
          <p>
            Developer API access (`/api/v1/sms/order`, `/api/v1/smm/order`) is provided for automated integration. Excessive API polling or abuse exceeding 60 requests per minute may result in temporary API key suspension.
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
            <div>WhatsApp Helpline: <strong className="text-gray-900">+237 677034736</strong></div>
          </div>
        </section>

      </div>

    </div>
  )
}
