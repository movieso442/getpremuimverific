'use client'

import React, { useState } from 'react'
import { X, CreditCard, Smartphone, ShieldCheck, CheckCircle2, DollarSign } from 'lucide-react'
import { useAppState } from '@/lib/store'
import confetti from 'canvas-confetti'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
}

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const { topUpBalance } = useAppState()
  const [selectedMethod, setSelectedMethod] = useState<'mtn_momo' | 'orange_money' | 'visa_mastercard' | 'crypto_usdt'>('mtn_momo')
  const [amount, setAmount] = useState<number>(5000)
  const [phone, setPhone] = useState<string>('680209047')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<string>('')

  if (!isOpen) return null

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0) {
      setStatusMessage('Please enter a valid deposit amount')
      return
    }

    setIsProcessing(true)
    setStatusMessage('')

    try {
      let endpoint = '/api/payments/momo'
      let payload: any = { amount, phone, method: selectedMethod }

      if (selectedMethod === 'visa_mastercard') {
        endpoint = '/api/payments/stripe'
        payload = { amount: (amount / 600).toFixed(2), currency: 'usd' }
      } else if (selectedMethod === 'crypto_usdt') {
        endpoint = '/api/payments/crypto'
        payload = { amount: (amount / 600).toFixed(2), crypto: 'USDT' }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.status === 'REDIRECT' && data.payment_url) {
        window.location.href = data.payment_url
        return
      }

      // Add balance to local state & persist
      topUpBalance(amount, selectedMethod, data.reference || 'DEP-' + Math.floor(100000 + Math.random() * 900000))
      setIsSuccess(true)
      setStatusMessage(data.message || 'Payment successfully processed!')

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      })

      setTimeout(() => {
        setIsSuccess(false)
        onClose()
      }, 2000)

    } catch (err: any) {
      setStatusMessage(err.message || 'Payment processing failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-gray-200 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ff6b00]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Deposit Wallet Funds</h3>
              <p className="text-xs text-gray-500">Instant automatic top-up for Premium Verify</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-[#ff6b00] flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900">Payment Successful!</h4>
            <p className="text-sm text-gray-600">
              Added <span className="text-[#ea580c] font-bold">{amount.toLocaleString()} XAF</span> to your Premium Verify balance.
            </p>
            {statusMessage && <div className="text-xs text-green-600 font-semibold">{statusMessage}</div>}
          </div>
        ) : (
          <form onSubmit={handleDepositSubmit} className="mt-5 space-y-5">
            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
                Select Payment Gateway
              </label>
              <div className="grid grid-cols-2 gap-3">
                
                {/* MTN MoMo */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('mtn_momo')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    selectedMethod === 'mtn_momo'
                      ? 'border-[#ff6b00] bg-orange-50 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-600 flex items-center justify-center font-bold text-xs">
                    MTN
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">MTN MoMo</div>
                    <div className="text-[10px] text-gray-500">Mobile Money</div>
                  </div>
                </button>

                {/* Orange Money */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('orange_money')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    selectedMethod === 'orange_money'
                      ? 'border-[#ff6b00] bg-orange-50 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-600 flex items-center justify-center font-bold text-xs">
                    OM
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Orange Money</div>
                    <div className="text-[10px] text-gray-500">Instant Deposit</div>
                  </div>
                </button>

                {/* Visa/Mastercard */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('visa_mastercard')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    selectedMethod === 'visa_mastercard'
                      ? 'border-[#ff6b00] bg-orange-50 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Visa / Card</div>
                    <div className="text-[10px] text-gray-500">Global Credit Cards</div>
                  </div>
                </button>

                {/* Crypto USDT */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('crypto_usdt')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    selectedMethod === 'crypto_usdt'
                      ? 'border-[#ff6b00] bg-orange-50 text-gray-900 shadow-xs'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    ₮
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">USDT Crypto</div>
                    <div className="text-[10px] text-gray-500">TRC20 / BEP20</div>
                  </div>
                </button>

              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 block">
                Amount (XAF)
              </label>
              <div className="flex items-center gap-2 mb-3">
                {[2000, 5000, 10000, 25000, 50000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      amount === amt
                        ? 'border-[#ff6b00] bg-[#ff6b00] text-white font-bold'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {amt.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  min="500"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-3 px-4 text-gray-900 font-bold text-lg outline-none transition"
                  placeholder="Enter custom amount..."
                />
                <span className="absolute right-4 top-3.5 text-xs text-gray-500 font-semibold">XAF</span>
              </div>
            </div>

            {/* Phone input for MoMo/OM */}
            {(selectedMethod === 'mtn_momo' || selectedMethod === 'orange_money') && (
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-1 block">
                  Mobile Money Phone Number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-2.5 pl-10 pr-4 text-gray-900 text-sm outline-none"
                    placeholder="e.g. 680209047"
                  />
                </div>
              </div>
            )}

            {/* Security note */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
              <ShieldCheck className="w-4 h-4 text-[#ff6b00] shrink-0" />
              <span>256-Bit Encrypted Payment. Account balance is updated immediately upon confirmation.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-3.5 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] text-white font-extrabold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </>
              ) : (
                <span>Pay {amount.toLocaleString()} XAF Now</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  )
}
