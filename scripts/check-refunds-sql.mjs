// Isolated PostgreSQL checks. Never connects to the production database.
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const packagePath = process.env.PGLITE_MODULE
if (!packagePath) throw new Error('Set PGLITE_MODULE to the installed @electric-sql/pglite/dist/index.js file.')
const { PGlite } = await import(pathToFileURL(packagePath).href)
const db = new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT,email_confirmed_at TIMESTAMPTZ,is_anonymous BOOLEAN);
CREATE TABLE profiles(id UUID PRIMARY KEY,user_id UUID,role TEXT,balance_xaf NUMERIC DEFAULT 0);
CREATE TABLE wallet_transactions(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),profile_id UUID REFERENCES profiles(id),amount NUMERIC,type TEXT,payment_method TEXT,reference TEXT UNIQUE,status TEXT,description TEXT,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE sms_orders(id UUID PRIMARY KEY,profile_id UUID,status TEXT,sms_code TEXT);
CREATE TABLE smm_orders(id UUID PRIMARY KEY,profile_id UUID,status TEXT,quantity NUMERIC,remains NUMERIC);
CREATE TABLE account_orders(id UUID PRIMARY KEY,profile_id UUID,status TEXT,credentials_data JSONB);`)
const base = await readFile('supabase/all-platform-upgrades.sql', 'utf8')
const balanceFunction = base.match(/CREATE OR REPLACE FUNCTION public\.update_user_balance\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/g).at(-1)
assert.ok(balanceFunction)
await db.exec(balanceFunction)
await db.exec('CREATE TRIGGER balance_test AFTER INSERT OR UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_user_balance();')
await db.exec(await readFile('supabase/refund-process-upgrade.sql', 'utf8'))
const owner='00000000-0000-4000-8000-000000000001', customer='00000000-0000-4000-8000-000000000002', stranger='00000000-0000-4000-8000-000000000003'
await db.query(`INSERT INTO auth.users VALUES($1,'mohammednurdine6@gmail.com',NOW(),false)`,[owner])
for(const id of [owner,customer,stranger]) await db.query('INSERT INTO profiles(id,user_id,role) VALUES($1,$1,$2)',[id,id===owner?'admin':'client'])
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0]
const balance=async()=>Number(await scalar('SELECT balance_xaf FROM profiles WHERE id=$1',[customer]))
const request=tx=>scalar('SELECT submit_refund_request($1,$2,$3)',[customer,tx,'Please review this undelivered transaction.'])
const review=(id,action,amount=null,payout=null,reviewer=owner)=>scalar('SELECT review_refund_request($1,$2,$3,$4,$5,$6)',[id,reviewer,action,amount,'Original records and ownership have been verified.',payout])
const transaction=async(type,amount,reference)=>scalar(`INSERT INTO wallet_transactions(profile_id,amount,type,payment_method,reference,status) VALUES($1,$2,$3,'wallet',$4,'completed') RETURNING id`,[customer,amount,type,reference])
const rejects=async(fn,pattern)=>assert.rejects(fn,pattern)
const deposit=await transaction('deposit',10000,'DEPOSIT-1'), req=await request(deposit)
assert.equal(await request(deposit),req)
await rejects(()=>scalar('SELECT submit_refund_request($1,$2,$3)',[stranger,deposit,'This is not my transaction but I want money.']),/Transaction unavailable/)
await rejects(()=>review(req,'approve',1000,null,stranger),/Verified owner/)
assert.equal(await review(req,'approve',3000),'held'); assert.equal(await balance(),7000)
await rejects(()=>transaction('sms_purchase',100,'BLOCKED'),/Purchases paused/)
await rejects(()=>review(req,'approve',3000),/Invalid review action/)
assert.equal(await review(req,'reject'),'rejected'); assert.equal(await balance(),10000)
await rejects(()=>review(req,'reject'),/already reviewed/)
assert.equal(await review(req,'reopen'),'pending')
await review(req,'approve',3000); await review(req,'mark_paid',null,'SETTLED-ORIGINAL-1')
assert.equal(await balance(),7000)
await rejects(()=>review(req,'mark_paid',null,'SETTLED-ORIGINAL-1'),/already reviewed/)
const sms='00000000-0000-4000-8000-000000000010'
await db.query(`INSERT INTO sms_orders VALUES($1,$2,'expired',NULL)`,[sms,customer])
const purchase=await transaction('sms_purchase',500,`BOT-SMS-${sms}`), smsReq=await request(purchase)
await db.query('UPDATE sms_orders SET sms_code=$1 WHERE id=$2',['1234',sms])
await rejects(()=>review(smsReq,'approve',500),/undelivered/)
await db.query('UPDATE sms_orders SET sms_code=NULL WHERE id=$1',[sms])
await review(smsReq,'approve',500); assert.equal(await balance(),7000)
await rejects(()=>review(smsReq,'approve',500),/already reviewed/)
const smm='00000000-0000-4000-8000-000000000011'
await db.query(`INSERT INTO smm_orders VALUES($1,$2,'partial',1000,200)`,[smm,customer])
const partial=await transaction('smm_order',1000,`SMM-${smm}`), partialReq=await request(partial)
await rejects(()=>review(partialReq,'approve',201),/undelivered portion/)
await review(partialReq,'approve',200); assert.equal(await balance(),6200)
const old=await transaction('deposit',100,'OLD')
await db.query(`UPDATE wallet_transactions SET created_at=NOW()-INTERVAL '8 days' WHERE id=$1`,[old])
await rejects(()=>request(old),/window ended/)
const legacySource=await transaction('deposit',100,'LEGACY-SOURCE'), legacyReq=await request(legacySource)
await transaction('refund',50,'LEGACY-UNLINKED')
await rejects(()=>review(legacyReq,'approve',100),/Earlier refund needs reconciliation/)
const secondDeposit=await transaction('deposit',100,'SECOND-DEPOSIT'), secondReq=await request(secondDeposit)
await rejects(()=>review(secondReq,'approve',1000),/original charge/)
await db.query(`INSERT INTO sms_orders VALUES('00000000-0000-4000-8000-000000000012',$1,'waiting_sms',NULL)`,[customer])
await rejects(()=>review(secondReq,'approve',100),/active orders/)
await db.query(`DELETE FROM sms_orders WHERE status='waiting_sms'`)
await review(secondReq,'approve',100)
await rejects(()=>review(secondReq,'mark_paid',null,'SETTLED-ORIGINAL-1'),/unique constraint/)
assert.equal(await scalar('SELECT state FROM refund_requests WHERE id=$1',[secondReq]),'held')
await review(secondReq,'reject')
assert.equal(await scalar("SELECT has_function_privilege('authenticated','submit_refund_request(uuid,uuid,text)','EXECUTE')"),false)
assert.equal(await scalar("SELECT has_function_privilege('service_role','submit_refund_request(uuid,uuid,text)','EXECUTE')"),true)
assert.ok(await scalar('SELECT count(*) FROM refund_review_events')>=6)
console.log('PASS: ownership, window, idempotency, owner verification, holds, release, appeals, settled payouts, bot SMS, delivered-code rejection, partial caps, audit and service-only grants.')
await db.close()
