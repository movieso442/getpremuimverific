// Read-only deployment checks. No authentication, charges or database writes.
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const origin = 'https://premiumverific.com'
const html = await (await fetch(origin)).text()
assert.ok(html.includes('/brand/favicon.png'))
assert.ok(html.includes('/brand/apple-touch-icon.png'))
for (const path of ['/favicon.ico','/brand/favicon.png','/brand/apple-touch-icon.png']) {
  const response = await fetch(origin+path)
  assert.equal(response.status,200)
  assert.equal(response.headers.get('x-robots-tag'),null)
  const bytes = Buffer.from(await response.arrayBuffer())
  const local = await readFile(path==='/favicon.ico'?'app/favicon.ico':'public'+path)
  const hash = data => createHash('sha256').update(data).digest('hex')
  assert.equal(hash(bytes),hash(local))
  console.log('Verified live logo asset:',path,response.headers.get('content-type'))
}
for (const method of ['GET','POST']) {
  const response = await fetch(origin+'/api/payments/cards',{method,headers:method==='POST'?{'Content-Type':'application/json'}:{},body:method==='POST'?'{}':undefined})
  assert.equal(response.status,method==='POST'?410:401)
  console.log('Unauthenticated card API rejected:',method,response.status)
}
const response = await fetch(origin+'/payments/card-return')
assert.equal(response.status,200)
assert.match(response.headers.get('x-robots-tag'),/noindex/)
console.log('Verified card return page: HTTP 200, noindex')
