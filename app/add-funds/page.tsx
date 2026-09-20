'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { Smartphone, CreditCard, DollarSign, CheckCircle2, Loader2, Zap, X, ShieldCheck, ArrowRight, AlertTriangle, Clock, Lock } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useAppState } from '@/lib/store'

function AddFundsContent() {
  const searchParams = useSearchParams()
  const paramAmount = searchParams.get('amount') || searchParams.get('required')
  const paramReason = searchParams.get('reason')

  const [method, setMethod] = useState<'express' | 'usdt'>('express')
  const [amountXaf, setAmountXaf] = useState(5000)
  const [cardAmountUsd, setCardAmountUsd] = useState(10)
  const [loading, setLoading] = useState(false)
  const [paymentMsg, setPaymentMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Payment Modal & PIN Verification States
  const [showModal, setShowModal] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<'mtn' | 'orange' | 'card' | 'paypal'>('mtn')
  const [momoPhone, setMomoPhone] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  // Live Mobile Money PIN Authorization Screen State
  const [pinAuthorizationState, setPinAuthorizationState] = useState<{
    active: boolean
    ref: string
    phone: string
    channel: string
    amount: number
  } | null>(null)

  const { topUpBalance, profile } = useAppState()

  useEffect(() => {
    if (paramAmount && !isNaN(Number(paramAmount))) {
      setAmountXaf(Number(paramAmount))
    }
  }, [paramAmount])

  // Open Payment Channel Selector Modal
  const openPaymentModal = () => {
    setPaymentMsg(null)
    setShowModal(true)
  }

  // Handle Channel Payment Request Initiation
  const handleExecutePayment = async () => {
    setLoading(true)
    setPaymentMsg(null)

    if ((selectedChannel === 'mtn' || selectedChannel === 'orange') && !momoPhone.trim()) {
      setPaymentMsg({ type: 'error', text: 'Please enter a valid Mobile Money phone number!' })
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/payments/payunit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountXaf,
          currency: 'XAF',
          channel: selectedChannel,
          phone_number: momoPhone
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (data.payment_url) {
          window.location.href = data.payment_url
          return
        }

        // Put user in live PIN Authorization State (Wait for user to enter PIN on phone)
        setShowModal(false)
        setPinAuthorizationState({
          active: true,
          ref: data.reference || `PV-${Math.floor(100000 + Math.random() * 900000)}`,
          phone: momoPhone || '+237 670 000 000',
          channel: selectedChannel === 'mtn' ? 'MTN Mobile Money' : 'Orange Money',
          amount: amountXaf
        })
      } else {
        setPaymentMsg({ type: 'error', text: data.error || 'Payment request failed. Please try again.' })
      }
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: err.message || 'Error connecting to payment gateway.' })
    } finally {
      setLoading(false)
    }
  }

  // Verify PIN Entry & Credit Wallet
  const handleVerifyPinAuthorization = async () => {
    if (!pinAuthorizationState) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/payments/check-status?ref=${pinAuthorizationState.ref}&action=verify&profile_id=${profile.id}&amount=${pinAuthorizationState.amount}`
      )
      const data = await res.json()
      if (res.ok && data.success) {
        topUpBalance(pinAuthorizationState.amount, selectedChannel === 'mtn' ? 'mtn_momo' : 'orange_money', pinAuthorizationState.ref)
        setPaymentMsg({
          type: 'success',
          text: `✅ Payment Authorized! ${pinAuthorizationState.amount.toLocaleString()} XAF has been credited to your wallet.`
        })
        setPinAuthorizationState(null)
      } else {
        setPaymentMsg({ type: 'error', text: 'PIN authorization not detected yet. Please check your phone.' })
      }
    } catch (err: any) {
      setPaymentMsg({ type: 'error', text: 'Error verifying PIN authorization status.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Insufficient Balance Notification Banner */}
      {paramReason === 'insufficient_balance' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-xs text-amber-900 font-semibold shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <div className="font-extrabold text-sm">Insufficient Wallet Balance</div>
            <div>Your current balance ({profile.balance_xaf.toLocaleString()} XAF) is below the required service cost. Top up your account below to proceed.</div>
          </div>
        </div>
      )}

      {/* Live PIN Authorization Monitor Screen */}
      {pinAuthorizationState?.active && (
        <div className="p-6 md:p-8 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 space-y-5 animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">USSD Payment Request Sent to Phone</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                We have initiated a <span className="font-bold text-amber-700">{pinAuthorizationState.amount.toLocaleString()} XAF</span> deposit via {pinAuthorizationState.channel} to <span className="font-bold">{pinAuthorizationState.phone}</span>.
              </p>
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-amber-200 space-y-2 text-xs text-gray-700">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Step-by-Step Authorization:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 pl-1">
              <li>Look at your phone screen for the Mobile Money USSD prompt.</li>
              <li>Enter your secret 4-digit Mobile Money PIN to authorize the payment.</li>
              <li>Once you confirm on your phone, click the button below to complete wallet funding.</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleVerifyPinAuthorization}
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>I Have Entered My PIN (Verify Payment)</span>
            </button>

            <button
              onClick={() => setPinAuthorizationState(null)}
              className="px-4 py-3.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs transition"
            >
              Cancel Payment
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-2xs">
        
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Funds to Your Wallet</h1>
          <p className="text-xs text-gray-500 mt-1">
            Top up your balance using Mobile Money (MTN / Orange), Credit/Debit Card, PayPal, or USDT Crypto.
          </p>
        </div>

        {paymentMsg && (
          <div className={`p-4 rounded-xl text-xs font-semibold ${
            paymentMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            paymentMsg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {paymentMsg.text}
          </div>
        )}

        {/* Payment Method Selector Cards */}
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
              <div className="text-xs opacity-80 mt-1">Automatic verified wallet funding across all channels</div>
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
              <p className="text-gray-500 mt-0.5">Select amount and click proceed to choose your payment channel.</p>
            </div>

            <div className="space-y-2 max-w-md">
              <label className="font-bold text-gray-700 block uppercase text-[10px]">Deposit Amount (XAF)</label>
              <div className="relative">
                <input
                  type="number"
                  step="500"
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
                Funds are credited to your account balance automatically upon PIN authorization.
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-center pt-2">
              <button
                onClick={openPaymentModal}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm shadow-sm transition"
              >
                <span>Proceed to Pay {amountXaf.toLocaleString()} XAF</span>
                <ArrowRight className="w-4 h-4" />
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
          <div className="p-6 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-5 text-xs">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">USDT Crypto Deposit</h3>
              <p className="text-gray-500 mt-0.5">Deposit USDT using TRC20 or BEP20 network. Equivalent XAF will be credited automatically upon blockchain confirmation.</p>
            </div>

            <div className="space-y-2 max-w-md">
              <label className="font-bold text-gray-700 block uppercase text-[10px]">USDT Amount (USD)</label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  value={cardAmountUsd}
                  onChange={(e) => setCardAmountUsd(Number(e.target.value))}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3.5 text-base font-extrabold text-gray-900 outline-none focus:border-blue-600"
                />
                <span className="absolute right-4 top-4 text-xs font-bold text-gray-400">USDT (~{(cardAmountUsd * 600).toLocaleString()} XAF)</span>
              </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-blue-100 space-y-2 text-gray-700">
              <div className="font-bold text-gray-900">Deposit Address (TRC20):</div>
              <div className="font-mono text-xs p-3 bg-gray-50 rounded-lg border border-gray-200 select-all font-bold text-blue-700">
                TQn9Y28hL8kPqXmR5vWz7aB3cC4dE5fG6h
              </div>
            </div>

            <button
              onClick={() => {
                setPaymentMsg({ type: 'info', text: `Crypto deposit of $${cardAmountUsd} USDT (~${(cardAmountUsd * 600).toLocaleString()} XAF) initiated. Awaiting blockchain confirmation.` })
              }}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-sm transition"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Confirm Crypto Deposit (${cardAmountUsd} USDT)</span>
            </button>
          </div>
        )}

      </div>

      {/* INTERACTIVE PAYMENT METHOD SELECTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden space-y-6 p-6 md:p-8 animate-in fade-in zoom-in duration-200">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Select Payment Channel</h3>
                <p className="text-xs text-gray-500">Deposit Amount: <span className="font-bold text-[#ff5722]">{amountXaf.toLocaleString()} XAF</span></p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Channel Selection Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedChannel('mtn')}
                className={`p-4 rounded-2xl border text-left font-bold text-xs transition ${
                  selectedChannel === 'mtn' ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/20' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <div className="font-extrabold text-sm text-amber-700">MTN MoMo</div>
                <div className="text-[10px] text-gray-500 mt-1">Cameroon / Africa</div>
              </button>

              <button
                onClick={() => setSelectedChannel('orange')}
                className={`p-4 rounded-2xl border text-left font-bold text-xs transition ${
                  selectedChannel === 'orange' ? 'bg-orange-50 border-orange-500 text-orange-900 ring-2 ring-orange-500/20' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <div className="font-extrabold text-sm text-orange-600">Orange Money</div>
                <div className="text-[10px] text-gray-500 mt-1">Cameroon / Africa</div>
              </button>

              <button
                onClick={() => setSelectedChannel('card')}
                className={`p-4 rounded-2xl border text-left font-bold text-xs transition ${
                  selectedChannel === 'card' ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <div className="font-extrabold text-sm text-blue-700">Credit / Debit Card</div>
                <div className="text-[10px] text-gray-500 mt-1">Visa / Mastercard</div>
              </button>

              <button
                onClick={() => setSelectedChannel('paypal')}
                className={`p-4 rounded-2xl border text-left font-bold text-xs transition ${
                  selectedChannel === 'paypal' ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                <div className="font-extrabold text-sm text-indigo-700">PayPal</div>
                <div className="text-[10px] text-gray-500 mt-1">Instant Checkout</div>
              </button>
            </div>

            {/* Mobile Money Phone Input Form */}
            {(selectedChannel === 'mtn' || selectedChannel === 'orange') && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <label className="font-bold text-gray-700 block text-xs">
                  Enter {selectedChannel === 'mtn' ? 'MTN' : 'Orange'} Mobile Money Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="+237 670 000 000"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-900 outline-none focus:border-[#ff5722]"
                  />
                  <Smartphone className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400" />
                </div>
                <p className="text-[10px] text-gray-500">
                  A USSD prompt will be sent to your phone to confirm payment of {amountXaf.toLocaleString()} XAF.
                </p>
              </div>
            )}

            {/* Credit Card Input Form */}
            {selectedChannel === 'card' && (
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Card Number</label>
                  <input
                    type="text"
                    placeholder="4000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">CVV Security Code</label>
                    <input
                      type="password"
                      placeholder="123"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PayPal Information */}
            {selectedChannel === 'paypal' && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs text-indigo-900">
                You will be redirected to PayPal secure portal to authorize your deposit of {amountXaf.toLocaleString()} XAF.
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleExecutePayment}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Send Payment Request ({amountXaf.toLocaleString()} XAF)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default function AddFundsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading Add Funds...</div>}>
      <AddFundsContent />
    </Suspense>
  )
}
