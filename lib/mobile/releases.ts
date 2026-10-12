export function androidRelease(env: Record<string, string | undefined> = process.env) {
  const raw = env.APP_ANDROID_APK_URL
  const checksum = env.APP_ANDROID_APK_SHA256?.toLowerCase()
  const version = env.APP_MOBILE_VERSION
  if (!raw || !checksum || !/^[a-f0-9]{64}$/.test(checksum) || !version || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(version)) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || !url.pathname.endsWith('.apk')) return null
    return { url: url.href, checksum, version }
  } catch { return null }
}
export function iphoneRelease(env: Record<string, string | undefined> = process.env) {
  try {
    const url = new URL(env.APP_IOS_INSTALL_URL || '')
    if (url.protocol !== 'https:' || url.username || url.password) return null
    if (url.hostname === 'testflight.apple.com' && /^\/join\/[a-z0-9]+\/?$/i.test(url.pathname)) return { url: url.href, label: 'Join iPhone beta', type: 'testflight' as const }
    if (url.hostname === 'apps.apple.com' && /\/id\d+/.test(url.pathname)) return { url: url.href, label: 'Get the iPhone app', type: 'app-store' as const }
    return null
  } catch { return null }
}
