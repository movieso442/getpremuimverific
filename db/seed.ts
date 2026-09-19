import fs from 'fs'
import path from 'path'

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

    console.log(`🎉 Successfully seeded ${formattedList.length} SMM services to ${outputPath}!`)
  } catch (err) {
    console.error('❌ Error seeding live services:', err)
  }
}

seedLiveServices()
