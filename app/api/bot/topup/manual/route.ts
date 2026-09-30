import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Link = { id: string; profile_id: string; amount_xaf: number | string; payment_reference: string | null; expires_at: string }

async function loadLink(token: string) {
  if (!token || token.length < 32) return null
  const admin = createAdminClient()
  const { data } = await admin.from('bot_payment_links').select('id, profile_id, amount_xaf, payment_reference, expires_at').eq('token', token).maybeSingle()
  return data as Link | null
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; payment_method?: string; payer_phone?: string; transfer_reference?: string }
    const link = await loadLink(body.token || '')
    if (!link || new Date(link.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: 'This secure top-up link has expired. Return to the bot for a new one.' }, { status: 404 })
    if (link.payment_reference) return NextResponse.json({ error: 'This link already has a payment attempt. Return to the bot for a new link.' }, { status: 409 })
    const method = body.payment_method === 'orange_money' ? 'orange_money' : body.payment_method === 'mtn_momo' ? 'mtn_momo' : null
    const reference = body.transfer_reference?.trim().replace(/\s+/g, ' ')
    const payerPhone = body.payer_phone?.trim().replace(/[^0-9+ ]/g, '').slice(0, 30) || null
    if (!method || !reference || reference.length < 3 || reference.length > 120) return NextResponse.json({ error: 'Choose MTN or Orange and enter the payment reference from the confirmation message.' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('manual_payment_claims').insert({
      bot_payment_link_id: link.id,
      profile_id: link.profile_id,
      amount_xaf: Math.round(Number(link.amount_xaf)),
      payment_method: method,
      payer_phone: payerPhone,
      transfer_reference: reference,
    })
    if (error?.code === '23505') return NextResponse.json({ error: 'This payment has already been submitted for review.' }, { status: 409 })
    if (error) throw error
    return NextResponse.json({ success: true, message: 'Payment submitted for verification. Your wallet will be credited only after our team confirms the transfer.' }, { status: 201 })
  } catch (error) {
    console.error('[Manual payment claim failed]', error)
    return NextResponse.json({ error: 'Could not submit the payment for review. Please contact support at 677034736.' }, { status: 500 })
  }
}
