import { NextResponse } from 'next/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/bot'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import { SMS_SERVICES } from '@/lib/mockData'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'getNumber', service = 'wa', country = 'US', id, user_phone, chat_id } = body

    const smsApiKey = process.env.SMS_PROVIDER_API_KEY
    const smsBaseUrl = process.env.SMS_PROVIDER_BASE_URL

    // Check status of an existing SMS order & auto-forward code if arrived
    if (action === 'getStatus' || action === 'getSms') {
      if (smsApiKey && id) {
        try {
          const smsRes = await fetch(`${smsBaseUrl}?api_key=${smsApiKey}&action=getStatus&id=${id}`)
          const textData = await smsRes.text()

          if (textData.includes('STATUS_OK')) {
            const code = textData.split(':')[1] || textData
            const msgText = `📩 *SMS Code Received!*\n\n🔑 *Verification Code:* \`${code}\`\n🆔 *Order ID:* ${id}\n\nForwarded automatically by Premium Verify Assistant.`

            if (user_phone) {
              await sendWhatsAppMessage(user_phone, msgText)
            }
            if (chat_id) {
              await sendTelegramMessage(chat_id, msgText)
            }

            return NextResponse.json({ status: 'RECEIVED', code, full_text: textData })
          }
        } catch (err) {
          console.warn('SMS Status fetch error:', err)
        }
      }

      // Demo code response simulation for instant testing
      const simCode = Math.floor(100000 + Math.random() * 900000).toString()
      const msgText = `📩 *SMS Code Received!*\n\n🔑 *Verification Code:* \`${simCode}\`\n🆔 *Order ID:* ${id || 'demo_123'}\n\nForwarded automatically by Premium Verify Assistant.`

      if (user_phone) {
        await sendWhatsAppMessage(user_phone, msgText)
      }
      if (chat_id) {
        await sendTelegramMessage(chat_id, msgText)
      }

      return NextResponse.json({
        status: 'RECEIVED',
        code: simCode,
        message: 'SMS verification code arrived and pushed to your notification channel.'
      })
    }

    // Allocate a real number. Provider country IDs are intentionally configured server-side.
    const catalogService = SMS_SERVICES.find((item) => item.code === service)
    if (!catalogService) return NextResponse.json({ error: 'Unknown SMS service.' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in before requesting a number.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin.from('profiles').select('*').eq('user_id', user.id).single()
    if (profileError || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable. Please sign in again.' }, { status: 409 })
    if (Number(profile.balance_xaf) < catalogService.price)
      return NextResponse.json({ error: 'Insufficient wallet balance.', required_xaf: catalogService.price }, { status: 402 })

    let countryMap: Record<string, string>
    try {
      countryMap = JSON.parse(process.env.SMS_PROVIDER_COUNTRY_MAP || '{}')
    } catch {
      return NextResponse.json({ error: 'SMS provider country mapping is invalid. No funds were charged.' }, { status: 503 })
    }
    const providerCountry = countryMap[country]
    if (!smsApiKey || !smsBaseUrl || !providerCountry)
      return NextResponse.json({ error: 'Live SMS provider is not configured for this country. No funds were charged.' }, { status: 503 })

    try {
        const smsRes = await fetch(`${smsBaseUrl}?api_key=${encodeURIComponent(smsApiKey)}&action=getNumber&service=${encodeURIComponent(service)}&country=${encodeURIComponent(providerCountry)}`, { signal: AbortSignal.timeout(20_000) })
        const textData = await smsRes.text()
        
        if (textData.includes('ACCESS_NUMBER')) {
          const parts = textData.split(':')
          const { data: order, error: orderError } = await admin.from('sms_orders').insert({
            profile_id: profile.id, service_name: catalogService.name, service_code: service,
            country_name: country, country_code: country, phone_number: parts[2], price_xaf: catalogService.price,
            status: 'waiting_sms', expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString()
          }).select().single()
          if (orderError) throw orderError
          const { error: transactionError } = await admin.from('wallet_transactions').insert({
            profile_id: profile.id, amount: catalogService.price, type: 'sms_purchase', payment_method: 'mtn_momo',
            reference: `SMS-${order.id}`, status: 'completed', description: `Live ${catalogService.name} activation`
          })
          if (transactionError) throw transactionError
          return NextResponse.json({ id: parts[1], order, phone: parts[2], status: 'WAITING_SMS' }, { status: 201 })
        }
        return NextResponse.json({ error: textData || 'The SMS provider has no number available. No funds were charged.' }, { status: 502 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Could not contact the SMS provider. No funds were charged.' }, { status: 502 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 })
  }
}
