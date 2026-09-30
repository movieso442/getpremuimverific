'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_PLATFORM_SETTINGS, PlatformSettings } from '@/lib/platform/settings'

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS)

  useEffect(() => {
    let mounted = true
    fetch('/api/platform', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : DEFAULT_PLATFORM_SETTINGS)
      .then((value) => { if (mounted) setSettings({ ...DEFAULT_PLATFORM_SETTINGS, ...value }) })
      .catch(() => undefined)
    return () => { mounted = false }
  }, [])

  return settings
}
