import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export interface JapServiceItem {
  service: number
  name: string
  type: string
  category: string
  rate: string // USD rate per 1000
  min: number
  max: number
  dripfeed?: boolean
  refill?: boolean
  cancel?: boolean
}

export interface FormattedSmmService {
  id: number
  service_id: number
  name: string
  category: string
  rate_usd: number
  rate_xaf: number
  min: number
  max: number
  type: string
  refill: boolean
  cancel: boolean
  dripfeed: boolean
}

async function seedLiveServices() {
  console.log('🚀 Fetching live services catalog from JustAnotherPanel API...')

  const apiKey = process.env.SMM_PROVIDER_API_KEY || 'e9053f2fe8fd9f8a8facdc6009cb6873'
  const apiUrl = process.env.SMM_PROVIDER_API_URL || 'https://justanotherpanel.com/api/v2'

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `key=${apiKey}&action=services`
    })

    const rawServices: JapServiceItem[] = await res.json()

    if (!Array.isArray(rawServices)) {
      throw new Error(`Invalid response from JustAnotherPanel API: ${JSON.stringify(rawServices)}`)
    }

    console.log(`✅ Received ${rawServices.length} live services from JustAnotherPanel. Formatting catalog...`)

    const formattedList: FormattedSmmService[] = rawServices.map((item) => {
      const usdRate = parseFloat(item.rate) || 1.0
      // 1 USD = 600 XAF, apply standard 25% markup
      const xafRate = Math.ceil(usdRate * 600 * 1.25)

      return {
        id: item.service,
        service_id: item.service,
        name: item.name,
        category: item.category,
        rate_usd: usdRate,
        rate_xaf: xafRate,
        min: Number(item.min) || 10,
        max: Number(item.max) || 100000,
        type: item.type || 'Default',
        refill: Boolean(item.refill),
        cancel: Boolean(item.cancel),
        dripfeed: Boolean(item.dripfeed)
      }
    })

    const outputPath = path.join(process.cwd(), 'lib', 'liveServices.json')
    fs.writeFileSync(outputPath, JSON.stringify(formattedList, null, 2))
    console.log(`🎉 Saved ${formattedList.length} services to local file: ${outputPath}`)

    // Also populate Supabase table smm_services
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdfmfxfkbqlcjbesymxd.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZm1meGZrYnFsY2piZXN5bXhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY4NTM3MywiZXhwIjoyMTA1MjYxMzczfQ.D--kRu7ExbhY_wloJ-KGdbecL9ynMgaIbWAW_k6oMI4'

    if (supabaseUrl && serviceRoleKey) {
      console.log('📡 Syncing services into Supabase smm_services database table...')
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

      const dbRows = formattedList.map(s => ({
        service_id: s.service_id,
        name: s.name,
        category: s.category,
        rate_usd: s.rate_usd,
        rate_xaf: s.rate_xaf,
        min: s.min,
        max: s.max,
        refill: s.refill,
        cancel: s.cancel,
        dripfeed: s.dripfeed,
        service_type: s.type
      }))

      // Batch insert 500 rows at a time
      const batchSize = 500
      for (let i = 0; i < dbRows.length; i += batchSize) {
        const batch = dbRows.slice(i, i + batchSize)
        const { error } = await supabaseAdmin
          .from('smm_services')
          .upsert(batch, { onConflict: 'service_id' })

        if (error) {
          console.error(`❌ Error inserting batch ${i}-${i + batch.length}:`, error.message)
        } else {
          console.log(`✅ Synced services ${i + 1} to ${Math.min(i + batchSize, dbRows.length)} / ${dbRows.length}`)
        }
      }
      console.log('✨ All live services successfully populated into Supabase database smm_services table!')
    }
  } catch (err) {
    console.error('❌ Error seeding live services:', err)
  }
}

seedLiveServices()
