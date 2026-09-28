export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  balance_xaf: number
  currency: string
  avatar_url: string | null
  phone_number: string | null
  role: 'client' | 'admin'
  created_at: string
  updated_at: string
}

export interface WalletTransaction {
  id: string
  profile_id: string
  amount: number
  type: 'deposit' | 'sms_purchase' | 'smm_order' | 'account_purchase' | 'refund'
  payment_method: 'mtn_momo' | 'orange_money' | 'visa_mastercard' | 'crypto_usdt'
  reference: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  description?: string
  created_at: string
}

export interface SmsOrder {
  id: string
  profile_id: string
  provider_order_id?: string
  service_name: string
  service_code: string
  country_name: string
  country_code: string
  phone_number: string
  sms_code: string | null
  price_xaf: number
  status: 'waiting_sms' | 'received' | 'expired' | 'canceled'
  expires_at: string
  created_at: string
}

export interface SmmOrder {
  id: string
  profile_id: string
  service_id: number
  service_name: string
  category: string
  target_link: string
  quantity: number
  charge_xaf: number
  start_count: number
  remains: number
  status: 'pending' | 'processing' | 'in_progress' | 'completed' | 'canceled' | 'partial'
  api_order_id?: string
  created_at: string
}

export interface AccountOrder {
  id: string
  profile_id: string
  item_title: string
  category: string
  price_xaf: number
  delivery_type: 'instant' | 'manual'
  credentials_data?: Record<string, any>
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

export interface ApiKeyItem {
  id: string
  profile_id: string
  key_name: string
  api_key: string
  key_prefix: string
  last_used_at?: string
  created_at: string
}

export interface WebhookEndpoint {
  id: string
  profile_id: string
  url: string
  events: string[]
  secret: string
  is_active: boolean
  created_at: string
}
