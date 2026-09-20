'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Profile, WalletTransaction, SmsOrder, SmmOrder, AccountOrder, ApiKeyItem, WebhookEndpoint } from './supabase/types'
import { createClient } from './supabase/client'

interface AppStateContextType {
  profile: Profile
  transactions: WalletTransaction[]
  smsOrders: SmsOrder[]
  smmOrders: SmmOrder[]
  accountOrders: AccountOrder[]
  apiKeys: ApiKeyItem[]
  webhooks: WebhookEndpoint[]
  setProfile: (newProfileData: Partial<Profile>) => void
  loginWithGoogle: () => void
  topUpBalance: (amount: number, method: 'mtn_momo' | 'orange_money' | 'visa_mastercard' | 'crypto_usdt', ref?: string) => void
  buySmsNumber: (serviceName: string, serviceCode: string, countryName: string, countryCode: string, price: number) => SmsOrder | null
  cancelSmsOrder: (orderId: string) => void
  createSmmOrder: (serviceId: number, serviceName: string, category: string, link: string, quantity: number, price: number) => SmmOrder | null
  purchaseAccount: (title: string, category: string, price: number, deliveryType: 'instant' | 'manual') => AccountOrder | null
  addApiKey: (name: string) => ApiKeyItem
  deleteApiKey: (id: string) => void
  addWebhook: (url: string, events: string[]) => WebhookEndpoint
  deleteWebhook: (id: string) => void
}

