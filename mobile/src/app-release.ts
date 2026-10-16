export type AndroidRelease = {
  version: string
  versionCode: number
  url: string
  sha256: string
  sizeBytes: number
}

export function parseAndroidRelease(value: unknown, installedBuild: number): AndroidRelease | null {
  if (!value || typeof value !== 'object') return null
  const release = value as Record<string, unknown>
  if (release.available !== true || typeof release.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(release.version)
    || !Number.isSafeInteger(release.versionCode) || Number(release.versionCode) <= installedBuild
    || release.url !== 'https://premiumverific.com/downloads/premiumverific.apk'
    || typeof release.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(release.sha256)
    || !Number.isSafeInteger(release.sizeBytes) || Number(release.sizeBytes) < 10_000_000 || Number(release.sizeBytes) > 200_000_000) return null
  return {
    version: release.version as string,
    versionCode: release.versionCode as number,
    url: release.url as string,
    sha256: release.sha256 as string,
    sizeBytes: release.sizeBytes as number,
  }
}
