import type { SupabaseClient } from '@supabase/supabase-js'

export type PlatformSettings = {
  support_email: string
  support_phone: string
  whatsapp_number: string
  smm_markup_multiplier: number
  sms_markup_multiplier: number
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  support_email: 'hello@premiumverific.com',
  support_phone: '+237 680209047',
  whatsapp_number: '237680209047',
  smm_markup_multiplier: 3,
  sms_markup_multiplier: 3,
}

export function retailPrice(providerCostXaf: number, multiplier = 3) {
  // Always round up to the nearest 5 XAF so provider cost is never undercharged.
  return Math.ceil((Number(providerCostXaf) * Math.max(1, multiplier)) / 5) * 5
}

export async function getPlatformSettings(admin: SupabaseClient): Promise<PlatformSettings> {
  const { data, error } = await admin.from('platform_settings')
    .select('support_email, support_phone, whatsapp_number, smm_markup_multiplier, sms_markup_multiplier')
    .eq('id', true)
    .maybeSingle()
  if (error || !data) return DEFAULT_PLATFORM_SETTINGS
  return {
    support_email: data.support_email || DEFAULT_PLATFORM_SETTINGS.support_email,
    support_phone: data.support_phone || DEFAULT_PLATFORM_SETTINGS.support_phone,
    whatsapp_number: data.whatsapp_number || DEFAULT_PLATFORM_SETTINGS.whatsapp_number,
    smm_markup_multiplier: Number(data.smm_markup_multiplier) || DEFAULT_PLATFORM_SETTINGS.smm_markup_multiplier,
    sms_markup_multiplier: Number(data.sms_markup_multiplier) || DEFAULT_PLATFORM_SETTINGS.sms_markup_multiplier,
  }
}
