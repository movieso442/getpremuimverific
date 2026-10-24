import { NextResponse } from 'next/server'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings, getSmmPriceOverrides, smmRetailRateXaf } from '@/lib/platform/settings'
import { fetchJapService } from '@/lib/providers/jap'
import { markWalletPurchaseSubmitted, PurchaseReservationError, releaseWalletPurchase, reserveWalletPurchase } from '@/lib/wallet/purchase-reservation'

export async function POST(request: Request) {
  try {
    const { service_id, link, quantity } = await request.json()
    if (!link || !Number.isInteger(Number(quantity)))
      return NextResponse.json({ error: 'The selected service, link, or quantity is not valid.' }, { status: 400 })

    const user = await customerUser(request)
    if (!user) return NextResponse.json({ error: 'Sign in before placing an order.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin.from('profiles').select('id, refund_hold').eq('user_id', user.id).single()
    if (profileError || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable. Please sign in again.' }, { status: 409 })
    if (profile.refund_hold) return NextResponse.json({ error: 'Purchases are paused while an unused-deposit return is being settled. Contact support.' }, { status: 409 })

    // Query JAP immediately before the charge. Browser and cached prices are never trusted.
    const service = await fetchJapService(Number(service_id))
    if (!service || Number(quantity) < service.min || Number(quantity) > service.max) {
      return NextResponse.json({ error: 'This live service is unavailable or the quantity is outside its current limits.' }, { status: 400 })
    }
    const [settings, priceOverrides] = await Promise.all([
      getPlatformSettings(admin),
      getSmmPriceOverrides(admin, [service.serviceId]),
    ])
    const retailRateXaf = smmRetailRateXaf(service.rateUsd, settings.smm_markup_multiplier, priceOverrides.get(service.serviceId), settings.extra_service_markup_percent)
    const chargeXaf = Math.ceil((retailRateXaf * Number(quantity)) / 1000)
    const smmApiKey = process.env.SMM_PROVIDER_API_KEY
    const smmApiUrl = process.env.SMM_PROVIDER_API_URL

    if (!smmApiKey || !smmApiUrl)
      return NextResponse.json({ error: 'Live SMM provider is not configured. No order was created and no funds were charged.' }, { status: 503 })

    const reservationId = await reserveWalletPurchase(admin, profile.id, 'smm_order', 'web', chargeXaf)
    const formData = new URLSearchParams({ key: smmApiKey, action: 'add', service: String(service.serviceId), link: String(link).trim(), quantity: String(quantity) })
    let providerRes: Response
    try {
      providerRes = await fetch(smmApiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData, signal: AbortSignal.timeout(20_000)
      })
    } catch (error) {
      console.error('[SMM supplier outcome unknown]', reservationId, error)
      return NextResponse.json({ error: 'Supplier response is uncertain. Your funds are reserved; contact support before retrying.', reservation_id: reservationId }, { status: 503 })
    }
    const providerData = await providerRes.json().catch(() => ({})) as { order?: string | number; error?: string }
    if (!providerData.order) {
      if (providerData.error) {
        try { await releaseWalletPurchase(admin, reservationId) }
        catch (error) {
          console.error('[SMM supplier declined but release failed]', reservationId, error)
          return NextResponse.json({ error: 'Supplier declined, but releasing reserved funds needs support review.', reservation_id: reservationId }, { status: 503 })
        }
        return NextResponse.json({ error: providerData.error, charge_xaf: 0 }, { status: 502 })
      }
      console.error('[SMM supplier response without order ID]', reservationId, providerRes.status)
      return NextResponse.json({ error: 'Supplier response is uncertain. Your funds are reserved; contact support before retrying.', reservation_id: reservationId }, { status: 503 })
    }
    try { await markWalletPurchaseSubmitted(admin, reservationId, String(providerData.order)) }
    catch (error) {
      console.error('[SMM supplier accepted but reservation update failed]', reservationId, providerData.order, error)
      return NextResponse.json({ error: 'Supplier accepted the order but recording it needs support review. Your funds are reserved; do not retry.', reservation_id: reservationId }, { status: 503 })
    }

    const { data: order, error: orderError } = await admin.from('smm_orders').insert({
      id: reservationId,
      profile_id: profile.id, service_id: service.serviceId, service_name: service.name, category: service.category,
      target_link: String(link).trim(), quantity: Number(quantity), charge_xaf: chargeXaf,
      status: 'pending', api_order_id: String(providerData.order), remains: Number(quantity)
    }).select().single()
    if (orderError) {
      console.error('[SMM supplier accepted, local order save failed]', reservationId, orderError)
      return NextResponse.json({ error: 'Supplier accepted the order but saving it needs support review. Your funds are reserved; do not retry.', reservation_id: reservationId }, { status: 503 })
    }
    scheduleAdminNotifications(admin)

    return NextResponse.json({ order, provider_order_id: String(providerData.order), charge_xaf: chargeXaf }, { status: 201 })
  } catch (e: any) {
    if (e instanceof PurchaseReservationError)
      return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[SMM order failed]', e)
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
