import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { fetchJapServices } from '@/lib/providers/jap'

export const maxDuration = 60

export async function POST() {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const services = await fetchJapServices()
    const rows = services.map((service) => ({
      service_id: service.serviceId, name: service.name, category: service.category,
      rate_usd: service.rateUsd, rate_xaf: Math.ceil(service.rateUsd * 600),
      min: service.min, max: service.max, dripfeed: service.dripfeed, refill: service.refill,
      cancel: service.cancel, service_type: service.serviceType, updated_at: new Date().toISOString(),
    }))
    for (let index = 0; index < rows.length; index += 500) {
      const { error } = await access.admin.from('smm_services').upsert(rows.slice(index, index + 500), { onConflict: 'service_id' })
      if (error) throw error
    }
    return NextResponse.json({ success: true, synced: rows.length, synced_at: new Date().toISOString() })
  } catch (error: unknown) {
    console.error('[Admin catalogue sync failed]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not sync the live SMM catalogue.' }, { status: 502 })
  }
}
