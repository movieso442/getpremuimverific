import { NextResponse } from 'next/server'
import liveServices from '@/lib/liveServices.json'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { service_id, link, quantity } = await request.json()
    const service = (liveServices as any[]).find((item) => item.id === Number(service_id))

    if (!service || !link || !Number.isInteger(Number(quantity)) || Number(quantity) < service.min || Number(quantity) > service.max)
      return NextResponse.json({ error: 'The selected service, link, or quantity is not valid.' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in before placing an order.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin.from('profiles').select('*').eq('user_id', user.id).single()
    if (profileError || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable. Please sign in again.' }, { status: 409 })

    // Prices from the browser are never trusted.
    const chargeXaf = Math.ceil(Number(service.rate_usd) * (Number(quantity) / 1000) * 600 * 1.25)
    if (Number(profile.balance_xaf) < chargeXaf)
      return NextResponse.json({ error: 'Insufficient wallet balance.', required_xaf: chargeXaf }, { status: 402 })

    const smmApiKey = process.env.SMM_PROVIDER_API_KEY
    const smmApiUrl = process.env.SMM_PROVIDER_API_URL

    if (!smmApiKey || !smmApiUrl)
      return NextResponse.json({ error: 'Live SMM provider is not configured. No order was created and no funds were charged.' }, { status: 503 })

    const formData = new URLSearchParams({ key: smmApiKey, action: 'add', service: String(service.id), link: String(link).trim(), quantity: String(quantity) })
    const providerRes = await fetch(smmApiUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData, signal: AbortSignal.timeout(20_000)
    })
    const providerData = await providerRes.json().catch(() => ({}))
    if (!providerRes.ok || !providerData.order)
      return NextResponse.json({ error: providerData.error || 'The SMM provider declined the order. No funds were charged.' }, { status: 502 })

    const { data: order, error: orderError } = await admin.from('smm_orders').insert({
      profile_id: profile.id, service_id: service.id, service_name: service.name, category: service.category,
      target_link: String(link).trim(), quantity: Number(quantity), charge_xaf: chargeXaf,
      status: 'pending', api_order_id: String(providerData.order), remains: Number(quantity)
    }).select().single()
    if (orderError) throw orderError

    const { error: transactionError } = await admin.from('wallet_transactions').insert({
      profile_id: profile.id, amount: chargeXaf, type: 'smm_order', payment_method: 'mtn_momo',
      reference: `SMM-${order.id}`, status: 'completed', description: `Live provider order ${providerData.order}`
    })
    if (transactionError) throw transactionError

    return NextResponse.json({ order, provider_order_id: String(providerData.order), charge_xaf: chargeXaf }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
