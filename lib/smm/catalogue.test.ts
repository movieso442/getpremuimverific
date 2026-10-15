import {test} from 'node:test'
import assert from 'node:assert/strict'
import {collectCataloguePages,smmPlatform,sortSmmPlatforms} from './catalogue'
test('pagination includes TikTok after the first thousand rows',async()=>{
 const fixture=Array.from({length:5813},(_,id)=>({id,category:id<1000?'Apple Music':id<1674?'🇺🇸 TikTok Views [USA]':'Instagram Followers',name:'Service'}))
 let calls=0
 const rows=await collectCataloguePages(async(start,end)=>{calls++;return fixture.slice(start,end+1)})
 assert.equal(rows.length,5813);assert.equal(calls,6)
 assert.equal(rows.filter(row=>smmPlatform(row)==='TikTok').length,674)
 assert.deepEqual(sortSmmPlatforms(rows.map(smmPlatform)),['Instagram','TikTok','Apple Music'])
})
test('platform grouping handles regional categories and does not manufacture services',()=>{
 assert.equal(smmPlatform({category:'Instagram Followers [with TikTok promotion]',name:'Promotion'}),'Instagram')
 assert.equal(smmPlatform({category:'🇧🇷 Facebook Services [BRAZIL]',name:'Likes'}),'Facebook')
 assert.equal(smmPlatform({category:'Tik Tok followers',name:'Followers'}),'TikTok')
 assert.equal(smmPlatform({category:'Unclassified',name:'Obscure service'}),'Other services')
 assert.deepEqual(sortSmmPlatforms(['YouTube','Apple Music','TikTok','YouTube']),['TikTok','YouTube','Apple Music'])
})
test('pagination fails instead of silently truncating at its safety limit',async()=>{
 await assert.rejects(()=>collectCataloguePages(async()=>[1,2],2,2),/incomplete catalogue/)
})
