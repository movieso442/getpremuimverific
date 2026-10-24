// Isolated PostgreSQL-compatible smoke test. Never connects to production.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

if (!process.argv[2]) throw new Error('Pass the installed PGlite dist/index.js path')
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ,is_anonymous BOOLEAN);
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS 'SELECT NULL::UUID';
    CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT,allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects(id UUID DEFAULT gen_random_uuid(),bucket_id TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `)
  const sql = await readFile('supabase/complete-current-upgrade.sql', 'utf8')
  await db.exec(sql)
  // A one-paste upgrade must also be safe if the owner reruns it after an
  // uncertain SQL Editor result. Existing wallet balances must not move.
  await db.exec("INSERT INTO public.profiles(email,balance_xaf) VALUES('smoke@example.invalid',9876)")
  await db.exec(sql)
  const balance = (await db.query("SELECT balance_xaf FROM public.profiles WHERE email='smoke@example.invalid'")).rows[0].balance_xaf
  assert.equal(Number(balance), 9876)
  const expectedTables = ['refund_requests','sms_providers','sms_provider_orders','account_service_requests',
    'customer_checkout_followups','customer_email_preferences','admin_notification_outbox','wallet_purchase_reservations']
  for (const table of expectedTables) {
    assert.equal((await db.query('SELECT to_regclass($1) AS name', [`public.${table}`])).rows[0].name, table)
  }
  const minimum = (await db.query('SELECT set_daily_topup_reference(1.1253,current_date) AS value')).rows[0].value
  assert.equal(Number(minimum), Math.ceil(3 * 655.957 / 1.1253))
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','start_wallet_topup(uuid,text,numeric,text,uuid)','EXECUTE') AS allowed")).rows[0].allowed, false)
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','submit_account_service_request(uuid,text,text,integer,text)','EXECUTE') AS allowed")).rows[0].allowed, false)
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','reserve_wallet_purchase(uuid,uuid,text,text,numeric)','EXECUTE') AS allowed")).rows[0].allowed, false)
  const profileId = (await db.query("SELECT id FROM public.profiles WHERE email='smoke@example.invalid'")).rows[0].id
  const firstId = '00000000-0000-4000-8000-000000000001'
  const secondId = '00000000-0000-4000-8000-000000000002'
  await db.query('SELECT public.reserve_wallet_purchase($1,$2,$3,$4,$5)', [firstId, profileId, 'smm_order', 'web', 6000])
  await assert.rejects(db.query('SELECT public.reserve_wallet_purchase($1,$2,$3,$4,$5)', [secondId, profileId, 'smm_order', 'web', 6000]), /Insufficient wallet balance/)
  assert.equal(Number((await db.query('SELECT balance_xaf FROM public.profiles WHERE id=$1', [profileId])).rows[0].balance_xaf), 3876)
  assert.equal(Number((await db.query('SELECT count(*) AS count FROM public.wallet_purchase_reservations WHERE profile_id=$1', [profileId])).rows[0].count), 1)
  await assert.rejects(db.query("INSERT INTO public.wallet_transactions(profile_id,amount,type,payment_method,reference,status) VALUES($1,4000,'smm_order','wallet','TEST-OVERDRAW','completed')", [profileId]), /Insufficient wallet balance/)
  await db.query('SELECT public.release_wallet_purchase($1)', [firstId])
  assert.equal(Number((await db.query('SELECT balance_xaf FROM public.profiles WHERE id=$1', [profileId])).rows[0].balance_xaf), 9876)
  assert.equal((await db.query('SELECT public.release_wallet_purchase($1) AS released', [firstId])).rows[0].released, false)
  console.log('PASS: complete SQL runs twice, preserves balances, and rejects overdrawn or duplicate purchase reservations')
} finally { await db.close() }
