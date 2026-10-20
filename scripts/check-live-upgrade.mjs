import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase configuration is missing')

const db = createClient(url, key, { auth: { persistSession: false } })
const settings = await db.from('platform_settings')
  .select('minimum_topup_xaf,usd_per_eur_reference,usd_reference_date')
  .eq('id', true).single()
if (settings.error) throw new Error(`Settings: ${settings.error.message}`)
console.log('Daily minimum:', settings.data)

for (const table of [
  'account_service_requests', 'sms_providers', 'refund_requests',
  'customer_checkout_followups', 'manual_payment_claims',
]) {
  const result = await db.from(table).select('id').limit(1)
  if (result.error) throw new Error(`${table}: ${result.error.message}`)
  console.log(`${table}: ready`)
}
