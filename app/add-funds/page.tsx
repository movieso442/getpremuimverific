'use client'

import React, { useState } from 'react'
import { Wallet, Smartphone, CreditCard, DollarSign, CheckCircle2, Loader2, Globe } from 'lucide-react'
import { useAppState } from '@/lib/store'

export default function AddFundsPage() {
  const [method, setMethod] = useState<'payunit' | 'momo' | 'usdt' | 'card'>('payunit')
  const [amountXaf, setAmountXaf] = useState(5000)
  const [cardAmountUsd, setCardAmountUsd] = useState(10)
  const [loading, setLoading] = useState(false)
  const [paymentMsg, setPaymentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { topUpBalance } = useAppState()

  // Handle Unified Payunit Checkout (MoMo, Orange Money, Cards, PayPal)
  const handlePayunitPayment = async () => {
    setLoading(true)
    setPaymentMsg(null)
    try {
      const res = await fetch('/api/payments/payunit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountXaf,
          currency: 'XAF'
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.payment_url) {
          window.location.href = data.payment_url
          return
        }
        topUpBalance(amountXaf, 'mtn_momo', data.reference)
        setPaymentMsg({
          type: 'success',
          text: data.message || `Successfully initialized ${amountXaf.toLocaleString()} XAF Payunit transaction.`
        })
      } else {
        setPaymentMsg({ type: 'error', text: data.error || 'Payunit initialization failed.' })
      }
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.message || 'Error connecting to Payunit gateway.' })
    } finally {
      setLoading(false)
    }
  }

  // Handle Mobile Money Payment submission
  const handleMomoPayment = async () => {
    setLoading(true)
    setPaymentMsg(null)
    try {
      const res = await fetch('/api/payments/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountXaf,
          currency: 'XAF',
          method: 'mtn_momo'
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.payment_url) {
          window.location.href = data.payment_url
          return
        }
        topUpBalance(amountXaf, 'mtn_momo', data.reference)
        setPaymentMsg({
          type: 'success',
          text: data.message || `Successfully processed ${amountXaf.toLocaleString()} XAF deposit.`
        })
      } else {
        setPaymentMsg({ type: 'error', text: data.error || 'Payment failed. Please try again.' })
      }
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.message || 'Network error processing MoMo payment.' })
    } finally {
      setLoading(false)
    }
  }

  // Handle Card Payment via Stripe API
  const handleCardPayment = async () => {
    setLoading(true)
    setPaymentMsg(null)
    try {
      const res = await fetch('/api/payments/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cardAmountUsd,
          currency: 'USD',
          mode: 'checkout_session'
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.checkout_url) {
          window.location.href = data.checkout_url
          return
        }
        const xafEquivalent = cardAmountUsd * 600
        topUpBalance(xafEquivalent, 'visa_mastercard', data.reference)
        setPaymentMsg({
          type: 'success',
          text: data.message || `Successfully added $${cardAmountUsd} USD (${xafEquivalent.toLocaleString()} XAF) to wallet.`
        })
      } else {
        setPaymentMsg({ type: 'error', text: data.error || 'Stripe payment failed.' })
      }
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.message || 'Error connecting to card payment gateway.' })
    } finally {
      setLoading(false)
    }
  }

  // Handle USDT Crypto Payment via Coinbase API
  const handleCryptoPayment = async () => {
    setLoading(true)
    setPaymentMsg(null)
    try {
      const res = await fetch('/api/payments/crypto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cardAmountUsd,
          crypto: 'USDT'
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.hosted_url) {
          window.location.href = data.hosted_url
          return
        }
        const xafEquivalent = cardAmountUsd * 600
        topUpBalance(xafEquivalent, 'crypto_usdt')
        setPaymentMsg({
          type: 'success',
          text: data.message || `USDT payment initialized. Send funds to address ${data.address}`
        })
      } else {
        setPaymentMsg({ type: 'error', text: data.error || 'Crypto payment error.' })
      }
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.message || 'Error processing crypto payment.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-2xs">
        
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Funds to Your Wallet</h1>
          <p className="text-xs text-gray-500 mt-1">
            Top up your balance instantly using Payunit (MoMo, Orange Money, Cards, PayPal), USDT Crypto, or Credit Card.
          </p>
        </div>

        {paymentMsg && (
          <div className={`p-4 rounded-xl text-xs font-semibold ${
            paymentMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {paymentMsg.text}
          </div>
        )}

        {/* Payment Methods */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => { setMethod('payunit'); setPaymentMsg(null); }}
            className={`p-5 rounded-2xl border text-left transition ${
              method === 'payunit'
                ? 'bg-emerald-50 border-emerald-600 text-emerald-600'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
            }`}
          >
            <Globe className="w-6 h-6 mb-2" />
            <div className="font-extrabold text-sm">Payunit Unified Gateway</div>
            <div className="text-[11px] opacity-80">PayPal, Cards, OM & MTN MoMo</div>
          </button>

          <button
            onClick={() => { setMethod('momo'); setPaymentMsg(null); }}
            className={`p-5 rounded-2xl border text-left transition ${
              method === 'momo'
                ? 'bg-orange-50 border-[#ff5722] text-[#ff5722]'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
            }`}
          >
            <Smartphone className="w-6 h-6 mb-2" />
            <div className="font-extrabold text-sm">MTN & Orange MoMo</div>
            <div className="text-[11px] opacity-80">Instant Direct Topup (+237)</div>
          </button>

          <button
            onClick={() => { setMethod('usdt'); setPaymentMsg(null); }}
            className={`p-5 rounded-2xl border text-left transition ${
              method === 'usdt'
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
            }`}
          >
            <DollarSign className="w-6 h-6 mb-2" />
            <div className="font-extrabold text-sm">USDT (TRC20 / BEP20)</div>
            <div className="text-[11px] opacity-80">Crypto Automatic Deposit</div>
          </button>

          <button
            onClick={() => { setMethod('card'); setPaymentMsg(null); }}
            className={`p-5 rounded-2xl border text-left transition ${
              method === 'card'
                ? 'bg-purple-50 border-purple-600 text-purple-600'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
            }`}
          >
            <CreditCard className="w-6 h-6 mb-2" />
            <div className="font-extrabold text-sm">Credit / Debit Card</div>
            <div className="text-[11px] opacity-80">Visa & Mastercard</div>
          </button>
        </div>

        {/* Method Details */}
        {method === 'payunit' && (
          <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4 text-xs">
            <h3 className="font-bold text-gray-900 text-sm">Payunit Multi-Payment Checkout (PayPal, Cards, OM, MoMo)</h3>
            <div className="space-y-2">
              <label className="font-bold text-gray-600 block uppercase text-[10px]">Enter Amount (XAF)</label>
              <input
                type="number"
                step="1000"
                value={amountXaf}
                onChange={(e) => setAmountXaf(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none"
              />
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-emerald-200 space-y-2 text-gray-700 font-medium">
              <div>Payunit application ID: <strong className="text-emerald-700 font-extrabold">6f671378-7fae-4fa0-bdee-00b32df34612</strong></div>
              <div>Supported channels: <strong className="text-gray-900">MTN MoMo, Orange Money, Visa, Mastercard, PayPal</strong></div>
            </div>

            <button
              onClick={handlePayunitPayment}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              <span>Pay {amountXaf.toLocaleString()} XAF via Payunit Gateway</span>
            </button>
          </div>
        )}

        {method === 'momo' && (
          <div className="p-6 rounded-2xl bg-orange-50/50 border border-orange-100 space-y-4 text-xs">
            <h3 className="font-bold text-gray-900 text-sm">Mobile Money Express Payment</h3>
            <div className="space-y-2">
              <label className="font-bold text-gray-600 block uppercase text-[10px]">Enter Amount (XAF)</label>
              <input
                type="number"
                step="1000"
                value={amountXaf}
                onChange={(e) => setAmountXaf(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none"
              />
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-orange-200 space-y-2 text-gray-700 font-medium">
              <div>Send Mobile Money transfer to: <strong className="text-[#ea580c] font-extrabold">+237 677034736</strong></div>
              <div>Recipient Name: <strong className="text-gray-900">Premium Verify Official</strong></div>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={handleMomoPayment}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-xs shadow-sm transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Process Direct MoMo API Deposit</span>
              </button>

              <a
                href={`https://wa.me/237677034736?text=Hello%2C%20I%20want%20to%20deposit%20${amountXaf}%20XAF%20to%20my%20Premium%20Verify%20account.`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs shadow-sm transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Deposit on WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {method === 'usdt' && (
          <div className="p-6 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-4 text-xs">
            <h3 className="font-bold text-gray-900 text-sm">USDT Crypto Payment Address</h3>
            <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-2 font-mono text-gray-800">
              <div className="text-[10px] text-gray-400 font-bold uppercase">USDT TRC20 Address:</div>
              <div className="text-xs font-bold text-blue-600 break-all">TYP7vX9zK2L3m4N5p6Q7R8s9T0u1V2W3X4Y5Z</div>
            </div>
            <button
              onClick={handleCryptoPayment}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              <span>Initiate Coinbase Crypto Gateway</span>
            </button>
          </div>
        )}

        {method === 'card' && (
          <div className="p-6 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-4 text-xs text-gray-700">
            <div>Visa / Mastercard payments are processed securely via Stripe. Select amount to initiate gateway checkout.</div>
            <div className="space-y-2 max-w-xs">
              <label className="font-bold text-gray-600 block uppercase text-[10px]">Enter Amount (USD)</label>
              <input
                type="number"
                min="1"
                step="5"
                value={cardAmountUsd}
                onChange={(e) => setCardAmountUsd(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none"
              />
            </div>
            <button
              onClick={handleCardPayment}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              <span>Pay ${cardAmountUsd} via Stripe Checkout</span>
            </button>
          </div>
        )}

      </div>

    </div>
  )
}
