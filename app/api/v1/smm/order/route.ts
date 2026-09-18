import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { service_id, link, quantity, action = 'add' } = body

    if (action === 'add' && (!service_id || !link || !quantity)) {
      return NextResponse.json({ error: 'service_id, link, and quantity parameters are required' }, { status: 400 })
    }

    const smmApiKey = process.env.SMM_PROVIDER_API_KEY
    const smmApiUrl = process.env.SMM_PROVIDER_API_URL || 'https://justanotherpanel.com/api/v2'

    // Forward to external provider if API key is provided
    if (smmApiKey) {
      try {
        const formData = new URLSearchParams()
        formData.append('key', smmApiKey)
        formData.append('action', action)
        if (service_id) formData.append('service', String(service_id))
        if (link) formData.append('link', link)
        if (quantity) formData.append('quantity', String(quantity))

        const providerRes = await fetch(smmApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        })

        const providerData = await providerRes.json()
        if (providerData.order) {
          return NextResponse.json({
            order: providerData.order,
            status: 'Pending',
            service_id,
            link,
            quantity
          })
        }
      } catch (err) {
        console.warn('SMM Provider forwarding fallback:', err)
      }
    }

    // Default simulated order creation
    const orderId = Math.floor(100000 + Math.random() * 900000)
    return NextResponse.json({
      order: orderId,
      status: 'Pending',
      service_id,
      link,
      quantity,
      provider: 'Premium Verify Fast Server Node #1'
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
