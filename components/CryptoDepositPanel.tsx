'use client'
import { useEffect, useState } from 'react'
import { CRYPTO_METHODS, CryptoMethod } from '@/lib/payments/manual-crypto'
type Claim = { id: string; payment_method: CryptoMethod; crypto_amount: string; amount_xaf: number; approved_amount_xaf: number | null; status: string }
export default function CryptoDepositPanel({ profileId, token }: { profileId: string; token?: string }) {
  const endpoint = `/api/payments/manual-crypto${token ? `?token=${encodeURIComponent(token)}` : ''}`
  const [method, setMethod] = useState<CryptoMethod>('usdt_trc20')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [requestedCredit, setRequestedCredit] = useState('3000')
  const [hash, setHash] = useState('')
  const [claims, setClaims] = useState<Claim[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!profileId) return
    let disposed = false
    const refresh = async () => {
      try {
        const response = await fetch(endpoint, { cache: 'no-store' })
        const result = await response.json()
        if (disposed) return
        setReady(response.ok)
        if (response.ok) setClaims(result.claims)
        else setNotice(result.error || 'Crypto deposits unavailable. Do not send funds yet.')
      } catch { if (!disposed) { setReady(false); setNotice('Could not load deposits. Do not send funds yet.') } }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [profileId, endpoint])
  const submit = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/payments/manual-crypto', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, payment_method: method, crypto_amount: cryptoAmount, amount_xaf: Number(requestedCredit), transfer_reference: hash }),
      })
      const result = await response.json()
      setNotice(result.message || result.error)
      if (response.ok) {
        setHash('')
        const history = await fetch(endpoint, { cache: 'no-store' })
        if (history.ok) setClaims((await history.json()).claims)
      }
    } catch { setNotice('Could not submit transfer. Please retry.') }
    finally { setBusy(false) }
  }
  return <section className="bg-white text-gray-900 rounded-2xl border border-gray-200 p-6 space-y-4">
    <h2 className="text-xl font-bold">Pay with crypto</h2>
    <p className="text-sm text-gray-600">Contact support to agree the crypto amount and XAF credit before transferring. Our team reviews deposits. Minimum credit: 3,000 XAF. Network fees are separate.</p>
    <a href="https://wa.me/237677034736?text=I%20want%20to%20agree%20a%20crypto%20deposit%20amount%20and%20XAF%20credit" target="_blank" rel="noopener noreferrer" className="inline-block text-orange-600 font-bold text-sm">Agree a crypto deposit with support</a>
    {!profileId && <a href="/login?next=/add-funds" className="text-orange-600 font-bold">Sign in to deposit crypto</a>}
    {notice && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
    {profileId && ready && <>
      <label className="block text-sm font-bold">Asset and network<select value={method} onChange={event => { setMethod(event.target.value as CryptoMethod); setCryptoAmount(''); setHash('') }} className="block w-full border rounded-xl p-3 mt-2">{Object.entries(CRYPTO_METHODS).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}</select></label>
      <p className="text-sm font-semibold text-red-700">Send only {CRYPTO_METHODS[method].asset} using {CRYPTO_METHODS[method].label}. Other assets or networks may result in lost funds.</p>
      <div className="rounded-xl border bg-gray-50 p-4 space-y-2"><p className="text-sm font-semibold">Receiving address</p><code className="block break-all text-sm">{CRYPTO_METHODS[method].address}</code><button type="button" className="text-orange-600 text-sm font-bold" onClick={async () => { try { await navigator.clipboard.writeText(CRYPTO_METHODS[method].address); setNotice('Address copied. Check the selected network before sending.') } catch { setNotice('Please copy the address manually.') } }}>Copy address</button></div>
      <label className="block text-sm font-bold">{CRYPTO_METHODS[method].asset} amount sent<input type="text" inputMode="decimal" value={cryptoAmount} onChange={event => setCryptoAmount(event.target.value)} placeholder={method === 'usdt_trc20' ? 'e.g. 5.00' : 'e.g. 0.002'} className="block w-full border rounded-xl p-3 mt-1" /></label>
      <label className="block text-sm font-bold">Agreed wallet credit (XAF)<input type="number" min="3000" max="10000000" step="1" value={requestedCredit} onChange={event => setRequestedCredit(event.target.value)} className="block w-full border rounded-xl p-3 mt-1" /></label>
      <label className="block text-sm font-bold">Blockchain transaction hash<input type="text" value={hash} onChange={event => setHash(event.target.value)} placeholder={CRYPTO_METHODS[method].evm ? '0x…' : '64 hexadecimal characters (no 0x prefix)'} className="block w-full border rounded-xl p-3 mt-1" /></label>
      <p className="text-xs text-gray-500">Submitting a hash is not proof of payment. We verify the received deposit, ownership and XAF value before crediting your wallet.</p>
      <button type="button" onClick={() => void submit()} disabled={busy} className="w-full bg-orange-600 text-white font-bold rounded-xl p-3 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit transfer for review'}</button>
      <h3 className="font-bold">Your crypto deposits</h3>
      {!claims.length && <p className="text-sm text-gray-500">No deposits submitted yet.</p>}
      {claims.map(claim => <div key={claim.id} className="border rounded-xl p-3 text-sm"><p>{CRYPTO_METHODS[claim.payment_method].label} · {claim.crypto_amount} {CRYPTO_METHODS[claim.payment_method].asset}</p><p className="capitalize">{claim.status} · {claim.status === 'confirmed' ? `Credited: ${claim.approved_amount_xaf} XAF` : `Requested: ${claim.amount_xaf} XAF`}</p></div>)}
    </>}
  </section>
}
