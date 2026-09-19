'use client'

import React, { useState } from 'react'
import { Smartphone, CreditCard, DollarSign, CheckCircle2, Loader2, Zap } from 'lucide-react'
import { useAppState } from '@/lib/store'

export default function AddFundsPage() {
  const [method, setMethod] = useState<'express' | 'usdt'>('express')
  const [amountXaf, setAmountXaf] = useState(5000)
  const [cardAmountUsd, setCardAmountUsd] = useState(10)
  const [loading, setLoading] = useState(false)
  const [paymentMsg, setPaymentMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { topUpBalance } = useAppState()

  // Handle Express Gateway Payment (MTN MoMo, Orange Money, Visa, Mastercard, PayPal)
  const handleExpressPayment = async () => {
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
          text: data.message || `Successfully initialized ${amountXaf.toLocaleString()} XAF deposit.`
        })
      } else {
        setPaymentMsg({ type: 'error', text: data.error || 'Payment gateway connection failed. Please try again.' })
      }
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.message || 'Error connecting to payment gateway.' })
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
            Top up your balance instantly using Mobile Money (MTN / Orange), Credit/Debit Card, PayPal, or USDT Crypto.
          </p>
        </div>

        {paymentMsg && (
          <div className={`p-4 rounded-xl text-xs font-semibold ${
            paymentMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {paymentMsg.text}
          </div>
        )}

        {/* Payment Method Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => { setMethod('express'); setPaymentMsg(null); }}
            className={`p-6 rounded-2xl border text-left transition flex items-start justify-between ${
              method === 'express'
                ? 'bg-orange-50/70 border-[#ff5722] text-[#ff5722]'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-6 h-6" />
                <CreditCard className="w-5 h-5 opacity-80" />
              </div>
              <div className="font-extrabold text-base">MTN MoMo, Orange Money, Cards & PayPal</div>
              <div className="text-xs opacity-80 mt-1">Instant automatic wallet funding across all channels</div>
            </div>
            {method === 'express' && <Zap className="w-5 h-5 fill-current text-[#ff5722]" />}
          </button>

          <button
            onClick={() => { setMethod('usdt'); setPaymentMsg(null); }}
            className={`p-6 rounded-2xl border text-left transition flex items-start justify-between ${
              method === 'usdt'
                ? 'bg-blue-50 border-blue-600 text-blue-600'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-white'
            }`}
          >
            <div>
              <DollarSign className="w-6 h-6 mb-2" />
              <div className="font-extrabold text-base">USDT (TRC20 / BEP20)</div>
              <div className="text-xs opacity-80 mt-1">Automated Crypto Deposit</div>
            </div>
            {method === 'usdt' && <Zap className="w-5 h-5 fill-current text-blue-600" />}
          </button>
        </div>

        {/* Express Gateway Details */}
        {method === 'express' && (
          <div className="p-6 rounded-2xl bg-orange-50/30 border border-orange-100 space-y-5 text-xs">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Express Deposit Checkout</h3>
              <p className="text-gray-500 mt-0.5">Select amount and click proceed to choose your preferred payment channel (MTN, Orange, Card, or PayPal).</p>
            </div>

            <div className="space-y-2 max-w-md">
              <label className="font-bold text-gray-700 block uppercase text-[10px]">Deposit Amount (XAF)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1000"
                  min="500"
                  value={amountXaf}
                  onChange={(e) => setAmountXaf(Number(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-base font-extrabold text-gray-900 outline-none focus:border-[#ff5722]"
                />
                <span className="absolute right-4 top-4 text-xs font-bold text-gray-400">XAF</span>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-xl border border-orange-100 space-y-2 text-gray-700 font-medium">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Supported Channels: MTN Mobile Money, Orange Money, Visa, Mastercard, PayPal</span>
              </div>
              <div className="text-[11px] text-gray-500">
                Instant delivery. Funds are credited to your account balance automatically upon authorization.
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center pt-2">
              <button
                onClick={handleExpressPayment}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm shadow-sm transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                <span>Proceed to Pay {amountXaf.toLocaleString()} XAF</span>
              </button>

              <a
                href={`https://wa.me/237680209047?text=Hello%2C%20I%20want%20to%20deposit%20${amountXaf}%20XAF%20to%20my%20Premium%20Verify%20account.`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs shadow-sm transition"
              >
                <Smartphone className="w-4 h-4" />
                <span>Confirm via WhatsApp Support</span>
              </a>
            </div>
          </div>
        )}

        {/* USDT Crypto Details */}
        {method === 'usdt' && (
          <div className="p-6 rounded-2xl bg-blue-50/30 border border-blue-100 space-y-4 text-xs">
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

      </div>

    </div>
  )
}
