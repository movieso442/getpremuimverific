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
  phone_number: string; sms_code: string | null; status: string; created_at: string; expires_at: string; price_xaf: number;
}

function failedOrderMessage(order: Pick<SmsInboxOrder, 'status' | 'price_xaf' | 'service_name' | 'country_name'>) {
  const isVpnStrict = order.service_name.toLowerCase().includes('facebook') || order.country_name.toLowerCase().includes('united states') || order.country_name.toLowerCase().includes('us')
  const retainedFee = isVpnStrict ? Math.round(order.price_xaf * 0.5) : 0
  const refundAmount = order.price_xaf - retainedFee

  if (order.status === 'expired') {
    if (isVpnStrict) {
      return `No code arrived before the timer ended. Under the US/Facebook Residential VPN contract, 50% (${retainedFee.toLocaleString()} XAF) was retained as a carrier fee and 50% (${refundAmount.toLocaleString()} XAF) was returned to your wallet.`
    }
    return `No code arrived before the provider timer ended. ${order.price_xaf.toLocaleString()} XAF was returned to your wallet in full.`
  }
  if (order.status === 'canceled') {
    if (isVpnStrict) {
      return `This number was canceled. Under the US/Facebook Residential VPN contract, 50% (${retainedFee.toLocaleString()} XAF) was retained and 50% (${refundAmount.toLocaleString()} XAF) was returned to your wallet.`
    }
    return 'This number was canceled before a code arrived. Check your wallet activity for the returned amount.'
  }
  return null
}

