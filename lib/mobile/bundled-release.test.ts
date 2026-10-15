import {test} from 'node:test'
import assert from 'node:assert/strict'
import {bundledAndroidRelease} from './bundled-release'
const release={available:true,url:'/downloads/premium-verific-0.1.0-build3.apk',sourceUrl:'',filename:'premium-verific-0.1.0-build3.apk',version:'0.1.0',versionCode:3,checksum:'a'.repeat(64),sizeBytes:73000000,channel:'beta',buildId:'test'}
test('verified bundled APK uses a same-origin URL and beta label',()=>{
 assert.equal(bundledAndroidRelease(release)?.url,release.url)
 assert.equal(bundledAndroidRelease(release)?.channel,'beta')
})
test('unavailable, unsafe or incomplete bundles do not enable a download',()=>{
 for(const change of [{available:false},{filename:'../secret.apk'},{url:'https://evil.example/app.apk'},{checksum:'invalid'},{versionCode:0},{sizeBytes:0},{version:'soon'}])assert.equal(bundledAndroidRelease({...release,...change}),null)
})
test('friendly premiumverific APK name remains same-origin and checksum-validated',()=>{
 const friendly={...release,filename:'premiumverific.apk',url:'/downloads/premiumverific.apk'}
 assert.equal(bundledAndroidRelease(friendly)?.filename,'premiumverific.apk')
 assert.equal(bundledAndroidRelease({...friendly,filename:'other.apk'}),null)
})
