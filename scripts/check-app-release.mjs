import assert from 'node:assert/strict'
import { parseAndroidRelease } from '../mobile/src/app-release.ts'

const release = { available: true, version: '0.1.0', versionCode: 9, url: 'https://premiumverific.com/downloads/premiumverific.apk', sha256: 'a'.repeat(64), sizeBytes: 72_000_000 }
assert.deepEqual(parseAndroidRelease(release, 8), { version: release.version, versionCode: release.versionCode, url: release.url, sha256: release.sha256, sizeBytes: release.sizeBytes })
assert.equal(parseAndroidRelease(release, 9), null)
assert.equal(parseAndroidRelease({ ...release, url: 'https://other.example/app.apk' }, 8), null)
assert.equal(parseAndroidRelease({ ...release, url: 'http://premiumverific.com/downloads/premiumverific.apk' }, 8), null)
assert.equal(parseAndroidRelease({ ...release, sha256: 'bad' }, 8), null)
assert.equal(parseAndroidRelease({ ...release, sizeBytes: 100 }, 8), null)
console.log('Android release validation checks passed.')
