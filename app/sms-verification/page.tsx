'use client'

import React, { useEffect, useState } from 'react'
import { SMS_SERVICES, COUNTRIES } from '@/lib/mockData'
import { Smartphone, RefreshCw, Copy, Check, AlertTriangle, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/lib/store'
import LocalAmount from '@/components/LocalAmount'
import {SMS_COUNTRY_CODES} from '@/lib/providers/sms-catalogue'

type SmsInboxOrder = {
  id: string; provider_order_id: string | null; service_name: string; country_name: string;
  phone_number: string; sms_code: string | null; status: string; created_at: string;
}

export default function SmsVerificationPage() {
  const router = useRouter()
  const { profile } = useAppState()

  const [selectedService, setSelectedService] = useState(SMS_SERVICES[0])
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [activeNumber, setActiveNumber] = useState<{ number: string; code: string; status: string } | null>(null)
  const [providerOrderId, setProviderOrderId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showInsufficientBanner, setShowInsufficientBanner] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [inboxOrders, setInboxOrders] = useState<SmsInboxOrder[]>([])
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [priceXaf,setPriceXaf]=useState<number | null>(null)
  const [quoteError,setQuoteError]=useState<string | null>(null)
  const [quoteRetry,setQuoteRetry]=useState(0)
  useEffect(()=>{
    let active=true
    if(!profile.id)return
    void fetch('/api/v1/sms/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'quote',service:selectedService.code,country:selectedCountry.code})})
      .then(async response=>{const result=await response.json();if(!active)return;if(!response.ok||!Number.isFinite(result.price_xaf)||result.price_xaf<=0){setPriceXaf(null);setQuoteError('No live quote is available for this selection. Try another country or service.');return}setPriceXaf(result.price_xaf);setQuoteError(null)})
      .catch(()=>{if(active){setPriceXaf(null);setQuoteError('Could not refresh the live price. Please try again.')}})
    return()=>{active=false}
  },[profile.id,selectedService.code,selectedCountry.code,quoteRetry])
  useEffect(() => { router.prefetch('/add-funds') }, [router])

  const handleGetNumber = async () => {
    setShowInsufficientBanner(false)
    setRequestError(null)

    if (!profile.id) {
      router.push(`/signup?next=${encodeURIComponent('/sms-verification')}`)
      return
    }
    if(priceXaf===null){setRequestError('Wait for a live price before requesting a number.');return}

    if (profile.balance_xaf < priceXaf) {
      setShowInsufficientBanner(true)
      router.push(`/add-funds?amount=${priceXaf}&reason=insufficient_balance`)
      return
    }

    setIsRequesting(true)
    try {
      const response = await fetch('/api/v1/sms/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: selectedService.code, country: selectedCountry.code,max_price_xaf:priceXaf })
      })
      const result = await response.json()
      if (!response.ok) {
        if(response.status===402&&Number.isFinite(result.required_xaf)){router.push(`/add-funds?amount=${result.required_xaf}&reason=insufficient_balance`);return}
        if(response.status===409&&Number.isFinite(result.required_xaf))setPriceXaf(result.required_xaf)
        setRequestError(result.error || 'Could not allocate a live number. No funds were charged.')
        return
      }
      setActiveNumber({
        number: result.phone,
        code: 'Waiting for SMS...',
        status: 'RECEIVING'
      })
      setProviderOrderId(result.id)
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } })
    } catch {
      setRequestError('Could not contact the live SMS service. No funds were charged.')
    } finally {
      setIsRequesting(false)
    }
  }

  useEffect(() => {
    if (!profile.id) return
    let disposed = false
    let inFlight = false
    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const loadInbox = async (): Promise<SmsInboxOrder[]> => {
          const response = await fetch('/api/v1/sms/order', { cache: 'no-store' })
          if (!response.ok) throw new Error('Could not refresh your SMS inbox. Retrying shortly.')
          const result = await response.json()
          return result.orders
        }
        let orders = await loadInbox()
        const pending = orders.filter(order => order.status === 'waiting_sms' && order.provider_order_id).slice(0, 5)
        const checks = await Promise.allSettled(pending.map(async order => {
          const response = await fetch('/api/v1/sms/order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getStatus', id: order.provider_order_id })
          })
          if (!response.ok) throw new Error('Number status temporarily unavailable.')
        }))
        if (pending.length) orders = await loadInbox()
        if (disposed) return
        setInboxOrders(orders)
        setInboxError(checks.some(check => check.status === 'rejected') ? 'Some numbers could not be checked. We will retry shortly.' : null)
        const currentOrder = providerOrderId ? orders.find(order => order.provider_order_id === providerOrderId) : orders[0]
        if (currentOrder) setActiveNumber({
          number: currentOrder.phone_number,
          code: currentOrder.sms_code || (currentOrder.status === 'waiting_sms' ? 'Waiting for SMS...' : currentOrder.status),
          status: currentOrder.sms_code ? 'RECEIVED' : currentOrder.status === 'waiting_sms' ? 'RECEIVING' : currentOrder.status.toUpperCase(),
        })
      } catch {
        if (!disposed) setInboxError('Could not refresh your SMS inbox. Retrying shortly.')
      } finally {
        inFlight = false
      }
    }

    void poll()
    const timer = window.setInterval(() => void poll(), 8_000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [profile.id, providerOrderId])

  const handleCopy = () => {
    if (activeNumber) {
      navigator.clipboard.writeText(activeNumber.number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Insufficient Balance Banner */}
      {showInsufficientBanner && priceXaf!==null && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-amber-900 animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold text-sm block">Insufficient Balance ({profile.balance_xaf.toLocaleString()} XAF)</span>
              <span>You need {priceXaf.toLocaleString()} XAF to request this SMS number. Redirecting to top up...</span>
            </div>
          </div>
          <button
            onClick={() => router.push(`/add-funds?amount=${priceXaf}&reason=insufficient_balance`)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shrink-0 flex items-center gap-1 transition"
          >
            <span>Top Up Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-6 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#ff5722]" />
            <span>Virtual SMS Activation</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Get instant virtual phone numbers for WhatsApp, Telegram, TikTok, Facebook, Google & OpenAI verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Select Service */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">1. Select Target Platform</label>
            <select
              value={selectedService.id}
              onChange={(e) => {
                const s = SMS_SERVICES.find(srv => srv.id === e.target.value)
                if (s) {setPriceXaf(null);setQuoteError(null);setSelectedService(s)}
              }}
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none focus:border-[#ff5722]"
            >
              {SMS_SERVICES.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Country */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">2. Select Country</label>
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const c = COUNTRIES.find(cnt => cnt.code === e.target.value)
                if (c) {setPriceXaf(null);setQuoteError(null);setSelectedCountry(c)}
              }}
              className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl py-3 px-4 text-xs font-bold text-gray-900 outline-none focus:border-[#ff5722]"
            >
              {COUNTRIES.filter(cnt=>SMS_COUNTRY_CODES.some(code=>code===cnt.code)).map((cnt) => (
                <option key={cnt.code} value={cnt.code}>
                  {cnt.flag} {cnt.name} ({cnt.prefix})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGetNumber}
          disabled={isRequesting || Boolean(profile.id && priceXaf===null)}
          className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-xs uppercase shadow-md transition flex items-center justify-center gap-2"
        >
          <Smartphone className="w-4 h-4" />
          <span>{isRequesting ? 'Requesting live number…' : !profile.id ? 'Sign in to get a number' : priceXaf===null ? 'Waiting for a live price' : <>Get virtual number · <LocalAmount amountXaf={priceXaf} /></>}</span>
        </button>
        {requestError && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{requestError}</p>}
        {quoteError && <div role="status" className="rounded-xl bg-amber-50 p-3 text-base text-amber-900"><p>{quoteError}</p><button onClick={()=>{setPriceXaf(null);setQuoteError(null);setQuoteRetry(value=>value+1)}} className="mt-2 font-bold underline">Refresh live price</button></div>}
      </div>

      {/* Number Status & Code Box */}
      {profile.id && activeNumber && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900">Active Virtual Number Session</h3>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase">Assigned Phone Number</div>
              <div className="text-lg font-black text-gray-900 font-mono mt-0.5">{activeNumber.number}</div>
            </div>

            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-[#2563eb] text-white font-bold text-xs rounded-xl flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Number'}</span>
            </button>
          </div>

          <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase">Verification Code Status</div>
              <div className={`text-xl font-black font-mono mt-1 ${activeNumber.status === 'RECEIVED' ? 'text-green-600' : 'text-[#ea580c]'}`}>
                {activeNumber.code}
              </div>
            </div>

            {activeNumber.status === 'RECEIVING' && (
              <RefreshCw className="w-5 h-5 text-[#ea580c] animate-spin" />
            )}
          </div>
        </div>
      )}

      {profile.id && (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Your SMS inbox</h2>
          <p className="text-sm text-gray-500">Your recent numbers and codes stay here after you refresh. Waiting numbers are checked every eight seconds while this page is open.</p>
          {inboxError && <p role="status" className="text-sm text-amber-700">{inboxError}</p>}
          {!inboxOrders.length && <p className="text-sm text-gray-500">Your reserved numbers will appear here.</p>}
          <div className="space-y-3" aria-live="polite">
            {inboxOrders.map(order => (
              <article key={order.id} className="rounded-xl border border-gray-200 p-4 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.service_name} · {order.country_name}</p>
                  <p className="font-mono text-sm">{order.phone_number}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 capitalize">{order.status.replaceAll('_', ' ')}</p>
                  <p className="font-mono font-bold text-green-700">{order.sms_code || (order.status === 'waiting_sms' ? 'Waiting for SMS…' : 'No code received')}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
