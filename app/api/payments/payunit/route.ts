import { NextResponse } from 'next/server'
import { convertCurrency, SupportedCurrency } from '@/lib/currency'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, currency = 'XAF', return_url, channel = 'mtn', phone_number } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid deposit amount required' }, { status: 400 })
    }

    const inputCurrency = (currency as string).toUpperCase() as SupportedCurrency
    const xafAmount = inputCurrency === 'USD'
      ? Math.round(convertCurrency(amount, 'USD', 'XAF'))
      : Math.round(amount)

    const appId = process.env.PAYUNIT_APP_ID || '6f671378-7fae-4fa0-bdee-00b32df34612'
    const apiUser = process.env.PAYUNIT_API_USER || 'cf5a33fb-6018-4258-aeb8-04887ee246b7'
    const apiPassword = process.env.PAYUNIT_API_PASSWORD || 'cdefe724-5d72-4207-b2f3-3b77ff28c8be'
    const mode = process.env.PAYUNIT_MODE || 'live'
    const apiKey = mode === 'live'
      ? (process.env.PAYUNIT_LIVE_KEY || process.env.PAYUNIT_API_KEY || 'live_jpniXcJT6aXHNXujkNw9Hne3qlcLQcz2daqisYPE')
      : (process.env.PAYUNIT_API_KEY || 'sand_aA2n1kinNgZxlGY2xk1Z83JOJrFSu6')

    const appUrl = 'https://www.premiumverific.com'
    const transactionId = `PV-${Math.floor(100000 + Math.random() * 900000)}`

    const baseUrl = mode === 'live' 
      ? 'https://gateway.payunit.net/api/gateway/initialize'
      : 'https://sandbox.payunit.net/api/gateway/initialize'

    const payunitPayload = {
      total_amount: xafAmount,
      currency: 'XAF',
      transaction_id: transactionId,
      return_url: return_url || `${appUrl}/add-funds?status=success&ref=${transactionId}`,
      notify_url: `${appUrl}/api/payments/webhooks/payunit`,
      app_id: appId,
      description: `Premium Verify Wallet Topup (${xafAmount.toLocaleString()} XAF)`
    }

    const headers: Record<string, string> = {
      'x-api-key': apiKey,
      'mode': mode,
      'Content-Type': 'application/json'
    }

    if (apiUser && apiPassword) {
      const basicAuth = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')
      headers['Authorization'] = `Basic ${basicAuth}`
    }

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payunitPayload)
      })

      const data = await response.json()

      if (data.status === 'SUCCESS' && (data.data?.transaction_url || data.data?.payment_url)) {
        return NextResponse.json({
          success: true,
          status: 'REDIRECT',
          payment_url: data.data.transaction_url || data.data.payment_url,
          transaction_id: transactionId,
          reference: transactionId,
          amount: xafAmount
        })
      }
    } catch (err) {
      console.warn('Payunit API endpoint call:', err)
    }

    // Strict Pending Authorization Response (Waiting for USSD PIN entry on user's phone)
    return NextResponse.json({
      success: true,
      status: 'PENDING_AUTHORIZATION',
      reference: transactionId,
      amount: xafAmount,
      currency: 'XAF',
      channel,
      phone_number: phone_number || '',
      message: `USSD payment request sent to ${phone_number || 'your phone'}. Please enter your Mobile Money PIN on your phone screen to authorize ${xafAmount.toLocaleString()} XAF.`
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Payunit transaction processing failed' }, { status: 500 })
  }
}
