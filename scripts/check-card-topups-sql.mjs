// Isolated PostgreSQL-compatible checks. Never connects to production.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email_confirmed_at TIMESTAMPTZ,is_anonymous BOOLEAN);
    CREATE TABLE profiles(id UUID PRIMARY KEY,user_id UUID,balance_xaf NUMERIC DEFAULT 0);
    CREATE TABLE wallet_transactions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),profile_id UUID,amount NUMERIC,type TEXT,payment_method TEXT,reference TEXT UNIQUE,status TEXT,service_fee_xaf NUMERIC DEFAULT 0,description TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE manual_payment_claims(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),profile_id UUID,status TEXT);`)
  const base = await readFile('supabase/all-platform-upgrades.sql','utf8')
  const balance = base.match(/CREATE OR REPLACE FUNCTION public\.update_user_balance\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/g).at(-1)
  await db.exec(balance + 'CREATE TRIGGER balance_test AFTER INSERT OR UPDATE OF status ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_user_balance();')
  await db.exec(await readFile('supabase/card-topups-upgrade.sql','utf8'))
  const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222', key='33333333-3333-4333-8333-333333333333'
  for (const id of [a,b]) {
    await db.query('INSERT INTO auth.users VALUES($1,NOW(),FALSE)',[id])
    await db.query('INSERT INTO profiles(id,user_id) VALUES($1,$1)',[id])
  }
  const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
  const reserve=(id,k=key,amount=5000)=>scalar('SELECT reserve_card_topup($1,$2,$3)',[id,k,amount])
  const first=await reserve(a)
  assert.equal(first.created,true)
  assert.equal((await reserve(a)).created,false)
  assert.equal((await reserve(a)).reference,first.reference)
  await assert.rejects(reserve(a,key,6000),/different amount/)
  await assert.rejects(reserve(a,crypto.randomUUID()),/existing payment/)
  const checkout='PU_LIVE_44444444-4444-4444-8444-444444444444'
  await assert.rejects(scalar('SELECT attach_card_checkout($1,$2,$3)',[first.reference,checkout,'https://evil.test/'+checkout]),/Invalid/)
  await scalar('SELECT attach_card_checkout($1,$2,$3)',[first.reference,checkout,'https://checkout.payunit.net/'+checkout])
  assert.equal(await scalar('SELECT claim_card_verification($1)',[first.reference]),checkout)
  assert.equal(await scalar('SELECT claim_card_verification($1)',[first.reference]),null)
  const finalize=(amount=5070,currency='XAF',mode='LIVE',id=checkout)=>scalar('SELECT finalize_card_topup($1,$2,$3,$4,$5,$6)',[first.reference,id,amount,currency,mode,'SUCCESS'])
  for (const args of [[5000],[5070,'USD'],[5070,'XAF','TEST'],[5070,'XAF','LIVE','other']]) await assert.rejects(finalize(...args),/proof does not match/)
  assert.equal(Number(await scalar('SELECT balance_xaf FROM profiles WHERE id=$1',[a])),0)
  assert.equal(await finalize(),'completed'); assert.equal(await finalize(),'completed')
  assert.equal(Number(await scalar('SELECT balance_xaf FROM profiles WHERE id=$1',[a])),5000)
  assert.equal(Number(await scalar('SELECT service_fee_xaf FROM wallet_transactions WHERE reference=$1',[first.reference])),70)
  const second=await reserve(b)
  assert.notEqual(second.reference,first.reference)
  // An unattached checkout cannot be finalized, even with a NULL checkout ID.
  await assert.rejects(scalar('SELECT finalize_card_topup($1,NULL,5070,$2,$3,$4)',[second.reference,'XAF','LIVE','SUCCESS']),/proof does not match/)
  for (const fn of ['reserve_card_topup(uuid,uuid,numeric)','attach_card_checkout(text,text,text)','claim_card_verification(text)','finalize_card_topup(text,text,numeric,text,text,text)']) {
    assert.equal(await scalar("SELECT has_function_privilege('authenticated',$1,'EXECUTE')",[fn]),false)
  }
  assert.equal(await scalar("SELECT has_table_privilege('authenticated','payunit_card_checkouts','SELECT')"),false)
  console.log('PASS card SQL: reservations/retries, cross-payment exclusion, fee separation, proof mismatches, missing checkout, verification throttling, duplicate confirmation and service-only access.')
} finally { await db.close() }
