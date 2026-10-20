import type { SupabaseClient } from '@supabase/supabase-js'
import { parseEcbUsdRate } from './minimum'

const ECB_URL = 'https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata'

export async function refreshMinimumTopup(admin: SupabaseClient) {
  const response = await fetch(ECB_URL, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('ECB reference unavailable')
  const reference = parseEcbUsdRate(await response.text())
  const { data, error } = await admin.rpc('set_daily_topup_reference', {
    p_usd_per_eur: reference.usdPerEur, p_date: reference.date,
  })
  if (error) throw new Error('Could not save daily top-up reference')
  return { date: reference.date, minimum_topup_xaf: Number(data) }
}
