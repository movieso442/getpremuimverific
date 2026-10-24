// Mechanical bundler for the one-paste Supabase SQL Editor upgrade.
// The source migrations remain independently reviewable and reusable.
import { readFile, writeFile } from 'node:fs/promises'

const sources = [
  'all-platform-upgrades.sql',
  'topup-fees-upgrade.sql',
  'payment-receipts-upgrade.sql',
  'customer-followups-upgrade.sql',
  'customer-followups-pending-upgrade.sql',
  'refund-process-upgrade.sql',
  'sms-providers-upgrade.sql',
  'account-service-requests-upgrade.sql',
  'daily-topup-minimum-upgrade.sql',
  'customer-support-number-upgrade.sql',
  'wallet-purchase-safety-upgrade.sql',
  'admin-wallet-credit-upgrade.sql',
  'service-markup-upgrade.sql',
]

const ecbResponse = await fetch('https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=csvdata', {
  signal: AbortSignal.timeout(15000), headers: { Accept: 'text/csv' },
})
if (!ecbResponse.ok) throw new Error('Could not get the current ECB reference observation')
const [ecbHeading, ecbRow] = (await ecbResponse.text()).trim().split(/\r?\n/)
const ecbFields = ecbHeading.split(',')
const ecbValues = ecbRow.split(',')
const ecbDate = ecbValues[ecbFields.indexOf('TIME_PERIOD')]
const ecbRate = ecbValues[ecbFields.indexOf('OBS_VALUE')]
if (!/^\d{4}-\d{2}-\d{2}$/.test(ecbDate || '') || !/^\d(?:\.\d{1,8})?$/.test(ecbRate || '')
  || Number(ecbRate) < 0.5 || Number(ecbRate) > 2
  || Date.now() - Date.parse(`${ecbDate}T00:00:00Z`) > 7 * 86400000)
  throw new Error('ECB reference observation is invalid or stale')

const sections = []
for (const filename of sources) {
  const raw = await readFile(new URL(`../supabase/${filename}`, import.meta.url), 'utf8')
  let sql = raw.replace(/\r\n/g, '\n').trim()
  const begins = [...sql.matchAll(/^BEGIN;$/gm)].length
  const commits = [...sql.matchAll(/^COMMIT;$/gm)].length
  if (begins !== commits || begins > 1) throw new Error(`Unexpected transaction wrapper in ${filename}`)
  if (begins === 1) {
    sql = sql.replace(/^BEGIN;\n/m, '').replace(/^COMMIT;\n?/m, '')
  }
  if (filename === 'all-platform-upgrades.sql') {
    sql = sql.replace(/^SELECT 'Database upgrades completed' AS result;\n?/m, '')
  }
  if (/^\s*(?:BEGIN|COMMIT);\s*$/m.test(sql)) throw new Error(`Nested transaction remains in ${filename}`)
  sections.push(`-- ================================================================\n-- ${filename}\n-- ================================================================\n${sql.trim()}`)
}

const header = `-- Premium Verific: complete catch-up SQL for an existing or new Supabase project.\n-- Paste this ENTIRE file into the Supabase SQL Editor and run it once.\n-- All changes are in one transaction: an error rolls everything back.\n-- Rerunning is supported by the source migrations, but do not run an older\n-- migration afterward: it could restore an obsolete 3,000 XAF minimum.\n-- No customer balances are reset. No card-top-up migration is included.\n-- No API, Resend, payment, or BeanSMS secrets belong in SQL.\n-- The embedded ECB observation is a short-lived seed; the server cron must\n-- refresh the USD $3-equivalent minimum on subsequent business days.\n\nBEGIN;`
const referenceSeed = `-- ECB USD per EUR observation on ${ecbDate}: ${ecbRate}.\n-- Skip this seed if the SQL is run more than seven days after observation.\nDO $$ BEGIN\n  IF CURRENT_DATE BETWEEN DATE '${ecbDate}' AND DATE '${ecbDate}' + 7 THEN\n    PERFORM public.set_daily_topup_reference(${ecbRate}, DATE '${ecbDate}');\n  END IF;\nEND $$;`
const footer = `COMMIT;\n\nSELECT 'Complete Supabase upgrade applied' AS result,\n  (SELECT minimum_topup_xaf FROM public.platform_settings WHERE id=TRUE) AS minimum_topup_xaf,\n  (SELECT usd_reference_date FROM public.platform_settings WHERE id=TRUE) AS usd_reference_date;\n`
const output = `${header}\n\n${sections.join('\n\n')}\n\n${referenceSeed}\n\n${footer}`
const target = new URL('../supabase/complete-current-upgrade.sql', import.meta.url)
await writeFile(target, output, 'utf8')
console.log(`Generated ${target.pathname} from ${sources.length} ordered migrations.`)
