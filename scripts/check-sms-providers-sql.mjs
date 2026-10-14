import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
if(!process.env.PGLITE_MODULE)throw new Error('Set PGLITE_MODULE to the installed PGlite module path.')
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href)
const db=new PGlite()
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE TABLE sms_orders(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),provider_order_id TEXT,service_code TEXT,country_code TEXT,price_xaf NUMERIC);
INSERT INTO sms_orders(provider_order_id,service_code,country_code,price_xaf) VALUES('historical-order','wa','US',306);`)
const sql=await readFile('supabase/sms-providers-upgrade.sql','utf8')
await db.exec(sql);await db.exec(sql)
const scalar=async(query,args=[])=>Object.values((await db.query(query,args)).rows[0])[0]
assert.equal(await scalar("SELECT enabled FROM sms_providers WHERE id='beansms'"),false)
assert.equal(await scalar('SELECT count(*) FROM sms_provider_orders'),1)
assert.equal(await scalar('SELECT actual_supplier_amount FROM sms_provider_orders LIMIT 1'),null)
assert.equal(await scalar('SELECT supplier_currency FROM sms_provider_orders LIMIT 1'),null)
await db.exec("INSERT INTO sms_orders(provider_order_id,service_code,country_code,price_xaf) VALUES('new-order','tg','GB',500)")
assert.equal(await scalar('SELECT count(*) FROM sms_provider_orders'),2)
assert.equal(await scalar("SELECT provider_id FROM sms_provider_orders WHERE supplier_order_id='new-order'"),'fivesim')
for(const table of ['sms_providers','sms_provider_services','sms_provider_orders']){
 assert.equal(await scalar(`SELECT has_table_privilege('authenticated','${table}','SELECT')`),false)
 assert.equal(await scalar(`SELECT has_table_privilege('anon','${table}','SELECT')`),false)
 assert.equal(await scalar(`SELECT has_table_privilege('service_role','${table}','SELECT')`),true)
}
await assert.rejects(()=>db.exec("INSERT INTO sms_provider_services(provider_id,canonical_service,canonical_country,supplier_service,supplier_country,enabled) VALUES('beansms','wa','US','wa','12',TRUE)"),/check constraint/)
await assert.rejects(()=>db.exec("UPDATE sms_provider_orders SET actual_supplier_amount=-1"),/check constraint/)
console.log('PASS: repeatable migration, disabled BeanSMS, historical unknown costs, 5SIM order attribution, private supplier tables and verified-mapping constraints.')
await db.close()
