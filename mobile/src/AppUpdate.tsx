import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, Platform, StyleSheet, Text, View } from 'react-native'
import * as Application from 'expo-application'
import { File, Paths } from 'expo-file-system'
import { getContentUriAsync } from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import { apiUrl } from './client'
import { parseAndroidRelease, type AndroidRelease } from './app-release'
import { ActionButton } from './ui'

const officialDownload = 'https://premiumverific.com/downloads'
const installedBuild = Number(Application.nativeBuildVersion || 0)
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'

export default function AppUpdate({ showWhenCurrent = false }: { showWhenCurrent?: boolean }) {
  const [release, setRelease] = useState<AndroidRelease | null>(null)
  const [notice, setNotice] = useState('')
  const [checking, setChecking] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [installing, setInstalling] = useState(false)
  const lastCheck = useRef(0)
  const locked = useRef(false)
  const check = useCallback(async (force = false) => {
    if (Platform.OS !== 'android' || !Number.isSafeInteger(installedBuild) || installedBuild < 1 || locked.current) return
    if (!force && Date.now() - lastCheck.current < 60 * 60 * 1000) return
    lastCheck.current = Date.now()
    setChecking(true)
    try {
      const response = await fetch(apiUrl + '/api/mobile/release', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      if (!response.ok) throw new Error('Could not check for updates.')
      setRelease(parseAndroidRelease(await response.json(), installedBuild))
      if (force) setNotice('Update check complete.')
    } catch (error) { if (force) setNotice(messageOf(error)) }
    finally { setChecking(false) }
  }, [])
  useEffect(() => {
    void check()
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void check() })
    return () => listener.remove()
  }, [check])
  const install = async () => {
    if (!release || locked.current) return
    locked.current = true
    setInstalling(true)
    setNotice('Downloading the official signed update...')
    setProgress(0)
    let downloaded: File | null = null
    try {
      const target = new File(Paths.cache, `premiumverific-${release.versionCode}.apk`)
      downloaded = await File.downloadFileAsync(release.url, target, {
        idempotent: true,
        onProgress: ({ bytesWritten, totalBytes }) => setProgress(Math.min(100, Math.round(bytesWritten * 100 / (totalBytes > 0 ? totalBytes : release.sizeBytes)))),
      })
      if (downloaded.size !== release.sizeBytes) throw new Error('The update download was incomplete. Please try again.')
      setNotice('Verifying the update...')
      const hash = sha256.create()
      const reader = downloaded.readableStream().getReader()
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          hash.update(value)
        }
      } finally { reader.releaseLock() }
      if (bytesToHex(hash.digest()) !== release.sha256) throw new Error('The update did not pass its integrity check. It will not be installed.')
      const contentUri = await getContentUriAsync(downloaded.uri)
      setNotice('Android will ask you to confirm the update. Your account and wallet remain unchanged.')
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION for Android's installer.
      })
    } catch (error) {
      if (downloaded?.exists) { try { downloaded.delete() } catch { /* cache cleanup is best-effort */ } }
      setNotice(messageOf(error) + ' You can use the official website download if needed.')
    } finally { locked.current = false; setInstalling(false); setProgress(null) }
  }
  if (Platform.OS !== 'android' || (!release && !showWhenCurrent)) return null
  return <View style={s.card}>
    <Text style={s.title}>{release ? 'App update available' : 'App updates'}</Text>
    <Text style={s.text}>{release ? `Version ${release.version}, build ${release.versionCode}, is ready. Download and install it here without finding the APK in your browser.` : `Installed build ${installedBuild}. Check for a newer version anytime.`}</Text>
    {release && <ActionButton title={installing ? `Downloading${progress === null ? '...' : ` ${progress}%`}` : 'Update in app'} disabled={installing} onPress={() => void install()} />}
    {showWhenCurrent && <ActionButton secondary title={checking ? 'Checking...' : 'Check for updates'} disabled={checking || installing} onPress={() => void check(true)} />}
    {release && <ActionButton secondary title="Use official website if needed" onPress={() => void Linking.openURL(officialDownload)} />}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.text}>{notice}</Text>}
    <Text style={s.small}>Android controls installation permissions and may show a safety warning. We cannot disable those checks.</Text>
  </View>
}

const s = StyleSheet.create({ card: { backgroundColor: '#fff7ed', borderColor: '#fed7aa', borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 }, title: { color: '#9a3412', fontSize: 18, fontWeight: '800' }, text: { color: '#334155', fontSize: 14, lineHeight: 21 }, small: { color: '#64748b', fontSize: 12, lineHeight: 18 } })