const DEFAULT_PROFILE: Profile = {
  id: '',
  user_id: '',
  email: '',
  full_name: '',
  balance_xaf: 0,
  currency: 'XAF',
  avatar_url: null,
  phone_number: '',
  role: 'client',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined)

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [smsOrders, setSmsOrders] = useState<SmsOrder[]>([])
  const [smmOrders, setSmmOrders] = useState<SmmOrder[]>([])
  const [accountOrders, setAccountOrders] = useState<AccountOrder[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])

  const supabase = createClient()

  const setProfile = (newProfileData: Partial<Profile>) => {
    const updated = { ...profile, ...newProfileData }
    setProfileState(updated)
    try {
      localStorage.setItem('premiumverific_profile', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }
  }

  // Real Supabase DB Profile & Order Sync
  useEffect(() => {
    async function syncSupabaseUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Premium Partner'
          const avatarUrl = user.user_metadata?.avatar_url || null
          let activeProfile: Profile | null = null

          // 1. Sync / Create user profile using Admin API route to bypass RLS safely
          try {
            const res = await fetch('/api/auth/sync-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: user.id,
                email: user.email,
                full_name: fullName,
                avatar_url: avatarUrl,
                phone_number: '+237680209047'
              })
            })
            const syncData = await res.json()
            if (syncData.success && syncData.profile) {
              const dbP = syncData.profile
              activeProfile = {
                id: dbP.id,
                user_id: dbP.user_id || user.id,
                email: dbP.email || user.email!,
                full_name: dbP.full_name || fullName,
                balance_xaf: Number(dbP.balance_xaf) || 0,
                currency: dbP.currency || 'XAF',
                avatar_url: dbP.avatar_url || avatarUrl,
                phone_number: dbP.phone_number || '+237680209047',
                role: dbP.role || 'client',
                created_at: dbP.created_at || new Date().toISOString(),
                updated_at: dbP.updated_at || new Date().toISOString()
              }
            }
          } catch (apiErr) {
            console.error('[Sync User API Route Error]:', apiErr)
          }

          // Fallback client select if API route failed
          if (!activeProfile) {
            const { data: dbProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle()

            if (dbProfile) {
              activeProfile = {
                id: dbProfile.id,
                user_id: dbProfile.user_id,
                email: dbProfile.email,
                full_name: dbProfile.full_name || fullName,
                balance_xaf: Number(dbProfile.balance_xaf) || 0,
                currency: dbProfile.currency || 'XAF',
                avatar_url: dbProfile.avatar_url || avatarUrl,
                phone_number: dbProfile.phone_number || '+237680209047',
                role: dbProfile.role || 'client',
                created_at: dbProfile.created_at,
                updated_at: dbProfile.updated_at
              }
            } else {
              activeProfile = {
                id: user.id,
                user_id: user.id,
                email: user.email!,
                full_name: fullName,
                balance_xaf: 0,
                currency: 'XAF',
                avatar_url: avatarUrl,
                phone_number: '+237680209047',
                role: 'client',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            }
          }

          setProfileState(activeProfile)

          // 2. Fetch user's real orders & transactions from Supabase tables
          const { data: dbTx } = await supabase.from('wallet_transactions').select('*').eq('profile_id', activeProfile.id).order('created_at', { ascending: false })
          const { data: dbSmm } = await supabase.from('smm_orders').select('*').eq('profile_id', activeProfile.id).order('created_at', { ascending: false })
          const { data: dbSms } = await supabase.from('sms_orders').select('*').eq('profile_id', activeProfile.id).order('created_at', { ascending: false })

          if (dbTx) setTransactions(dbTx as any)
          if (dbSmm) setSmmOrders(dbSmm as any)
          if (dbSms) setSmsOrders(dbSms as any)
        } else {
          // Fallback to localStorage for guest/offline preview
          const savedProfile = localStorage.getItem('premiumverific_profile')
          const savedTx = localStorage.getItem('premiumverific_tx')
          const savedSms = localStorage.getItem('premiumverific_sms')
          const savedSmm = localStorage.getItem('premiumverific_smm')

          if (savedProfile) setProfileState(JSON.parse(savedProfile))
          if (savedTx) setTransactions(JSON.parse(savedTx))
          if (savedSms) setSmsOrders(JSON.parse(savedSms))
          if (savedSmm) setSmmOrders(JSON.parse(savedSmm))
        }
      } catch (err) {
        console.error('Supabase DB Sync Error:', err)
      }
    }

    syncSupabaseUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      syncSupabaseUser()
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Sync to localStorage
  const saveState = (
    newProf: Profile,
    newTx = transactions,
    newSms = smsOrders,
    newSmm = smmOrders,
    newAcc = accountOrders,
    newKeys = apiKeys,
    newHooks = webhooks
  ) => {
    setProfileState(newProf)
    setTransactions(newTx)
    setSmsOrders(newSms)
    setSmmOrders(newSmm)
    setAccountOrders(newAcc)
    setApiKeys(newKeys)
    setWebhooks(newHooks)

    try {
      localStorage.setItem('premiumverific_profile', JSON.stringify(newProf))
      localStorage.setItem('premiumverific_tx', JSON.stringify(newTx))
      localStorage.setItem('premiumverific_sms', JSON.stringify(newSms))
      localStorage.setItem('premiumverific_smm', JSON.stringify(newSmm))
      localStorage.setItem('premiumverific_acc', JSON.stringify(newAcc))
      localStorage.setItem('premiumverific_keys', JSON.stringify(newKeys))
      localStorage.setItem('premiumverific_hooks', JSON.stringify(newHooks))
    } catch (e) {
      console.error('Failed to persist state', e)
    }
  }

  // Google OAuth Handler
  const loginWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      })
    } catch (err) {
      console.error('Google login error', err)
    }
  }

  // Deposit Money
  const topUpBalance = async (amount: number, method: 'mtn_momo' | 'orange_money' | 'visa_mastercard' | 'crypto_usdt', customRef?: string) => {
    const newBalance = profile.balance_xaf + amount
    const updatedProfile = { ...profile, balance_xaf: newBalance }

    const ref = customRef || 'DEP-' + Math.floor(100000 + Math.random() * 900000)

    const newTx: WalletTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      amount: amount,
      type: 'deposit',
      payment_method: method,
      reference: ref,
      status: 'completed',
      description: `Deposit via ${method.toUpperCase().replace('_', ' ')}`,
      created_at: new Date().toISOString()
    }

    const updatedTxList = [newTx, ...transactions]
    saveState(updatedProfile, updatedTxList)

    try {
      if (profile.id && !profile.id.startsWith('usr_default')) {
        await supabase.from('profiles').update({ balance_xaf: newBalance }).eq('id', profile.id)
        await supabase.from('wallet_transactions').insert({
          profile_id: profile.id,
          amount: amount,
          type: 'deposit',
          payment_method: method,
          reference: ref,
          status: 'completed',
          description: `Deposit via ${method.toUpperCase().replace('_', ' ')}`
        })
      }
    } catch (e) {
      console.error('Failed to sync topUpBalance to Supabase DB', e)
    }
  }

  // Buy SMS Virtual Number
  const buySmsNumber = (serviceName: string, serviceCode: string, countryName: string, countryCode: string, price: number): SmsOrder | null => {
    if (profile.balance_xaf < price) {
      return null
    }

    const newBalance = profile.balance_xaf - price
    const updatedProfile = { ...profile, balance_xaf: newBalance }

    const prefixes: Record<string, string> = { US: '+1 (407)', GB: '+44 7911', CA: '+1 (604)', CM: '+237 677', NG: '+234 803' }
    const prefix = prefixes[countryCode] || '+1 (555)'
    const generatedPhone = `${prefix} ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`

    const newOrder: SmsOrder = {
      id: 'sms_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      service_name: serviceName,
      service_code: serviceCode,
      country_name: countryName,
      country_code: countryCode,
      phone_number: generatedPhone,
      sms_code: null,
      price_xaf: price,
      status: 'waiting_sms',
      expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    }

    const newTx: WalletTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      amount: price,
      type: 'sms_purchase',
      payment_method: 'mtn_momo',
      reference: 'SMS-' + Math.floor(100000 + Math.random() * 900000),
      status: 'completed',
      description: `SMS Verification Number: ${serviceName} (${countryName})`,
      created_at: new Date().toISOString()
    }

    const updatedSms = [newOrder, ...smsOrders]
    const updatedTx = [newTx, ...transactions]
    saveState(updatedProfile, updatedTx, updatedSms)

    if (profile.id && !profile.id.startsWith('usr_default')) {
      supabase.from('profiles').update({ balance_xaf: newBalance }).eq('id', profile.id)
      supabase.from('sms_orders').insert({
        profile_id: profile.id,
        service_name: serviceName,
        service_code: serviceCode,
        country_name: countryName,
        country_code: countryCode,
        phone_number: generatedPhone,
        price_xaf: price,
        status: 'waiting_sms',
        expires_at: newOrder.expires_at
      })
    }

    // Simulate receiving SMS code after 8 seconds
    setTimeout(() => {
      setSmsOrders(currentOrders => {
        const target = currentOrders.find(o => o.id === newOrder.id)
        if (target && target.status === 'waiting_sms') {
          const code = Math.floor(100000 + Math.random() * 900000).toString()
          const updated = currentOrders.map(o => o.id === newOrder.id ? { ...o, sms_code: code, status: 'received' as const } : o)
          localStorage.setItem('premiumverific_sms', JSON.stringify(updated))
          return updated
        }
        return currentOrders
      })
    }, 8000)

    return newOrder
  }

  const cancelSmsOrder = (orderId: string) => {
    const target = smsOrders.find(o => o.id === orderId)
    if (!target || target.status !== 'waiting_sms') return

    const newBalance = profile.balance_xaf + target.price_xaf
    const updatedProfile = { ...profile, balance_xaf: newBalance }
    const updatedSms = smsOrders.map(o => o.id === orderId ? { ...o, status: 'canceled' as const } : o)

    const refundTx: WalletTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      amount: target.price_xaf,
      type: 'refund',
      payment_method: 'mtn_momo',
      reference: 'REF-' + Math.floor(100000 + Math.random() * 900000),
      status: 'completed',
      description: `Refund for canceled SMS order #${target.id}`,
      created_at: new Date().toISOString()
    }

    const updatedTx = [refundTx, ...transactions]
    saveState(updatedProfile, updatedTx, updatedSms)
  }

  // SMM Order Creation
  const createSmmOrder = (serviceId: number, serviceName: string, category: string, link: string, quantity: number, price: number): SmmOrder | null => {
    if (profile.balance_xaf < price) {
      return null
    }

    const newBalance = profile.balance_xaf - price
    const updatedProfile = { ...profile, balance_xaf: newBalance }

    const orderRef = Math.floor(100000 + Math.random() * 900000).toString()

    const newOrder: SmmOrder = {
      id: orderRef,
      profile_id: profile.id,
      service_id: serviceId,
      service_name: serviceName,
      category,
      target_link: link,
      quantity,
      charge_xaf: price,
      start_count: Math.floor(100 + Math.random() * 5000),
      remains: quantity,
      status: 'processing',
      api_order_id: 'JAP-' + Math.floor(10000000 + Math.random() * 90000000),
      created_at: new Date().toISOString()
    }

    const newTx: WalletTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      amount: price,
      type: 'smm_order',
      payment_method: 'mtn_momo',
      reference: 'SMM-' + newOrder.id,
      status: 'completed',
      description: `SMM Order: ${quantity.toLocaleString()} x ${serviceName}`,
      created_at: new Date().toISOString()
    }

    const updatedSmm = [newOrder, ...smmOrders]
    const updatedTx = [newTx, ...transactions]
    saveState(updatedProfile, updatedTx, smsOrders, updatedSmm)

    if (profile.id) {
      supabase.from('profiles').update({ balance_xaf: newBalance }).eq('id', profile.id).then()
      supabase.from('smm_orders').insert({
        profile_id: profile.id,
        service_id: serviceId,
        service_name: serviceName,
        category: category,
        target_link: link,
        quantity: quantity,
        charge_xaf: price,
        start_count: newOrder.start_count,
        remains: newOrder.remains,
        status: newOrder.status,
        api_order_id: newOrder.api_order_id
      }).then()
      supabase.from('wallet_transactions').insert({
        profile_id: profile.id,
        amount: price,
        type: 'smm_order',
        payment_method: 'mtn_momo',
        reference: 'SMM-' + newOrder.id,
        status: 'completed',
        description: `SMM Order: ${quantity.toLocaleString()} x ${serviceName}`
      }).then()
    }

    return newOrder
  }

  // Account Purchase
  const purchaseAccount = (title: string, category: string, price: number, deliveryType: 'instant' | 'manual'): AccountOrder | null => {
    if (profile.balance_xaf < price) {
      return null
    }

    const newBalance = profile.balance_xaf - price
    const updatedProfile = { ...profile, balance_xaf: newBalance }

    const mockCreds = deliveryType === 'instant' ? {
      username: `user_${Math.random().toString(36).substr(2, 6)}@premiumverific.com`,
      password: `Pass_${Math.random().toString(36).substr(2, 8)}!`,
      backup_codes: ['4910-2819', '8821-4401', '3910-1192']
    } : { instruction: 'Support team will deliver account credentials to your email within 1-2 hours.' }

    const newOrder: AccountOrder = {
      id: 'acc_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      item_title: title,
      category,
      price_xaf: price,
      delivery_type: deliveryType,
      credentials_data: mockCreds,
      status: 'completed',
      created_at: new Date().toISOString()
    }

    const newTx: WalletTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      amount: price,
      type: 'account_purchase',
      payment_method: 'mtn_momo',
      reference: 'ACC-' + Math.floor(100000 + Math.random() * 900000),
      status: 'completed',
      description: `Purchased: ${title}`,
      created_at: new Date().toISOString()
    }

    const updatedAcc = [newOrder, ...accountOrders]
    const updatedTx = [newTx, ...transactions]
    saveState(updatedProfile, updatedTx, smsOrders, smmOrders, updatedAcc)

    return newOrder
  }

  // Developer API Key Creation
  const addApiKey = (name: string): ApiKeyItem => {
    const rawKey = 'pv_live_' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
    const prefix = rawKey.substring(0, 14) + '...'

    const newKey: ApiKeyItem = {
      id: 'key_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      key_name: name || 'Production Key',
      api_key: rawKey,
      key_prefix: prefix,
      created_at: new Date().toISOString()
    }

    const updatedKeys = [newKey, ...apiKeys]
    saveState(profile, transactions, smsOrders, smmOrders, accountOrders, updatedKeys)
    return newKey
  }

  const deleteApiKey = (id: string) => {
    const updatedKeys = apiKeys.filter(k => k.id !== id)
    saveState(profile, transactions, smsOrders, smmOrders, accountOrders, updatedKeys)
  }

  // Webhook Endpoints
  const addWebhook = (url: string, events: string[]): WebhookEndpoint => {
    const newHook: WebhookEndpoint = {
      id: 'wh_' + Math.random().toString(36).substr(2, 9),
      profile_id: profile.id,
      url,
      events: events.length > 0 ? events : ['order.created', 'sms.received'],
      secret: 'whsec_' + Math.random().toString(36).substr(2, 16),
      is_active: true,
      created_at: new Date().toISOString()
    }

    const updatedHooks = [newHook, ...webhooks]
    saveState(profile, transactions, smsOrders, smmOrders, accountOrders, apiKeys, updatedHooks)
    return newHook
  }

  const deleteWebhook = (id: string) => {
    const updatedHooks = webhooks.filter(w => w.id !== id)
    saveState(profile, transactions, smsOrders, smmOrders, accountOrders, apiKeys, updatedHooks)
  }

  return (
    <AppStateContext.Provider
      value={{
        profile,
        transactions,
        smsOrders,
        smmOrders,
        accountOrders,
        apiKeys,
        webhooks,
        setProfile,
        loginWithGoogle,
        topUpBalance,
        buySmsNumber,
        cancelSmsOrder,
        createSmmOrder,
        purchaseAccount,
        addApiKey,
        deleteApiKey,
        addWebhook,
        deleteWebhook
      }}
    >
      {children}
    </AppStateContext.Provider>
  )
}

export const useAppState = () => {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
}
