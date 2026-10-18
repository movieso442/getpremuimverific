'use client'
import { useState } from 'react'
import { RECEIPT_MAX_BYTES } from '@/lib/payments/receipt-image'
import {useTranslations} from 'next-intl'

export async function uploadPaymentReceipt(claimId: string, receipt: File, token?: string) {
  const form = new FormData()
  form.set('claim_id', claimId); form.set('receipt', receipt)
  if (token) form.set('token', token)
  const response = await fetch('/api/payments/manual-crypto/receipt', { method: 'POST', body: form })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not upload your receipt.')
}

export default function PaymentReceiptUpload({ claimId, token, attached = false }: { claimId: string; token?: string; attached?: boolean }) {
  const t = useTranslations('Receipt')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [notice, setNotice] = useState('')
  if (attached || uploaded) return <a className="mt-4 inline-block font-semibold text-orange-700 underline" href={`/api/payments/manual-crypto/receipt?claim=${encodeURIComponent(claimId)}${token ? `&token=${encodeURIComponent(token)}` : ''}`} target="_blank" rel="noopener noreferrer">{t('view')}</a>
  return <div className="mt-4 space-y-3 border-t border-amber-200 pt-4">
    <label className="block font-semibold">{t('add')}<input aria-label={t('add')} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-2 block w-full min-w-0 text-base" onChange={event => { const selected = event.target.files?.[0]; setNotice(''); if (selected && selected.size > RECEIPT_MAX_BYTES) { setFile(null); setNotice(t('size')); return } setFile(selected || null) }} /></label>
    <p className="text-sm">{t('help')}</p>
    <button type="button" disabled={!file || busy} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50" onClick={async () => { if (!file || busy) return; setBusy(true); try { await uploadPaymentReceipt(claimId, file, token); setUploaded(true); setNotice(t('uploaded')) } catch (reason) { setNotice(reason instanceof Error ? reason.message : t('failed')) } finally { setBusy(false) } }}>{busy ? t('uploading') : t('upload')}</button>
    {notice && <p role="status">{notice}</p>}
  </div>
}
