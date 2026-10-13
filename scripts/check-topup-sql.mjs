// Isolated PostgreSQL-compatible test database. No production connection.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE profiles(id UUID PRIMARY KEY, role TEXT, balance_xaf NUMERIC DEFAULT 0);
    CREATE TABLE platform_settings(id BOOLEAN PRIMARY KEY, support_phone TEXT, whatsapp_number TEXT, updated_at TIMESTAMPTZ);
    CREATE TABLE bot_payment_links(id UUID PRIMARY KEY, profile_id UUID, amount_xaf NUMERIC, payment_reference TEXT UNIQUE, expires_at TIMESTAMPTZ);
    CREATE TABLE wallet_transactions(id UUID DEFAULT gen_random_uuid() PRIMARY KEY, profile_id UUID, amount NUMERIC, type TEXT, payment_method TEXT, reference TEXT UNIQUE, status TEXT, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE manual_payment_claims(id UUID DEFAULT gen_random_uuid() PRIMARY KEY, profile_id UUID, payment_method TEXT, transfer_reference TEXT, crypto_amount NUMERIC, amount_xaf NUMERIC, receiving_address TEXT, bot_payment_link_id UUID UNIQUE, status TEXT DEFAULT 'pending', reviewed_by UUID, reviewed_at TIMESTAMPTZ, approved_amount_xaf NUMERIC);
    CREATE UNIQUE INDEX crypto_receipt_unique ON manual_payment_claims(payment_method,lower(transfer_reference));
    INSERT INTO platform_settings(id) VALUES(TRUE);
  `)
  await db.exec(await readFile('supabase/topup-fees-upgrade.sql', 'utf8'))
  const combined = await readFile('supabase/all-platform-upgrades.sql', 'utf8')
  const balance = combined.match(/CREATE OR REPLACE FUNCTION public\.update_user_balance\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/)[0]
  await db.exec(balance + `CREATE TRIGGER test_balance AFTER INSERT OR UPDATE OF status ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_user_balance();`)
  const manual = await readFile('supabase/manual-crypto-upgrade.sql', 'utf8')
  await db.exec(manual.slice(manual.indexOf('CREATE OR REPLACE FUNCTION public.review_manual_payment'), manual.indexOf('-- Customers must')))
  const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444']
  for (const [i, id] of ids.entries()) await db.query('INSERT INTO profiles(id,role) VALUES($1,$2)', [id, i === 3 ? 'admin' : 'client'])
  const start = async (id, reference, link = null) => (await db.query('SELECT start_wallet_topup($1,$2,5000,$3,$4) AS result', [id, reference, 'mtn_momo', link])).rows[0].result
  assert.equal((await start(ids[0], 'PV-first')).created, true)
  assert.equal(Number((await db.query("SELECT service_fee_xaf FROM wallet_transactions WHERE reference='PV-first'")).rows[0].service_fee_xaf), 0)
  assert.equal((await start(ids[0], 'PV-first')).created, false)
  assert.equal((await start(ids[0], 'PV-other-tab')).reference, 'PV-first')
  const submit = async (id, hash, link = null) => (await db.query('SELECT submit_crypto_payment($1,$2,$3,8.5,5000,$4,$5) AS id', [id, 'usdt_trc20', hash, 'test-receiving-address', link])).rows[0].id
  await assert.rejects(submit(ids[0], 'a'.repeat(64)), /existing payment/)
  const claim = await submit(ids[1], 'b'.repeat(64))
  assert.equal(await submit(ids[1], 'b'.repeat(64)), claim)
  await assert.rejects(submit(ids[1], 'c'.repeat(64)), /existing payment/)
  await assert.rejects(submit(ids[2], 'b'.repeat(64)), /already used/)
  await db.query('SELECT review_manual_payment($1,$2,$3,5000)', [claim, ids[3], 'confirm'])
  await assert.rejects(db.query('SELECT review_manual_payment($1,$2,$3,5000)', [claim, ids[3], 'confirm']), /already reviewed/)
  const row = (await db.query('SELECT amount,service_fee_xaf FROM wallet_transactions WHERE profile_id=$1', [ids[1]])).rows[0]
  assert.equal(Number(row.amount), 5000); assert.equal(Number(row.service_fee_xaf), 100)
  assert.equal(Number((await db.query('SELECT balance_xaf FROM profiles WHERE id=$1', [ids[1]])).rows[0].balance_xaf), 5000)
  await db.query("UPDATE wallet_transactions SET status='completed' WHERE reference='PV-first'")
  await db.query("UPDATE wallet_transactions SET status='completed' WHERE reference='PV-first'")
  assert.equal(Number((await db.query('SELECT balance_xaf FROM profiles WHERE id=$1', [ids[0]])).rows[0].balance_xaf), 5000)
  const linkId = '55555555-5555-4555-8555-555555555555'
  await db.query("INSERT INTO bot_payment_links VALUES($1,$2,5000,NULL,NOW()+INTERVAL '30 minutes')", [linkId, ids[2]])
  assert.equal((await start(ids[2], 'PVB-first', linkId)).created, true)
  assert.equal((await start(ids[2], 'PVB-retry', linkId)).reference, 'PVB-first')
  assert.equal(Number((await db.query('SELECT count(*) FROM wallet_transactions WHERE profile_id=$1', [ids[2]])).rows[0].count), 1)
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','start_wallet_topup(uuid,text,numeric,text,uuid)','EXECUTE') AS allowed")).rows[0].allowed, false)
  await db.exec(`CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id TEXT PRIMARY KEY,name TEXT,public BOOLEAN,file_size_limit BIGINT,allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects(id UUID DEFAULT gen_random_uuid(),bucket_id TEXT);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO authenticated;
    GRANT SELECT, INSERT ON storage.objects TO authenticated;
    CREATE POLICY broad_access ON storage.objects FOR ALL TO authenticated USING(TRUE) WITH CHECK(TRUE);
    INSERT INTO storage.objects(bucket_id) VALUES('payment-receipts'),('other-bucket');`)
  await db.exec(await readFile('supabase/payment-receipts-upgrade.sql','utf8'))
  assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='payment-receipts'")).rows[0].public, false)
  await db.exec('SET ROLE authenticated')
  assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='payment-receipts'")).rows.length, 0)
  assert.equal((await db.query("SELECT * FROM storage.objects WHERE bucket_id='other-bucket'")).rows.length, 1)
  await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id) VALUES('payment-receipts')"), /row-level security/)
  await db.exec('RESET ROLE')
  console.log('PASS SQL: mobile fee zero, crypto fee 2%, exactly-once credit/retries, browser RPC denied, private receipt policy blocks broad browser grants without affecting other buckets')
} finally { await db.close() }
