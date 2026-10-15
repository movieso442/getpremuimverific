// Read-only inspection of the existing unpaid checkout; no form submission.
import {readFile} from 'node:fs/promises'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.argv[2]).href)
const legacy=process.argv.includes('--legacy')
const probe=JSON.parse(await readFile(legacy?'.vercel/legacy-card-capability-probe.json':'.vercel/card-capability-probe.json','utf8'))
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1100,height:1000}})
 const requests=[],details=[]
 page.on('response',async response=>{
  const url=new URL(response.url())
  if(url.hostname==='gateway.payunit.net')requests.push({path:url.pathname,status:response.status()})
  if(url.pathname.startsWith('/api/gateway/checkout/detail/')){
   const body=await response.json().catch(()=>null)
   const inspect=(value,path='data')=>{
    if(!value||typeof value!=='object')return
    for(const [key,item] of Object.entries(value)){
     if(['providers','payment_methods','countries','gateways','shortcode','name','status','card_payment','card_enabled','code','country_code'].includes(key)){
      if(typeof item!=='object'||Array.isArray(item))details.push({path:path+'.'+key,value:typeof item==='object'?JSON.stringify(item).slice(0,5000):item})
     }
     if(item&&typeof item==='object')inspect(item,path+'.'+key)
    }
   }
   inspect(body)
  }
 })
 await page.goto(probe.url,{waitUntil:'domcontentloaded'})
 await page.waitForLoadState('networkidle',{timeout:20000}).catch(()=>undefined)
 let countryOptions=[]
 if(await page.getByRole('combobox').count()){
  await page.getByRole('combobox').click()
  await page.keyboard.press('ArrowDown')
  countryOptions=await page.getByRole('option').allTextContents()
  await page.keyboard.press('Escape')
 }
 console.log(JSON.stringify({title:await page.title(),countryOptions,visibleText:await page.locator('body').innerText(),buttons:await page.locator('button').allTextContents(),inputs:await page.locator('input').evaluateAll(nodes=>nodes.map(n=>({type:n.type,placeholder:n.placeholder,autocomplete:n.autocomplete,role:n.getAttribute('role'),radioValue:n.type==='radio'?n.value:undefined}))),selects:await page.locator('select').evaluateAll(nodes=>nodes.map(n=>[...n.options].map(o=>({label:o.label,value:o.value})))),requests,details},null,2))
 await page.screenshot({path:process.env.TEMP+'/premiumverific-payunit-'+(legacy?'legacy':'live')+'-capability.png',fullPage:true})
}finally{await browser.close()}
