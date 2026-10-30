import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { getPlatformSettings, getSmmPriceOverrides, smmRetailRateXaf } from '@/lib/platform/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const [{ data: services, error: servicesError }, { data: smsOrders }, { data: smsCosts }, settings] = await Promise.all([
      access.admin.from('smm_services').select('service_id,name,category,rate_usd,min,max').order('category').limit(5000),
      access.admin.from('sms_orders').select('id,service_name,country_name,price_xaf,status,created_at').order('created_at', { ascending: false }).limit(1000),
      access.admin.from('sms_provider_orders').select('sms_order_id,actual_supplier_amount,quoted_supplier_amount,supplier_currency,cost_verified,supplier_service,supplier_country,sale_xaf').order('created_at', { ascending: false }).limit(1000),
      getPlatformSettings(access.admin),
    ])
    if (servicesError) throw servicesError
    const overrides = await getSmmPriceOverrides(access.admin)
    const fxXafPerUsd = 600
    const smm = (services || []).map((service) => {
      const cost = Number(service.rate_usd) * fxXafPerUsd
      const override = overrides.get(Number(service.service_id))
      const retail = smmRetailRateXaf(Number(service.rate_usd), settings.smm_markup_multiplier, override, settings.extra_service_markup_percent)
      return { service_id: service.service_id, name: service.name, category: service.category, provider_cost_xaf_per_1k: cost, retail_xaf_per_1k: retail, gross_profit_xaf_per_1k: retail - cost, gross_markup_percent: cost ? ((retail - cost) / cost) * 100 : null, min: service.min, max: service.max }
    }).sort((a, b) => b.gross_profit_xaf_per_1k - a.gross_profit_xaf_per_1k)
    const orderCostById = new Map((smsCosts || []).map((row) => [row.sms_order_id, row]))
    const smsOrdersWithCosts = (smsOrders || []).map((order) => {
      const costRow = orderCostById.get(order.id)
      const recordedAmount = Number(costRow?.actual_supplier_amount ?? costRow?.quoted_supplier_amount ?? 0)
      const usd = !costRow?.supplier_currency || costRow.supplier_currency === 'USD'
      const estimatedCost = usd ? recordedAmount * fxXafPerUsd : null
      return { id: order.id, service: order.service_name, country: order.country_name, status: order.status, sale_xaf: Number(order.price_xaf), provider_cost_xaf_estimate: estimatedCost, gross_profit_xaf_estimate: estimatedCost === null || !estimatedCost ? null : Number(order.price_xaf) - estimatedCost, cost_verified: Boolean(costRow?.cost_verified), created_at: order.created_at }
    })
    const smsGroups = new Map<string, { service: string; country: string; order_count: number; sales_xaf: number; known_cost_xaf: number; known_cost_orders: number; estimated_gross_profit_xaf: number | null }>()
    for (const order of smsOrdersWithCosts) {
      const key = `${order.service}\u0000${order.country}`
      const group = smsGroups.get(key) || { service: order.service, country: order.country, order_count: 0, sales_xaf: 0, known_cost_xaf: 0, known_cost_orders: 0, estimated_gross_profit_xaf: null }
      group.order_count += 1
      group.sales_xaf += order.sale_xaf
      if (order.provider_cost_xaf_estimate !== null) {
        group.known_cost_xaf += order.provider_cost_xaf_estimate
        group.known_cost_orders += 1
      }
      group.estimated_gross_profit_xaf = group.known_cost_orders === group.order_count ? group.sales_xaf - group.known_cost_xaf : null
      smsGroups.set(key, group)
    }
    const sms = [...smsGroups.values()].sort((a, b) => (b.estimated_gross_profit_xaf ?? -Infinity) - (a.estimated_gross_profit_xaf ?? -Infinity))
    return NextResponse.json({ fx_xaf_per_usd_assumption: fxXafPerUsd, minimum_markup_percent: 25, smm, sms, sms_cost_records_available: Boolean(smsCosts) })
  } catch (error) {
    console.error('[Admin profitability failed]', error)
    return NextResponse.json({ error: 'Could not load profitability data. Run the latest provider and pricing database upgrades.' }, { status: 500 })
  }
}
