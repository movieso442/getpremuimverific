import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { CRYPTO_METHODS, isCryptoMethod, validCryptoAmount, validCryptoHash } from '@/lib/payments/manual-crypto'

async function customer(token?: string) {
  const admin = createAdminClient()
  if (token) {
    if (token.length < 32 || token.length > 256) return null
    const { data: link } = await admin.from('bot_payment_links')
      .select('id, profile_id, amount_xaf, payment_reference, expires_at').eq('token', token).maybeSingle()
    if (!link || new Date(link.expires_at).getTime() <= Date.now()) return null
    return { admin, profile: { id: link.profile_id }, link }
  }
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  return profile ? { admin, profile, link: null } : null
}

export async function GET(request: Request) {
  const access = await customer(new URL(request.url).searchParams.get('token') || undefined)
  if (!access) return NextResponse.json({ error: 'Sign in to view deposits.' }, { status: 401 })
  let query = access.admin.from('manual_payment_claims')
    .select('id, payment_method, crypto_amount, amount_xaf, approved_amount_xaf, transfer_reference, status, created_at')
    .eq('profile_id', access.profile.id).in('payment_method', Object.keys(CRYPTO_METHODS))
    .order('created_at', { ascending: false }).limit(20)
  if (access.link) query = query.eq('bot_payment_link_id', access.link.id)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Crypto deposits are not configured yet.' }, { status: 503 })
  return NextResponse.json({ claims: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const access = await customer(typeof body.token === 'string' ? body.token : undefined)
    if (!access) return NextResponse.json({ error: 'Sign in before submitting a deposit.' }, { status: 401 })
    const { payment_method, transfer_reference, crypto_amount, amount_xaf } = body
    if (typeof payment_method !== 'string' || !isCryptoMethod(payment_method)
      || typeof transfer_reference !== 'string' || !validCryptoHash(payment_method, transfer_reference.trim())
      || typeof crypto_amount !== 'string' || !validCryptoAmount(payment_method, crypto_amount)
      || !Number.isInteger(amount_xaf) || amount_xaf < 3000 || amount_xaf > 10000000) {
      return NextResponse.json({ error: 'Choose an asset/network, enter its valid transaction hash, positive crypto amount and requested credit of at least 3,000 XAF.' }, { status: 400 })
    }
    if (access.link?.payment_reference) return NextResponse.json({ error: 'This link already has a payment attempt. Request a new link from the bot.' }, { status: 409 })
    const { error } = await access.admin.from('manual_payment_claims').insert({
      profile_id: access.profile.id, payment_method, transfer_reference: transfer_reference.trim().toLowerCase(),
      crypto_amount, amount_xaf: access.link ? Number(access.link.amount_xaf) : amount_xaf, receiving_address: CRYPTO_METHODS[payment_method].address,
      bot_payment_link_id: access.link?.id ?? null,
    })
    if (error?.code === '23505') return NextResponse.json({ error: 'This transfer has already been submitted.' }, { status: 409 })
    if (error) return NextResponse.json({ error: 'Crypto deposits are not configured yet. Contact support before sending funds.' }, { status: 503 })
    scheduleAdminNotifications(access.admin)
    return NextResponse.json({ success: true, message: 'Submitted for review. No wallet credit until the received deposit and XAF value are verified.' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not submit deposit.' }, { status: 400 })
  }
}
