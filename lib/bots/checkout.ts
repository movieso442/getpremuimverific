import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const MINIMUM_TOPUP_XAF = 500

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://premiumverific.com').replace(/\/$/, '')
}

export async function createBotCheckoutLink(profileId: string, amount: number) {
  const roundedAmount = Math.round(Number(amount))
  if (!profileId || !Number.isFinite(roundedAmount) || roundedAmount < MINIMUM_TOPUP_XAF) return null

  const token = randomBytes(32).toString('base64url')
  const admin = createAdminClient()
  const { error } = await admin.from('bot_payment_links').insert({
    token,
    profile_id: profileId,
    amount_xaf: roundedAmount,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  })
  if (error) {
    console.error('[Bot checkout link creation failed]', error.message)
    return null
  }
  return `${appUrl()}/bot-topup?token=${encodeURIComponent(token)}`
}

export const BOT_TOPUP_MINIMUM_XAF = MINIMUM_TOPUP_XAF
