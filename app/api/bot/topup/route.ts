import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPayunitConfig, paymentErrorMessage, PayunitStatusResponse } from '@/lib/payments/payunit'

export const dynamic = 'force-dynamic'

type BotPaymentLink = {
  id: string
  profile_id: string
  amount_xaf: number | string
  payment_reference: string | null
  expires_at: string
}

function validLink(link: BotPaymentLink | null): link is BotPaymentLink {
  return Boolean(link && new Date(link.expires_at).getTime() > Date.now())
}

async function loadLink(token: string) {
  if (!token || token.length < 32) return null
  const admin = createAdminClient()
  const { data } = await admin.from('bot_payment_links')
    .select('id, profile_id, amount_xaf, payment_reference, expires_at')
    .eq('token', token).maybeSingle()
  return data as BotPaymentLink | null
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const link = await loadLink(token)
  if (!validLink(link)) return NextResponse.json({ error: 'This secure top-up link has expired. Return to the bot to request a new one.' }, { status: 404 })

  const admin = createAdminClient()
  const { data: transaction } = link.payment_reference
    ? await admin.from('wallet_transactions').select('status').eq('reference', link.payment_reference).maybeSingle()
    : { data: null }
  const { data: manualClaim } = await admin.from('manual_payment_claims').select('status').eq('bot_payment_link_id', link.id).maybeSingle()
  return NextResponse.json({
    amount_xaf: Number(link.amount_xaf),
    expires_at: link.expires_at,
    status: transaction?.status || (manualClaim?.status === 'pending' ? 'manual_pending' : manualClaim?.status || 'ready'),
  })
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json() as { token?: string }
    const link = await loadLink(token || '')
    if (!validLink(link)) return NextResponse.json({ error: 'This secure top-up link has expired. Return to the bot to request a new one.' }, { status: 404 })

    const payunit = getPayunitConfig()
    if (!payunit) return NextResponse.json({ error: 'Payments are not configured yet. Please try again later.' }, { status: 503 })
    const admin = createAdminClient()
    const amount = Math.round(Number(link.amount_xaf))

    const { data: manualClaim } = await admin.from('manual_payment_claims').select('id').eq('bot_payment_link_id', link.id).maybeSingle()
    if (manualClaim) return NextResponse.json({ error: 'This payment was submitted for manual verification. Please wait for confirmation or request a new link from the bot.' }, { status: 409 })

    if (link.payment_reference) {
      const { data: existing } = await admin.from('wallet_transactions').select('status').eq('reference', link.payment_reference).maybeSingle()
      if (existing?.status === 'completed') return NextResponse.json({ status: 'completed', credited: true })
      return NextResponse.json({ error: 'A payment attempt already exists for this link. Return to the bot for a new secure link.' }, { status: 409 })
    }

    const transactionId = `PVB${Date.now()}${Math.floor(Math.random() * 1000)}`
    const { error: pendingError } = await admin.from('wallet_transactions').insert({
      profile_id: link.profile_id,
      amount,
      type: 'deposit',
      payment_method: 'mtn_momo',
      reference: transactionId,
      status: 'pending',
      description: 'Bot wallet top-up awaiting Payunit confirmation',
    })
    if (pendingError) throw pendingError

    const { error: linkError } = await admin.from('bot_payment_links')
      .update({ payment_reference: transactionId }).eq('id', link.id).is('payment_reference', null)
    if (linkError) throw linkError

    const response = await fetch(`${payunit.baseUrl}/api/gateway/initialize`, {
      method: 'POST',
      headers: payunit.headers,
      body: JSON.stringify({
        total_amount: amount,
        currency: 'XAF',
        transaction_id: transactionId,
        return_url: `${payunit.appUrl}/bot-topup?token=${encodeURIComponent(token || '')}`,
        notify_url: `${payunit.appUrl}/api/payments/webhooks/payunit`,
        app_id: payunit.appId,
        payment_country: 'CM',
        description: `Premium Verify wallet top-up (${amount} XAF)`,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    const payment = await response.json().catch(() => ({})) as PayunitStatusResponse
    const paymentUrl = payment.data?.transaction_url || payment.data?.payment_url
    if (!response.ok || payment.status !== 'SUCCESS' || !paymentUrl) {
      await admin.from('wallet_transactions').update({ status: 'failed' }).eq('reference', transactionId)
      return NextResponse.json({ error: paymentErrorMessage(payment) }, { status: 502 })
    }
    return NextResponse.json({ payment_url: paymentUrl })
  } catch (error: unknown) {
    console.error('[Bot top-up initialization failed]', error)
    return NextResponse.json({ error: 'We could not start this payment. Please request a fresh link from the bot.' }, { status: 502 })
  }
}
