import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isVerifiedOwner } from '@/lib/admin/owner'
import { RECEIPT_BUCKET, RECEIPT_MAX_BYTES, receiptImageType } from '@/lib/payments/receipt-image'

export const runtime = 'nodejs'
const json = (error: string, status: number) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

async function accessClaim(id: string, token: string | null, adminRead = false) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null
  const admin = createAdminClient()
  const { data: claim, error } = await admin.from('manual_payment_claims').select('id,profile_id,bot_payment_link_id,status,receipt_storage_path').eq('id', id).maybeSingle()
  if (error || !claim) return null
  if (token && token.length >= 32 && token.length <= 256) {
    const { data: link } = await admin.from('bot_payment_links').select('id,profile_id,expires_at').eq('token', token).maybeSingle()
    if (link && link.id === claim.bot_payment_link_id && link.profile_id === claim.profile_id && Date.parse(link.expires_at) > Date.now()) return { admin, claim }
    return null
  }
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (adminRead && isVerifiedOwner(user)) return { admin, claim }
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
  return profile?.id === claim.profile_id ? { admin, claim } : null
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json('Invalid upload request.', 403)
  if (Number(request.headers.get('content-length')) > RECEIPT_MAX_BYTES + 16384) return json('Use an image smaller than 3 MB.', 413)
  try {
    const form = await request.formData()
    const file = form.get('receipt')
    const id = form.get('claim_id')
    const token = form.get('token')
    if (!(file instanceof File) || typeof id !== 'string' || file.size > RECEIPT_MAX_BYTES || !file.size) return json('Choose a PNG, JPG or WebP image up to 3 MB.', 400)
    const access = await accessClaim(id, typeof token === 'string' ? token : null)
    if (!access) return json('Payment unavailable or receipt uploads are not configured.', 404)
    if (access.claim.status !== 'pending' || access.claim.receipt_storage_path) return json('This payment is reviewed or already has a receipt.', 409)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const type = receiptImageType(bytes)
    if (!type) return json('Choose a valid PNG, JPG or WebP image.', 400)
    const path = `${access.claim.profile_id}/${access.claim.id}/${randomUUID()}.${type.extension}`
    const { error: uploadError } = await access.admin.storage.from(RECEIPT_BUCKET).upload(path, bytes, { contentType: type.mime, upsert: false })
    if (uploadError) return json('Could not upload the receipt. Please retry or contact support.', 503)
    const { data, error } = await access.admin.from('manual_payment_claims').update({ receipt_storage_path: path }).eq('id', id).eq('profile_id', access.claim.profile_id).eq('status', 'pending').is('receipt_storage_path', null).select('id').maybeSingle()
    if (error || !data) {
      await access.admin.storage.from(RECEIPT_BUCKET).remove([path])
      return json('This payment changed. Reload before uploading again.', 409)
    }
    return Response.json({ success: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch { return json('Could not upload this receipt.', 400) }
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const access = await accessClaim(params.get('claim') || '', params.get('token'), true)
    if (!access?.claim.receipt_storage_path) return json('Receipt not found.', 404)
    const { data, error } = await access.admin.storage.from(RECEIPT_BUCKET).download(access.claim.receipt_storage_path)
    if (error || !data) return json('Receipt not found.', 404)
    const bytes = new Uint8Array(await data.arrayBuffer())
    const type = receiptImageType(bytes)
    if (!type) return json('Receipt unavailable.', 404)
    return new Response(bytes, { headers: { 'Content-Type': type.mime, 'Content-Disposition': `inline; filename="payment-receipt.${type.extension}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } })
  } catch { return json('Receipt unavailable.', 503) }
}
