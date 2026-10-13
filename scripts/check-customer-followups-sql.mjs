// Local isolated SQL tests only; never connects to production or sends email.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const { PGlite } = await import(pathToFileURL(process.argv[2]).href)
const db = new PGlite()
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ,is_anonymous BOOLEAN);
    CREATE TABLE profiles(id UUID PRIMARY KEY,user_id UUID,balance_xaf NUMERIC DEFAULT 0);
    CREATE TABLE wallet_transactions(id UUID DEFAULT gen_random_uuid(),profile_id UUID,type TEXT,status TEXT,payment_method TEXT,created_at TIMESTAMPTZ DEFAULT NOW());`)
  await db.exec(await readFile('supabase/customer-followups-upgrade.sql','utf8'))
  const ids = Array.from({length: 5}, (_,i) => `${i+1}`.repeat(8) + '-' + `${i+1}`.repeat(4) + '-4' + `${i+1}`.repeat(3) + '-8' + `${i+1}`.repeat(3) + '-' + `${i+1}`.repeat(12))
  const events = ids.map(id => 'a' + id.slice(1))
  for (const [i,id] of ids.entries()) {
    await db.query('INSERT INTO auth.users VALUES($1,$2,$3,FALSE)',[id,`verified-${i}@example.com`,i===1 ? null : new Date().toISOString()])
    await db.query('INSERT INTO profiles(id,user_id) VALUES($1,$1)',[id])
    await db.query("SELECT track_customer_checkout($1,$2,'started','mtn_momo')",[id,events[i]])
  }
  await db.query("SELECT track_customer_checkout($1,$2,'cancelled','mtn_momo')",[ids[0],events[0]])
  await db.query("SELECT track_customer_checkout($1,$2,'started','mtn_momo')",[ids[0],events[0]])
  assert.equal((await db.query('SELECT state FROM customer_checkout_followups WHERE id=$1',[events[0]])).rows[0].state,'cancelled')
  await assert.rejects(db.query("SELECT track_customer_checkout($1,$2,'started','mtn_momo')",[ids[1],events[0]]),/Checkout unavailable/)
  await db.query('INSERT INTO customer_email_preferences(profile_id,followups_enabled) VALUES($1,FALSE)',[ids[2]])
  await db.query("INSERT INTO wallet_transactions(profile_id,type,status,payment_method) VALUES($1,'deposit','completed','mtn_momo')",[ids[3]])
  const reserve = () => db.query("SELECT * FROM reserve_customer_followup('Premium Verific <notifications@example.com>','support@example.com')")
  assert.equal((await reserve()).rows.length,0,'One-hour grace period')
  await db.exec("UPDATE customer_checkout_followups SET last_activity_at=NOW()-INTERVAL '2 hours'")
  const first = (await reserve()).rows[0]
  assert.equal(first.profile_id,ids[0]); assert.equal(first.recipient,'verified-0@example.com')
  assert.match(first.unsubscribe_token,/^[a-f0-9]{64}$/)
  const second = (await reserve()).rows[0]
  assert.equal(second.profile_id,ids[4],'Leased/cooldown customer excluded, unconfirmed/opt-out/completed customers excluded')
  assert.equal((await reserve()).rows.length,0)
  const extra = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  await db.query("SELECT track_customer_checkout($1,$2,'started','orange_money')",[ids[0],extra])
  await db.exec("UPDATE customer_checkout_followups SET last_activity_at=NOW()-INTERVAL '2 hours'")
  assert.equal((await reserve()).rows.length,0,'One customer cannot receive repeated emails during retry/lease')
  await db.query("INSERT INTO wallet_transactions(profile_id,type,status,payment_method) VALUES($1,'deposit','failed','mtn_momo')",[ids[1]])
  assert.ok((await db.query("SELECT count(*) FROM customer_checkout_followups WHERE profile_id=$1 AND state='issue'",[ids[1]])).rows[0].count>0)
  assert.equal(Number((await db.query('SELECT balance_xaf FROM profiles WHERE id=$1',[ids[0]])).rows[0].balance_xaf),0)
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','track_customer_checkout(uuid,uuid,text,text)','EXECUTE') AS allowed")).rows[0].allowed,false)
  assert.equal((await db.query("SELECT has_function_privilege('authenticated','reserve_customer_followup(text,text)','EXECUTE') AS allowed")).rows[0].allowed,false)
  console.log('PASS SQL: tracking ownership/idempotence, cancel ordering, grace period, verified recipients, completed-payment suppression, opt-out, cooldown/lease, failed-payment tracking, no balance changes, server-only RPCs')
} finally { await db.close() }
