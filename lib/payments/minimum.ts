import type { SupabaseClient } from '@supabase/supabase-js'

export const USD_MINIMUM_TOPUP = 3
export const EUR_XAF_PEG = 655.957
export const FALLBACK_MINIMUM_TOPUP_XAF = 3000

export function minimumXafFromUsdPerEur(usdPerEur: number) {
  if (!Number.isFinite(usdPerEur) || usdPerEur < 0.5 || usdPerEur > 2) throw new Error('Invalid reference rate')
  return Math.ceil(USD_MINIMUM_TOPUP * EUR_XAF_PEG / usdPerEur)
}

export function validMinimumXaf(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 900 && Number(value) <= 4000
}

export async function getMinimumTopupXaf(admin: SupabaseClient): Promise<number> {
  const { data, error } = await admin.from('platform_settings').select('minimum_topup_xaf').eq('id', true).maybeSingle()
  if (error || !validMinimumXaf(Number(data?.minimum_topup_xaf))) return FALLBACK_MINIMUM_TOPUP_XAF
  return Number(data!.minimum_topup_xaf)
}

export async function getTopupReference(admin: SupabaseClient) {
  const { data, error } = await admin.from('platform_settings')
    .select('minimum_topup_xaf,usd_per_eur_reference,usd_reference_date').eq('id', true).maybeSingle()
  if (error || !data) return { minimumXaf: FALLBACK_MINIMUM_TOPUP_XAF, usdXafRate: 600, date: null }
  const minimumXaf = validMinimumXaf(Number(data.minimum_topup_xaf)) ? Number(data.minimum_topup_xaf) : FALLBACK_MINIMUM_TOPUP_XAF
  const usdPerEur = Number(data.usd_per_eur_reference)
  return { minimumXaf, usdXafRate: Number.isFinite(usdPerEur) && usdPerEur > 0.5 && usdPerEur < 2 ? EUR_XAF_PEG / usdPerEur : 600,
    date: data.usd_reference_date || null }
}

export function parseEcbUsdRate(csv: string, now = new Date()) {
  const [heading, row] = csv.trim().split(/\r?\n/)
  if (!heading || !row) throw new Error('Missing ECB observation')
  const fields = heading.split(',').map(value => value.replace(/^"|"$/g, ''))
  const values = row.split(',').map(value => value.replace(/^"|"$/g, ''))
  const date = values[fields.indexOf('TIME_PERIOD')]
  const usdPerEur = Number(values[fields.indexOf('OBS_VALUE')])
  const observedAt = Date.parse(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(observedAt)
    || observedAt > now.getTime() || now.getTime() - observedAt > 7 * 86400000) throw new Error('ECB observation is stale')
  return { date, usdPerEur, minimumTopupXaf: minimumXafFromUsdPerEur(usdPerEur) }
}
