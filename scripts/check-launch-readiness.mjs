// Read-only deployment/database smoke checks. No purchases, credits, messages,
// claim reviews or authenticated customer data are created/read by this script.
// Node 24's built-in loader does not overwrite already-set environment values.
process.loadEnvFile('.env.local')
process.loadEnvFile('.env')
const env = process.env
const base = (env.NEXT_PUBLIC_APP_URL || 'https://premiumverific.com').replace(/\/$/, '')
let failures = 0
for (const [path, expected] of [
  ['/api/mobile/sms/catalog', 200], ['/api/mobile/account', 401],
  ['/api/v1/sms/order', 401], ['/api/admin/overview', 401],
  ['/api/admin/manual-payments', 401], ['/api/cron/sms-status', 401],
  ['/api/cron/smm-status', 401], ['/downloads', 200],
]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(20000) })
  const ok = response.status === expected
  failures += Number(!ok)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path}: ${response.status} (expected ${expected})`)
}
const invalid = await fetch(base + '/api/mobile/account', { headers: { Authorization: 'Bearer not-a-valid-user-token' }, signal: AbortSignal.timeout(20000) })
failures += Number(invalid.status !== 401)
console.log(`${invalid.status === 401 ? 'PASS' : 'FAIL'} invalid native token: ${invalid.status}`)

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Server database configuration is missing')
await Promise.all([
  ['profiles', 'id,telegram_chat_id'], ['sms_orders', 'id,provider_order_id,sms_code'],
  ['smm_orders', 'id,api_order_id'], ['wallet_transactions', 'id,reference'],
  ['platform_settings', 'id'], ['smm_service_prices', 'service_id'],
  ['bot_payment_links', 'id'], ['manual_payment_claims', 'id,crypto_amount,approved_amount_xaf'],
  ['admin_notification_outbox', 'id,first_attempt_at'], ['audit_events', 'id'],
].map(async ([table, columns]) => {
  const response = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/' + table + '?select=' + columns + '&limit=0', {
    method: 'HEAD', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY },
    signal: AbortSignal.timeout(20000),
  })
  failures += Number(!response.ok)
  console.log(`${response.ok ? 'PASS' : 'FAIL'} database ${table} required columns: ${response.status}`)
}))
console.log('These smoke checks do not verify grants/triggers, concurrency, real payments, refunds, OTP delivery or device behavior.')
process.exitCode = failures ? 1 : 0
