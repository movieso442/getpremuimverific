import { NextResponse } from 'next/server'
import liveServices from '@/lib/liveServices.json'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings, retailPrice } from '@/lib/platform/settings'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryFilter = searchParams.get('category')
    const searchFilter = searchParams.get('search')?.toLowerCase()

    const admin = createAdminClient()
    // The administrator sync endpoint stores the live JAP response here. This
    // avoids handing a provider key to visitors and gives public pages a fast,
    // current catalogue. Checkout still re-checks JAP before any charge.
    const { data: catalog, error: catalogError } = await admin.from('smm_services')
      .select('service_id, name, category, rate_usd, rate_xaf, min, max, dripfeed, refill, cancel, service_type, updated_at')
      .order('category')
    if (catalogError) throw catalogError
    let services: any[] = (catalog || []).map((service) => ({
      ...service,
      id: service.service_id,
    }))
    // Keep the public catalogue usable before the first admin sync, while every
    // order endpoint independently validates the live provider price.
    if (services.length === 0) services = liveServices as any[]

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

    const settings = await getPlatformSettings(admin)
    const pricedServices = services.map((service) => ({
      ...service,
      retail_rate_xaf: retailPrice(Number(service.rate_usd) * 600, settings.smm_markup_multiplier),
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
