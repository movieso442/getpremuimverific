import type { SupabaseClient } from '@supabase/supabase-js'

type SmmOrderToSync = {
  id: string
  api_order_id: string | null
  quantity: number
}

type ProviderStatus = {
  status?: string
  start_count?: string | number
  remains?: string | number
  error?: string
}

function normalizeStatus(status: string): 'pending' | 'processing' | 'in_progress' | 'completed' | 'canceled' | 'partial' | null {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, '_')
  if (normalized === 'in_progress') return 'in_progress'
  if (normalized === 'pending' || normalized === 'processing' || normalized === 'completed' || normalized === 'partial') return normalized
  if (normalized === 'canceled' || normalized === 'cancelled') return 'canceled'
  return null
}

export async function syncSmmOrder(admin: SupabaseClient, order: SmmOrderToSync): Promise<{ updated: boolean; skipped?: string }> {
  if (!order.api_order_id) return { updated: false, skipped: 'Missing provider order ID' }
  const apiKey = process.env.SMM_PROVIDER_API_KEY
  const apiUrl = process.env.SMM_PROVIDER_API_URL
  if (!apiKey || !apiUrl) return { updated: false, skipped: 'SMM provider is not configured' }

  const providerOrderId = order.api_order_id.replace(/^JAP-/, '')
  const body = new URLSearchParams({ key: apiKey, action: 'status', order: providerOrderId })
  const response = await fetch(apiUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(20_000),
  })
  const provider = await response.json().catch(() => ({})) as ProviderStatus
  const status = provider.status ? normalizeStatus(provider.status) : null
  if (!response.ok || !status) return { updated: false, skipped: provider.error || 'Unrecognized provider status' }

  const startCount = Number(provider.start_count)
  const remains = Number(provider.remains)
  const update: { status: string; start_count?: number; remains?: number } = { status }
  if (Number.isFinite(startCount)) update.start_count = startCount
  if (Number.isFinite(remains)) update.remains = remains
  const { error } = await admin.from('smm_orders').update(update).eq('id', order.id)
  if (error) throw error
  return { updated: true }
}
