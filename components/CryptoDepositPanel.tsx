'use client'
import { useEffect, useRef, useState } from 'react'
import { Copy, Loader2 } from 'lucide-react'
import { CRYPTO_METHODS, type CryptoMethod, validCryptoAmount } from '@/lib/payments/manual-crypto'
import { topupQuote } from '@/lib/payments/topup-fees'
import { normalizeCryptoReference } from '@/lib/payments/crypto-reference'
import PaymentReceiptUpload, { uploadPaymentReceipt } from './PaymentReceiptUpload'
import { RECEIPT_MAX_BYTES } from '@/lib/payments/receipt-image'
import UsdtEstimate from './UsdtEstimate'
import LocalAmount from './LocalAmount'

type Claim = { id: string; payment_method: CryptoMethod; crypto_amount: string; amount_xaf: number; approved_amount_xaf: number | null; status: string; receipt_attached?: boolean }
export default function CryptoDepositPanel({ profileId, token, selectedMethod = 'usdt_trc20', walletAmount = 3000, onStarted }: {
  profileId: string; token?: string; selectedMethod?: CryptoMethod; walletAmount?: number; onStarted?: () => void
}) {
  const option = CRYPTO_METHODS[selectedMethod]
  const endpoint = `/api/payments/manual-crypto${token ? `?token=${encodeURIComponent(token)}` : ''}`
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [reference, setReference] = useState('')
  const [claims, setClaims] = useState<Claim[]>([])
  const [ready, setReady] = useState(false)
  const [paid, setPaid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [receiptAvailable, setReceiptAvailable] = useState(false)
  const locked = useRef(false)
  const quote = walletAmount >= 3000 ? topupQuote(walletAmount, selectedMethod) : { creditXaf: walletAmount, feeXaf: 0, totalXaf: walletAmount }
  useEffect(() => {
    if (!profileId) return
    let disposed = false
    const refresh = async () => {
      try {
        const response = await fetch(endpoint, { cache: 'no-store' })
        const result = await response.json()
        if (disposed) return
        setReady(response.ok)
        setReceiptAvailable(result.receipt_upload_available === true)
        if (response.ok) setClaims(result.pending_claim && !result.claims.some((claim: Claim) => claim.id === result.pending_claim.id) ? [result.pending_claim, ...result.claims] : result.claims)
        else setNotice(result.error || 'Payment unavailable. Please contact support before sending money.')
      } catch { if (!disposed) { setReady(false); setNotice('Unable to load payment. Please try again.') } }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 10000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [profileId, endpoint])
  const pending = claims.find(claim => claim.status === 'pending')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (locked.current || pending) return
    const hash = normalizeCryptoReference(selectedMethod, reference)
    if (!hash || !validCryptoAmount(selectedMethod, cryptoAmount)) {
      setNotice('Paste the transaction ID or explorer link from your payment receipt and the crypto amount sent.'); return
    }
    locked.current = true
    setBusy(true)
    onStarted?.()
    try {
      const response = await fetch('/api/payments/manual-crypto', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, payment_method: selectedMethod, crypto_amount: cryptoAmount, amount_xaf: walletAmount, transfer_reference: hash, accepted_fee_percent: 2 }) })
      const result = await response.json()
      setNotice(response.ok ? 'Payment details received. We’ll update your wallet once the transfer arrives and is checked.' : result.error)
      if (response.ok) {
        if (receipt && result.claim_id) {
          try { await uploadPaymentReceipt(result.claim_id, receipt, token); setReceipt(null) }
          catch (reason) { setNotice(`Payment details saved. ${reason instanceof Error ? reason.message : 'Receipt upload failed.'} You can retry the upload below without submitting another payment.`) }
        }
        const history = await fetch(endpoint, { cache: 'no-store' })
        if (history.ok) setClaims((await history.json()).claims)
      }
    } catch { setNotice('Connection interrupted. Check your payment status before trying again.') }
    finally { setBusy(false); locked.current = false }
  }
  return <div className="space-y-4 text-gray-900">
    {notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
    {!token && !pending && <p className="text-base text-gray-600">Wallet credit: <LocalAmount amountXaf={quote.creditXaf} /> · crypto fee: <LocalAmount amountXaf={quote.feeXaf} /></p>}
    {selectedMethod === 'usdt_trc20' && ready && !pending && <UsdtEstimate creditXaf={quote.creditXaf} feeXaf={quote.feeXaf} />}
    {!profileId ? <a href="/login?next=/add-funds" className="block rounded-xl bg-orange-600 p-4 text-center font-bold text-white">Sign in to continue</a> : !ready ? <p className="text-sm text-gray-500">Loading payment details…</p> : pending ?
      <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-bold">Payment being checked</h3><p className="mt-2 text-sm">{CRYPTO_METHODS[pending.payment_method].label} · {pending.crypto_amount} {CRYPTO_METHODS[pending.payment_method].asset}</p><p className="mt-2 text-sm">Wallet credit requested: {Number(pending.amount_xaf).toLocaleString()} XAF. Please don’t send another transfer for this top-up.</p>{receiptAvailable && <PaymentReceiptUpload claimId={pending.id} token={token} attached={pending.receipt_attached} />}</div> : !paid ? <>
      <div className="rounded-2xl bg-gray-50 p-4 text-sm"><p>Wallet credit <strong>{quote.creditXaf.toLocaleString()} XAF</strong></p><p className="mt-1">2% fee <strong>{quote.feeXaf.toLocaleString()} XAF</strong></p><p className="mt-2 font-bold">Transfer value: {quote.totalXaf.toLocaleString()} XAF, plus network fees</p></div>
      <a href={`https://wa.me/237677034736?text=${encodeURIComponent(`Hello, please confirm the ${option.label} amount for ${quote.creditXaf} XAF wallet credit plus ${quote.feeXaf} XAF fee.`)}`} target="_blank" rel="noopener noreferrer" className="block text-sm font-semibold text-emerald-700">Confirm the exact {option.asset} amount with support before sending ↗</a>
      <div className="rounded-2xl border border-gray-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">{option.label} receiving address</p><code className="mt-3 block break-all text-sm leading-6">{option.address}</code><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(option.address); setNotice('Address copied.') } catch { setNotice('Please copy the address above.') } }} className="mt-3 flex items-center gap-2 text-sm font-bold text-orange-700"><Copy size={16} />Copy address</button></div>
      <p className="text-xs text-gray-600">Send only {option.asset} on this network. Pay the network fee separately so the full agreed amount arrives.</p>
      <button type="button" onClick={() => { setPaid(true); onStarted?.() }} className="w-full rounded-xl bg-orange-600 p-4 font-bold text-white">I’ve paid</button>
    </> : <form onSubmit={submit} className="space-y-4">
      <h3 className="font-bold">Find your payment</h3>
      <p className="text-sm text-gray-600">Open the transfer in your wallet or exchange and copy its transaction ID or explorer link.</p>
      <label className="block text-sm font-semibold">Payment reference<input required value={reference} onChange={event => setReference(event.target.value)} autoComplete="off" placeholder="Paste transaction ID or link" className="mt-2 w-full rounded-xl border border-gray-300 p-3" /></label>
      <label className="block text-sm font-semibold">Amount sent ({option.asset})<input required type="text" inputMode="decimal" value={cryptoAmount} onChange={event => setCryptoAmount(event.target.value)} placeholder="As shown on your payment receipt" className="mt-2 w-full rounded-xl border border-gray-300 p-3" /></label>
      {receiptAvailable && <label className="block text-base font-semibold">Payment screenshot (optional)<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-2 block w-full min-w-0 text-base" onChange={event => { const file = event.target.files?.[0]; if (file && file.size > RECEIPT_MAX_BYTES) { setReceipt(null); setNotice('Use a PNG, JPG or WebP image smaller than 3 MB.'); return } setReceipt(file || null) }} /><span className="mt-2 block text-sm font-normal text-gray-600">PNG, JPG or WebP up to 3 MB. Keep passwords and PINs out of the screenshot.</span></label>}
      <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 p-4 font-bold text-white disabled:opacity-50">{busy && <Loader2 size={18} className="animate-spin" />}Find my payment</button>
    </form>}
    {claims.filter(claim => claim.status !== 'pending').length > 0 && <details className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-sm font-bold">Previous payments</summary>{claims.filter(claim => claim.status !== 'pending').map(claim => <p key={claim.id} className="mt-3 text-sm">{CRYPTO_METHODS[claim.payment_method].asset} · {claim.status === 'confirmed' ? `${Number(claim.approved_amount_xaf).toLocaleString()} XAF credited` : 'Not confirmed — contact support'}</p>)}</details>}
  </div>
}
