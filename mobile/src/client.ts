import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'

export const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '')
export const configured = Boolean(apiUrl.startsWith('https://') && process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
// Supabase sessions can exceed the keychain's per-item limit. Store bounded
// chunks, with the count written last so a partial write is never a session.
const storage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(key + '.count'))
    if (!Number.isInteger(count) || count < 1 || count > 64) return null
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(key + '.' + i)))
    return parts.some(part => part === null) ? null : parts.join('')
  },
  async setItem(key: string, value: string) {
    const count = Math.ceil(value.length / 1000)
    if (count > 64) throw new Error('Session is too large for secure storage.')
    await SecureStore.deleteItemAsync(key + '.count')
    for (let i = 0; i < count; i++) await SecureStore.setItemAsync(key + '.' + i, value.slice(i * 1000, (i + 1) * 1000))
    await SecureStore.setItemAsync(key + '.count', String(count))
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(key + '.count')) || 0
    await SecureStore.deleteItemAsync(key + '.count')
    for (let i = 0; i < Math.min(count, 64); i++) await SecureStore.deleteItemAsync(key + '.' + i)
  },
}
export const supabase = configured ? createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
}) : null

export function manageRefresh() {
  if (AppState.currentState === 'active') supabase?.auth.startAutoRefresh()
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') supabase?.auth.startAutoRefresh()
    else supabase?.auth.stopAutoRefresh()
  })
  return () => { subscription.remove(); supabase?.auth.stopAutoRefresh() }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (!supabase) throw new Error('Mobile environment is not configured.')
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) throw new Error('Please sign in again.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), body === undefined ? 20000 : 50000)
  try {
    const response = await fetch(apiUrl + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    const result = await response.json().catch(() => ({ error: 'The service is temporarily unavailable. Please check your connection.' }))
    if (!response.ok) throw new Error(result.error || 'Request could not be completed.')
    return result as T
  } finally { clearTimeout(timer) }
}
