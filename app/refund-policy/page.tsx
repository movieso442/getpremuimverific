'use client'

import React from 'react'
import Link from 'next/link'
import { RefreshCw, DollarSign, CheckCircle2, ShieldAlert, ArrowLeft } from 'lucide-react'

export default function RefundPolicyPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs uppercase tracking-wider">
          <RefreshCw className="w-4 h-4" />
          <span>Guarantee & Cancellations</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">Refund & Cancellation Policy</h1>
        <p className="text-xs text-gray-500">
          Last updated: September 18, 2026 • Premium Verify Official Policy (premiumverific.com)
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-2xs space-y-8 text-xs text-gray-700 leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>1. Automatic Refund Guarantee (SMS & SMM Orders)</span>
          </h2>
          <p>
            At <strong>Premium Verify</strong>, customer satisfaction and fair pricing are our top priorities. We implement automated instant refund mechanisms across our service categories:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-gray-600">
            <li>
              <strong>SMS Virtual Numbers:</strong> If an allocated virtual phone number does not receive the SMS verification code within 20 minutes, or if you click <em>Cancel Order</em>, your wallet is <strong>100% refunded instantly</strong> with zero cancellation fee.
            </li>
            <li>
              <strong>SMM Panel Orders:</strong> If an SMM order fails, is dropped by the provider node, or cannot be completed within 72 hours, the remaining unfulfilled portion is automatically refunded back to your platform wallet balance.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span>2. Wallet Balance & Cashout Policy</span>
          </h2>
          <p>
            Deposits made into your Premium Verify account wallet via <strong>Payunit</strong> (MTN MoMo, Orange Money, Credit Cards, PayPal), <strong>Stripe</strong>, or <strong>USDT Crypto</strong> are meant for service fulfillment on our platform.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Unused wallet balances can be withdrawn or refunded back to your original Mobile Money or Bank account upon request, subject to standard gateway processing fees (1.5%).</li>
            <li>To request a manual wallet balance withdrawal, contact support at <strong>hello@premiumverific.com</strong> or WhatsApp <strong>+237 677034736</strong> with your transaction reference.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>3. Chargebacks & Payment Disputes</span>
          </h2>
          <p>
            Please contact our customer support team directly before filing a dispute or chargeback with your bank, Payunit, or PayPal. Opening fraudulent chargebacks for services already rendered will result in permanent account suspension and blacklisting across our provider network.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3 border-t border-gray-100 pt-6">
          <h2 className="text-sm font-bold text-gray-900">4. How to Request Assistance</h2>
          <p className="text-gray-600">
            Our support team operates 24/7 to assist with refund claims or transaction inquiries:
          </p>
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 font-medium space-y-1 text-gray-800">
            <div>Email Support: <strong className="text-blue-700">hello@premiumverific.com</strong></div>
            <div>WhatsApp 24/7 Helpline: <strong className="text-gray-900">+237 677034736</strong></div>
          </div>
        </section>

      </div>

    </div>
  )
}
