import { NextResponse } from 'next/server'
import liveServices from '@/lib/liveServices.json'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings, getSmmPriceOverrides, smmRetailRateXaf } from '@/lib/platform/settings'
import { collectCataloguePages, smmPlatform } from '@/lib/smm/catalogue'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryFilter = searchParams.get('category')
    const searchFilter = searchParams.get('search')?.toLowerCase()

    const admin = createAdminClient()
    // The administrator sync endpoint stores the live JAP response here. This
    // avoids handing a provider key to visitors and gives public pages a fast,
    // current catalogue. Checkout still re-checks JAP before any charge.
    const catalog = await collectCataloguePages(async(start,end)=>{
      const {data,error}=await admin.from('smm_services')
      .select('service_id, name, category, rate_usd, rate_xaf, min, max, dripfeed, refill, cancel, service_type, updated_at')
      .order('service_id').range(start,end)
      if(error)throw error
      return data||[]
    })
    let services: any[] = (catalog || []).map((service) => ({
      ...service,
      id: service.service_id,
    }))
    // Keep the public catalogue usable before the first admin sync, while every
    // order endpoint independently validates the live provider price.
    if (services.length === 0) services = liveServices as any[]
    // Seed placeholders and malformed/zero-price records are not purchasable services.
    services=services.filter(service=>Number.isInteger(Number(service.service_id||service.id))&&Number(service.service_id||service.id)>0&&typeof service.name==='string'&&service.name.trim().length>0&&typeof service.category==='string'&&Number.isFinite(Number(service.rate_usd))&&Number(service.rate_usd)>0&&Number(service.min)>0&&Number(service.max)>=Number(service.min))

    if (categoryFilter && categoryFilter !== 'Everything') {
      services = services.filter((s) => s.category.toLowerCase().includes(categoryFilter.toLowerCase()))
    }

    if (searchFilter) {
      services = services.filter(
        (s) =>
          s.name.toLowerCase().includes(searchFilter) ||
          s.category.toLowerCase().includes(searchFilter) ||
          String(s.service_id).includes(searchFilter)
      )
    }

    // Extract unique category names
    const categories = Array.from(new Set(services.map((s) => s.category)))

    const [settings, priceOverrides] = await Promise.all([
      getPlatformSettings(admin),
      getSmmPriceOverrides(admin),
    ])
    const pricedServices = services.map((service) => ({
      ...service,
      platform: smmPlatform(service),
      retail_rate_xaf: smmRetailRateXaf(Number(service.rate_usd), settings.smm_markup_multiplier, priceOverrides.get(Number(service.service_id || service.id)), settings.extra_service_markup_percent),
    }))

    return NextResponse.json({
      total: services.length,
      categories_count: categories.length,
      categories,
      services: pricedServices
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch SMM services' }, { status: 500 })
  }
}
