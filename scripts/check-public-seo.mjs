import assert from 'node:assert/strict'
import http from 'node:http'
const origin=process.env.CHECK_ORIGIN||'http://localhost:3100'
const get=(path,host='premiumverific.com')=>new Promise((resolve,reject)=>{http.get(origin+path,{headers:{host}},result=>{let body='';result.setEncoding('utf8');result.on('data',chunk=>{body+=chunk});result.on('end',()=>resolve({response:{status:result.statusCode,headers:new Headers(result.headers)},body}))}).on('error',reject)})
for(const path of ['/','/virtual-numbers','/sms-verification-guide','/social-media-growth','/refunds']){
 const {response,body}=await get(path)
 assert.equal(response.status,200,path)
 assert.equal(response.headers.get('x-robots-tag'),null,path)
 const canonical=body.match(/rel="canonical" href="([^"]+)"/)?.[1]
 assert.equal(new URL(canonical).href,new URL(path,'https://premiumverific.com').href,path)
 assert.ok(body.includes('content="index, follow"'),path)
 assert.ok(body.includes(encodeURIComponent('/brand/mark-master.png')),path)
}
const missing=await get('/this-page-does-not-exist')
assert.equal(missing.response.status,404);assert.ok(missing.body.includes('Back to home'))
assert.ok(missing.response.headers.get('x-robots-tag').includes('noindex'))
for(const path of ['/dashboard','/add-funds','/refund-request','/admin']){
 const {response,body}=await get(path)
 assert.ok(response.headers.get('x-robots-tag').includes('noindex'),path)
 assert.ok(body.includes('content="noindex, nofollow"'),path)
}
const sitemap=await get('/sitemap.xml')
assert.equal(sitemap.response.status,200)
assert.equal((sitemap.body.match(/<loc>/g)||[]).length,5)
assert.ok(!sitemap.body.includes('/dashboard'))
const adminRobots=await get('/robots.txt','admin.premiumverific.com')
assert.ok(adminRobots.body.includes('Disallow: /'))
assert.equal((await get('/sitemap.xml','admin.premiumverific.com')).response.status,404)
for(const path of ['/api/refunds','/api/admin/refunds']) assert.equal((await get(path)).response.status,401,path)
for(const path of ['/favicon.ico','/brand/icon-192.png','/brand/icon-512.png','/brand/apple-touch-icon.png']) assert.equal((await get(path)).response.status,200,path)
console.log('PASS: five indexable canonical pages, branded 404 HTTP status, private noindex, sitemap, admin robots, unauthenticated API protection and icon delivery.')
