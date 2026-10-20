import { NextResponse } from 'next/server'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { CRYPTO_METHODS, isCryptoMethod, validCryptoAmount, validCryptoHash } from '@/lib/payments/manual-crypto'
import { normalizeCryptoReference } from '@/lib/payments/crypto-reference'
import { getMinimumTopupXaf } from '@/lib/payments/minimum'

async function customer(request: Request, token?: string) {
  const admin = createAdminClient()
  if (token) {
    if (token.length < 32 || token.length > 256) return null
    const { data: link } = await admin.from('bot_payment_links')
      .select('id, profile_id, amount_xaf, payment_reference, expires_at').eq('token', token).maybeSingle()
    if (!link || new Date(link.expires_at).getTime() <= Date.now()) return null
    return { admin, profile: { id: link.profile_id }, link }
  }
  const user = await customerUser(request)
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  return profile ? { admin, profile, link: null } : null
}

export async function GET(request: Request) {
  const access = await customer(request, new URL(request.url).searchParams.get('token') || undefined)
  if (!access) return NextResponse.json({ error: 'Sign in to view deposits.' }, { status: 401 })
  let query = access.admin.from('manual_payment_claims')
    .select('id, payment_method, crypto_amount, amount_xaf, approved_amount_xaf, transfer_reference, status, created_at, service_fee_xaf')
    .eq('profile_id', access.profile.id).in('payment_method', Object.keys(CRYPTO_METHODS))
    .order('created_at', { ascending: false }).limit(20)
  if (access.link) query = query.eq('bot_payment_link_id', access.link.id)
  const { data, error } = await query
  const { data: pendingClaim, error: claimError } = await access.admin.from('manual_payment_claims')
    .select('id,payment_method,crypto_amount,amount_xaf,approved_amount_xaf,status')
    .eq('profile_id', access.profile.id).eq('status', 'pending').order('created_at').limit(1).maybeSingle()
  const { data: pendingMobile, error: paymentError } = await access.admin.from('wallet_transactions')
    .select('reference,amount,payment_method').eq('profile_id', access.profile.id).eq('type', 'deposit').eq('status', 'pending').order('created_at').limit(1).maybeSingle()
  if (claimError || paymentError) return NextResponse.json({ error: 'Unable to check existing payments. Contact support before sending again.' }, { status: 503 })
  // Crypto history must not prevent checking/resuming mobile-money payments.
  // Check the mobile fee column independently and keep missing-schema methods
  // unavailable: taking money before the atomic payment migration is unsafe.
  const { error: mobileSetupError } = await access.admin.from('wallet_transactions').select('service_fee_xaf').limit(0)
  const { data: receipts, error: receiptError } = await access.admin.from('manual_payment_claims').select('id,receipt_storage_path').eq('profile_id', access.profile.id).order('created_at', { ascending: false }).limit(20)
  const receiptIds = new Set((receipts || []).filter(receipt => receipt.receipt_storage_path).map(receipt => receipt.id))
  return NextResponse.json({
    claims: (data || []).map(claim => ({ ...claim, receipt_attached: receiptIds.has(claim.id) })),
    methods: CRYPTO_METHODS,
    pending_claim: pendingClaim ? { ...pendingClaim, receipt_attached: receiptIds.has(pendingClaim.id) } : null,
    pending_mobile: pendingMobile, receipt_upload_available: !receiptError,
    crypto_available: !error, mobile_available: !mobileSetupError,
    availability_notice: error && mobileSetupError
      ? 'Payments are temporarily unavailable while we complete wallet setup. Please contact support before sending money.'
      : error ? 'Crypto top-ups are temporarily unavailable. You can use an available mobile-money method.'
      : mobileSetupError ? 'Mobile-money top-ups are temporarily unavailable. Contact support for help.' : null,
    fixed_credit_xaf: access.link ? Number(access.link.amount_xaf) : null,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.accepted_fee_percent !== 2) return NextResponse.json({ error: 'Refresh checkout and review the 2% service fee before submitting.' }, { status: 409 })
    const access = await customer(request, typeof body.token === 'string' ? body.token : undefined)
    if (!access) return NextResponse.json({ error: 'Sign in before submitting a deposit.' }, { status: 401 })
    const minimumXaf = await getMinimumTopupXaf(access.admin)
    const { payment_method, transfer_reference, crypto_amount, amount_xaf } = body
    const normalized = typeof payment_method === 'string' && isCryptoMethod(payment_method) && typeof transfer_reference === 'string'
      ? normalizeCryptoReference(payment_method, transfer_reference) : null
    if (typeof payment_method !== 'string' || !isCryptoMethod(payment_method)
      || !normalized || !validCryptoHash(payment_method, normalized)
      || typeof crypto_amount !== 'string' || !validCryptoAmount(payment_method, crypto_amount)
      || !Number.isInteger(amount_xaf) || amount_xaf < minimumXaf || amount_xaf > 10000000) {
      return NextResponse.json({ error: `Enter the payment reference from your receipt, the crypto amount sent and at least ${minimumXaf.toLocaleString()} XAF wallet credit.` }, { status: 400 })
    }
    const { data: claimId, error } = await access.admin.rpc('submit_crypto_payment', {
      p_profile: access.profile.id, p_method: payment_method, p_hash: normalized,
      p_crypto: crypto_amount, p_credit: access.link ? Number(access.link.amount_xaf) : amount_xaf,
      p_address: CRYPTO_METHODS[payment_method].address, p_link: access.link?.id ?? null,
    })
    if (error?.code === '23505' || error?.code === 'P0001') return NextResponse.json({ error: 'An existing payment is being checked or this reference was already used. Check your payment status or contact support before sending again.' }, { status: 409 })
    if (error) return NextResponse.json({ error: 'Crypto deposits are not configured yet. Contact support before sending funds.' }, { status: 503 })
    scheduleAdminNotifications(access.admin)
    return NextResponse.json({ success: true, claim_id: claimId, message: 'Payment details received. Your wallet updates after the transfer is received and checked.' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not submit deposit.' }, { status: 400 })
  }
}
