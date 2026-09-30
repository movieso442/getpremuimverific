type JapService = {
  service?: number | string
  id?: number | string
  name?: string
  category?: string
  rate?: number | string
  min?: number | string
  max?: number | string
  dripfeed?: boolean
  refill?: boolean
  cancel?: boolean
  type?: string
}

export type LiveSmmService = {
  serviceId: number
  name: string
  category: string
  rateUsd: number
  min: number
  max: number
  dripfeed: boolean
  refill: boolean
  cancel: boolean
  serviceType: string
}

export async function fetchJapServices(): Promise<LiveSmmService[]> {
  const url = process.env.SMM_PROVIDER_API_URL
  const key = process.env.SMM_PROVIDER_API_KEY
  if (!url || !key) throw new Error('Live SMM provider is not configured.')

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ key, action: 'services' }),
    signal: AbortSignal.timeout(30_000),
  })
  const payload = await response.json().catch(() => ({})) as JapService[] | { error?: string }
  if (!response.ok || !Array.isArray(payload)) throw new Error(!Array.isArray(payload) && payload.error ? payload.error : 'Could not retrieve live SMM services.')

  return payload.map((service) => ({
    serviceId: Number(service.service ?? service.id),
    name: String(service.name || 'Unnamed service'),
    category: String(service.category || 'Other'),
    rateUsd: Number(service.rate),
    min: Number(service.min),
    max: Number(service.max),
    dripfeed: Boolean(service.dripfeed),
    refill: Boolean(service.refill),
    cancel: Boolean(service.cancel),
    serviceType: String(service.type || 'Default'),
  })).filter((service) => Number.isInteger(service.serviceId) && Number.isFinite(service.rateUsd) && service.min > 0 && service.max >= service.min)
}

export async function fetchJapService(serviceId: number) {
  const services = await fetchJapServices()
  return services.find((service) => service.serviceId === serviceId) || null
}
