import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'getNumber', service = 'wa', country = 'US' } = body

    const smsApiKey = process.env.SMS_PROVIDER_API_KEY
    const smsBaseUrl = process.env.SMS_PROVIDER_BASE_URL || 'https://api.sms-activate.org/stubs/handler_api.php'

    if (smsApiKey) {
      try {
        const smsRes = await fetch(`${smsBaseUrl}?api_key=${smsApiKey}&action=${action}&service=${service}&country=${country}`)
        const textData = await smsRes.text()
        
        if (textData.includes('ACCESS_NUMBER')) {
          const parts = textData.split(':')
          return NextResponse.json({
            id: parts[1],
            phone: parts[2],
            status: 'WAITING_SMS'
          })
        }
      } catch (err) {
        console.warn('SMS Provider API fallback:', err)
      }
    }

    // Default response generator for instant demo execution
    const randomDigits = Math.floor(100000000 + Math.random() * 900000000)
    const prefixes: Record<string, string> = { US: '+1 (407)', GB: '+44 7911', CA: '+1 (604)', CM: '+237 677', NG: '+234 803' }
    const phone = `${prefixes[country] || '+1 (555)'} ${randomDigits}`

    return NextResponse.json({
      id: `sms_${Math.random().toString(36).substring(2, 9)}`,
      phone,
      service,
      country,
      status: 'WAITING_SMS',
      expires_in_seconds: 1200
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
