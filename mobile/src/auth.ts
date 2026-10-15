import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import { apiUrl, supabase } from './client'
import { nativeAuthCode, nativeBridgeUrl, type PendingAuth } from './auth-links'

const pendingKey = 'pv-auth.pending'
let completing: Promise<boolean> | null = null
let completingUrl = ''
let completed: { url: string; until: number } | null = null
export async function startNativeAuth(kind: PendingAuth['kind']) {
  const pending: PendingAuth = { state: Crypto.randomUUID(), createdAt: Date.now(), kind }
  await SecureStore.setItemAsync(pendingKey, JSON.stringify(pending))
  return nativeBridgeUrl(apiUrl, pending.state)
}
export async function signupRedirect() {
  const raw = await SecureStore.getItemAsync(pendingKey)
  const pending: PendingAuth | null = raw ? JSON.parse(raw) : null
  if (pending?.kind === 'signup' && Date.now() - pending.createdAt < 86400000) return nativeBridgeUrl(apiUrl, pending.state)
  return startNativeAuth('signup')
}
export async function completeNativeAuth(url: string): Promise<boolean> {
  if (completed?.url === url && completed.until > Date.now()) return true
  if (completing) {
    if (completingUrl !== url) throw new Error('Another sign-in is being verified. Please wait.')
    return completing
  }
  completingUrl = url
  completing = (async () => {
    if (!supabase) throw new Error('App authentication is not configured.')
    const raw = await SecureStore.getItemAsync(pendingKey)
    const code = nativeAuthCode(url, raw ? JSON.parse(raw) : null)
    // Only the native client holds the matching PKCE verifier in SecureStore.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw new Error('Sign-in could not be completed. Return to the app and start again.')
    if (!data.session) throw new Error('Sign-in did not create a session. Please try again.')
    completed = { url, until: Date.now() + 60000 }
    await SecureStore.deleteItemAsync(pendingKey).catch(() => undefined)
    return true
  })()
  try { return await completing } finally { completing = null; completingUrl = '' }
}
