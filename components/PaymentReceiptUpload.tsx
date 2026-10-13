'use client'
import { useState } from 'react'
import { RECEIPT_MAX_BYTES } from '@/lib/payments/receipt-image'

export async function uploadPaymentReceipt(claimId: string, receipt: File, token?: string) {
  const form = new FormData()
  form.set('claim_id', claimId); form.set('receipt', receipt)
  if (token) form.set('token', token)
  const response = await fetch('/api/payments/manual-crypto/receipt', { method: 'POST', body: form })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not upload your receipt.')
}

export default function PaymentReceiptUpload({ claimId, token, attached = false }: { claimId: string; token?: string; attached?: boolean }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [notice, setNotice] = useState('')
  if (attached || uploaded) return <a className="mt-4 inline-block font-semibold text-orange-700 underline" href={`/api/payments/manual-crypto/receipt?claim=${encodeURIComponent(claimId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`} target="_blank" rel="noopener noreferrer">View uploaded receipt</a>
  return <div className="mt-4 space-y-3 border-t border-amber-200 pt-4">
    <label className="block font-semibold">Add payment screenshot (optional)<input aria-label="Add payment screenshot" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-2 block w-full min-w-0 text-base" onChange={event => { const selected = event.target.files?.[0]; setNotice(''); if (selected && selected.size > RECEIPT_MAX_BYTES) { setFile(null); setNotice('Use an image smaller than 3 MB.'); return } setFile(selected || null) }} /></label>
    <p className="text-sm">PNG, JPG or WebP, up to 3 MB. Hide passwords, PINs and unrelated personal information.</p>
    <button type="button" disabled={!file || busy} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50" onClick={async () => { if (!file || busy) return; setBusy(true); try { await uploadPaymentReceipt(claimId, file, token); setUploaded(true); setNotice('Receipt uploaded privately. Payment still needs confirmation.') } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Upload failed.') } finally { setBusy(false) } }}>{busy ? 'Uploading…' : 'Upload screenshot'}</button>
    {notice && <p role="status">{notice}</p>}
  </div>
}
