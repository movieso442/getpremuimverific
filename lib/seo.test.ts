import {test} from 'node:test'
import assert from 'node:assert/strict'
import {SEO_PATHS,shouldIndex} from './seo'
test('only approved public URLs on the canonical customer host can be indexed',()=>{
 for(const path of SEO_PATHS) assert.equal(shouldIndex(path,'premiumverific.com',new URLSearchParams()),true)
 for(const path of ['/dashboard','/add-funds','/admin','/refund-request','/profile','/api/refunds','/missing']) assert.equal(shouldIndex(path,'premiumverific.com',new URLSearchParams()),false)
 assert.equal(shouldIndex('/','admin.premiumverific.com',new URLSearchParams()),false)
 assert.equal(shouldIndex('/','test.vercel.app',new URLSearchParams()),false)
 assert.equal(shouldIndex('/','premiumverific.com',new URLSearchParams('code=secret')),false)
})