export default function SmsVerificationPage() {
  const router = useRouter()
  const { profile, setProfile } = useAppState()

  const [selectedService, setSelectedService] = useState(SMS_SERVICES[0])
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
  const [activeNumber, setActiveNumber] = useState<{ number: string; code: string; status: string; expiresAt: string } | null>(null)
  const [providerOrderId, setProviderOrderId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showInsufficientBanner, setShowInsufficientBanner] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [inboxOrders, setInboxOrders] = useState<SmsInboxOrder[]>([])
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [priceXaf,setPriceXaf]=useState<number | null>(null)
  const [deliveryRate,setDeliveryRate]=useState<number | null>(null)
  const [quoteError,setQuoteError]=useState<string | null>(null)
  const [quoteRetry,setQuoteRetry]=useState(0)
  const [cancelingOrderId,setCancelingOrderId]=useState<string|null>(null)
  const [agreedVpnPolicy, setAgreedVpnPolicy] = useState(false)

  const isVpnPolicyRequired = selectedService.code === 'fb' || selectedCountry.code === 'US' || (typeof deliveryRate === 'number' && deliveryRate < 50)
  useEffect(()=>{
    let active=true
    if(!profile.id)return
    void fetch('/api/v1/sms/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'quote',service:selectedService.code,country:selectedCountry.code})})
      .then(async response=>{
        const result=await response.json();
        if(!active)return;
        if(!response.ok||!Number.isFinite(result.price_xaf)||result.price_xaf<=0){
          setPriceXaf(null);
          setDeliveryRate(null);
          setQuoteError(result.error || 'No live quote is available for this selection. Try another country or service.');
          return
        }
        setPriceXaf(result.price_xaf);
        setDeliveryRate(typeof result.delivery_rate === 'number' ? result.delivery_rate : null);
        setQuoteError(null)
      })
      .catch(()=>{if(active){setPriceXaf(null);setDeliveryRate(null);setQuoteError('Could not refresh the live price. Please try again.')}})
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

    if (isVpnPolicyRequired && !agreedVpnPolicy) {
      setRequestError('You must agree to use an authentic US Residential VPN and accept the 50% partial refund policy for non-delivery before requesting a number.')
      return
    }

    setIsRequesting(true)
    try {
      const response = await fetch('/api/v1/sms/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: selectedService.code, country: selectedCountry.code, max_price_xaf: priceXaf, agreed_vpn_policy: agreedVpnPolicy })
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
        status: 'RECEIVING',
        expiresAt: result.order.expires_at,
      })
      setProviderOrderId(result.id)
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } })
    } catch {
      setRequestError('We could not confirm the number request. Refresh your SMS inbox and wallet before retrying. If no order appears, contact support with the time of your request.')
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
          expiresAt: currentOrder.expires_at,
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

  const handleCancelOrder = async (order: SmsInboxOrder) => {
    if (cancelingOrderId) return
    setCancelingOrderId(order.id)
    setInboxError(null)
    try {
      const response = await fetch('/api/v1/sms/order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id: order.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not cancel this number yet.')
      const refund = Number(result.refunded_xaf ?? order.price_xaf)
      setInboxOrders(current => current.map(item => item.id === order.id ? { ...item, status: 'canceled' } : item))
      setProfile({ balance_xaf: profile.balance_xaf + refund })
      const fee = Number(result.cancellation_fee_xaf ?? 50)
      setRequestError(`${refund.toLocaleString()} XAF returned to your wallet${fee ? ` after a ${fee.toLocaleString()} XAF cancellation fee` : ''}. You can request another number now.`)
    } catch (error) {
      setInboxError(error instanceof Error ? error.message : 'Cancellation is still being checked. Refresh before trying again.')
    } finally {
      setCancelingOrderId(null)
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
                if (s) {setPriceXaf(null);setQuoteError(null);setAgreedVpnPolicy(false);setSelectedService(s)}
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
                if (c) {setPriceXaf(null);setQuoteError(null);setAgreedVpnPolicy(false);setSelectedCountry(c)}
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

        {deliveryRate !== null && priceXaf !== null && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${deliveryRate >= 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-bold text-gray-800">
                Live Delivery Success: ~{Math.round(deliveryRate)}%
              </span>
              <span className="text-gray-500 text-[11px]">
                ({deliveryRate >= 50 ? 'High provider delivery rate' : 'Strict platform verification filters'})
              </span>
            </div>
            <span className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full border ${
              isVpnPolicyRequired
                ? 'text-amber-800 bg-amber-50 border-amber-300'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            }`}>
              {isVpnPolicyRequired ? '⚠️ 50% Refund Policy on Non-Delivery' : '🛡️ 100% Automatic Refund if no code'}
            </span>
          </div>
        )}

        {isVpnPolicyRequired && (
          <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 space-y-3 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-amber-950 text-sm">
                  Mandatory Notice: US Residential VPN Required & 50% Partial Refund Contract
                </h4>
                <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                  Meta (Facebook) and US mobile networks enforce strict fraud firewalls. If you attempt verification from a foreign IP address or a standard datacenter/free VPN (e.g., Windscribe, TurboVPN, free Proton), Meta will silently drop the verification SMS without sending it.
                </p>
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-amber-200 space-y-1.5 text-[11px] text-amber-900">
              <div className="font-bold text-amber-950">📋 Contract & Refund Conditions:</div>
              <ul className="list-disc list-inside space-y-1 text-amber-900">
                <li><span className="font-semibold text-amber-950">Authentic US Residential VPN:</span> You must connect to a genuine US Residential IP/Proxy before triggering the SMS in your app.</li>
                <li><span className="font-semibold text-amber-950">50% Carrier Retention Fee:</span> Because telecom carrier routes are permanently allocated by upstream providers upon purchase, <strong>if you fail to use a proper residential VPN and no code arrives, 100% refund is NOT granted. Exactly 50% will be retained as a carrier fee and 50% will be refunded to your wallet.</strong></li>
                <li><span className="font-semibold text-amber-950">No multiple resends:</span> Do not spam "Resend Code" to avoid 24-hour security locks from Meta.</li>
              </ul>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={agreedVpnPolicy}
                onChange={(e) => setAgreedVpnPolicy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer shrink-0"
              />
              <span className="font-bold text-xs text-amber-950">
                I understand and agree: I must use an authentic US Residential VPN. If no code arrives, 50% will be retained as a carrier routing fee and 50% will be returned to my wallet.
              </span>
            </label>
          </div>
        )}

        <button
          onClick={handleGetNumber}
          disabled={isRequesting || Boolean(profile.id && priceXaf===null) || Boolean(isVpnPolicyRequired && !agreedVpnPolicy)}
          className={`w-full py-4 rounded-xl text-white font-extrabold text-xs uppercase shadow-md transition flex items-center justify-center gap-2 ${
            isVpnPolicyRequired && !agreedVpnPolicy
              ? 'bg-gray-400 cursor-not-allowed opacity-80'
              : 'bg-[#ff5722] hover:bg-[#ea580c]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>
            {isRequesting
              ? 'Requesting live number…'
              : !profile.id
              ? 'Sign in to get a number'
              : priceXaf === null
              ? 'Waiting for a live price'
              : isVpnPolicyRequired && !agreedVpnPolicy
              ? 'Accept US VPN Policy Above to Order'
              : <>Get virtual number · <LocalAmount amountXaf={priceXaf} /> {isVpnPolicyRequired && '(50% Refund Policy)'}</>}
          </span>
        </button>
        {requestError && <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{requestError}</p>}
        {quoteError && <div role="status" className="rounded-xl bg-amber-50 p-3 text-base text-amber-900"><p>{quoteError}</p><button onClick={()=>{setPriceXaf(null);setQuoteError(null);setQuoteRetry(value=>value+1)}} className="mt-2 font-bold underline">Refresh live price</button></div>}
      </div>

      {/* Number Status & Code Box */}
      {profile.id && activeNumber && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 space-y-4 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900">Active Virtual Number Session</h3>
          <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            {isVpnPolicyRequired ? (
              <p>
                <strong>Residential VPN Active Reminder:</strong> Use this number immediately in your app with an authentic <strong>US Residential VPN</strong> connected. If this number expires or is canceled before a code arrives, under the agreed contract <strong>50% is retained as a carrier fee and 50% is returned to your wallet.</strong>
              </p>
            ) : (
              <p>
                Use this number immediately and request the SMS in the target app. You can cancel and get the wallet charge back while the provider still accepts cancellation, before a code arrives and before {new Date(activeNumber.expiresAt).toLocaleTimeString()}. If it expires without a code, the charge is returned after the provider confirms the timeout.
              </p>
            )}
          </div>

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
          {(activeNumber.status === 'EXPIRED' || activeNumber.status === 'CANCELED') && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-900">
              <p className="font-bold">This number did not receive a code.</p>
              <p className="mt-1">{activeNumber.status === 'EXPIRED'
                ? 'The provider timer ended without a code. The full charge is automatically returned to your wallet after provider confirmation.'
                : 'The number was canceled before a code arrived. Check your wallet activity for the returned amount.'}</p>
            </div>
          )}
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
              <article key={order.id} className={`rounded-xl border p-4 flex flex-wrap justify-between gap-3 ${failedOrderMessage(order) ? 'border-red-200 bg-red-50/40' : 'border-gray-200'}`}>
                <div>
                  <p className="font-semibold">{order.service_name} · {order.country_name}</p>
                  <p className="font-mono text-sm">{order.phone_number}</p>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                  {failedOrderMessage(order) && <p role="status" className="mt-2 max-w-xl text-sm font-medium text-red-800">{failedOrderMessage(order)}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 capitalize">{order.status.replaceAll('_', ' ')}</p>
                  <p className={`font-mono font-bold ${order.sms_code ? 'text-green-700' : failedOrderMessage(order) ? 'text-red-700' : 'text-gray-700'}`}>{order.sms_code || (order.status === 'waiting_sms' ? 'Waiting for SMS…' : 'No code received')}</p>
                  <p className="text-xs text-gray-500">Expires {new Date(order.expires_at).toLocaleTimeString()}</p>
                  {order.status === 'waiting_sms' && !order.sms_code && (
                    <button disabled={cancelingOrderId !== null} onClick={() => void handleCancelOrder(order)} className="mt-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">
                      {cancelingOrderId === order.id
                        ? 'Canceling…'
                        : (order.service_name.toLowerCase().includes('facebook') || order.country_name.toLowerCase().includes('united states') || order.country_name.toLowerCase().includes('us'))
                        ? `Cancel · return ${Math.round(order.price_xaf * 0.5).toLocaleString()} XAF (50% fee)`
                        : `Cancel · return ${Math.max(0, order.price_xaf - 50).toLocaleString()} XAF (50 XAF fee)`}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
