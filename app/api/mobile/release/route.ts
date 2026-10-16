import { bundledAndroidRelease } from '@/lib/mobile/bundled-release'

export async function GET() {
  const release = bundledAndroidRelease()
  if (!release) return Response.json({ available: false }, { headers: { 'Cache-Control': 'no-store' } })
  return Response.json({
    available: true,
    version: release.version,
    versionCode: release.versionCode,
    url: `https://premiumverific.com${release.url}`,
    sha256: release.checksum,
    sizeBytes: release.sizeBytes,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
