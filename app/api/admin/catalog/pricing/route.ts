import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'

export async function GET() {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const [{ data: services, error: servicesError }, { data: prices, error: pricesError }] = await Promise.all([
      access.admin.from('smm_services').select('service_id, name, category, rate_usd, min, max, updated_at').order('category').limit(5000),
      access.admin.from('smm_service_prices').select('service_id, retail_rate_xaf, is_active, updated_at'),
    ])
    if (servicesError) throw servicesError
    if (pricesError) throw pricesError
    const byService = new Map((prices || []).map((price) => [Number(price.service_id), price]))
    return NextResponse.json({ services: (services || []).map((service) => ({ ...service, override: byService.get(Number(service.service_id)) || null })) })
  } catch (error) {
    return NextResponse.json({ error: 'Could not load service pricing. Run the launch-readiness SQL upgrade, then sync the catalogue.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await request.json() as { service_id?: number; retail_rate_xaf?: number | null; is_active?: boolean }
    const serviceId = Number(body.service_id)
    const rate = body.retail_rate_xaf === null ? null : Number(body.retail_rate_xaf)
    if (!Number.isInteger(serviceId) || serviceId <= 0) return NextResponse.json({ error: 'A valid service is required.' }, { status: 400 })
    if (rate === null) {
      const { error } = await access.admin.from('smm_service_prices').delete().eq('service_id', serviceId)
      if (error) throw error
      return NextResponse.json({ success: true, reset: true })
    }
    if (!Number.isFinite(rate) || rate <= 0) return NextResponse.json({ error: 'Retail price must be greater than zero.' }, { status: 400 })
    const { error } = await access.admin.from('smm_service_prices').upsert({
      service_id: serviceId,
      retail_rate_xaf: Math.ceil(rate / 5) * 5,
      is_active: body.is_active !== false,
      updated_by: access.profile.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'service_id' })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not save the service price. Run the launch-readiness SQL upgrade first.' }, { status: 500 })
  }
}
