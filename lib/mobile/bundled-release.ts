// The prebuild check verifies the binary's size and SHA-256 before deployment.
import manifest from './android-release.json'
export function bundledAndroidRelease(release=manifest){
 if(!release.available||!(release.filename==='premiumverific.apk'||/^premium-verific-[a-zA-Z0-9.-]+\.apk$/.test(release.filename))||release.url!==`/downloads/${release.filename}`||!/^\d+\.\d+\.\d+$/.test(release.version)||!/^[a-f0-9]{64}$/.test(release.checksum)||!Number.isInteger(release.versionCode)||release.versionCode<1||release.sizeBytes<=0)return null
 return {url:release.url,filename:release.filename,version:release.version,checksum:release.checksum,versionCode:release.versionCode,sizeBytes:release.sizeBytes,channel:'beta' as const}
}
