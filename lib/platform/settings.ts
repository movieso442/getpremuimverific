import type { SupabaseClient } from '@supabase/supabase-js'
import {collectCataloguePages} from '@/lib/smm/catalogue'

export type PlatformSettings = {
  support_email: string
  support_phone: string
  whatsapp_number: string
  smm_markup_multiplier: number
  sms_markup_multiplier: number
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  support_email: 'hello@premiumverific.com',
  support_phone: '+237 640 796 062',
  whatsapp_number: '237640796062',
  smm_markup_multiplier: 3,
  sms_markup_multiplier: 3,
}

export function retailPrice(providerCostXaf: number, multiplier = 3) {
  // Always round up to the nearest 5 XAF so provider cost is never undercharged.
  const basePrice = Math.ceil((Number(providerCostXaf) * Math.max(1, multiplier)) / 5) * 5
  return Math.ceil(basePrice * 102 / 100)
}

export type SmmPriceOverride = {
  service_id: number
  retail_rate_xaf: number
  is_active: boolean
}

/**
 * Per-service prices are optional. If an administrator has not overridden a
 * service, the platform-wide multiplier remains the safe default.
 */
export async function getSmmPriceOverrides(admin: SupabaseClient, serviceIds?: number[]) {
  let data:SmmPriceOverride[]
  // Older installations may not have run the pricing upgrade yet. A catalogue
  // must still be viewable; checkout falls back to the global margin rule.
  try {
    data=await collectCataloguePages(async(start,end)=>{
      const {data:rows,error}=await admin.from('smm_service_prices').select('service_id, retail_rate_xaf, is_active').order('service_id').range(start,end)
      if(error)throw error
      return rows||[]
    })
  }catch{return new Map<number,SmmPriceOverride>()}
  if(serviceIds?.length){const ids=new Set(serviceIds);data=data.filter(row=>ids.has(Number(row.service_id)))}
  return new Map((data || []).map((row) => [Number(row.service_id), {
    service_id: Number(row.service_id),
    retail_rate_xaf: Number(row.retail_rate_xaf),
    is_active: Boolean(row.is_active),
  }]))
}

export function smmRetailRateXaf(providerRateUsd: number, multiplier: number, override?: SmmPriceOverride) {
  if (override?.is_active && Number.isFinite(override.retail_rate_xaf) && override.retail_rate_xaf > 0) {
    return Math.ceil((Math.ceil(override.retail_rate_xaf / 5) * 5) * 102 / 100)
  }
  return retailPrice(Number(providerRateUsd) * 600, multiplier)
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
