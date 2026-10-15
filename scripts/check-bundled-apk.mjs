// Download/verify the approved release asset into public. No account credentials.
import {readFile,stat,mkdir,rename} from 'node:fs/promises'
import {createReadStream,createWriteStream} from 'node:fs'
import {createHash} from 'node:crypto'
import {Readable} from 'node:stream'
import {pipeline} from 'node:stream/promises'
const release=JSON.parse(await readFile('lib/mobile/android-release.json','utf8'))
if(!release.available){console.log('No bundled Android release has been approved yet.');process.exit(0)}
if(!(release.filename==='premiumverific.apk'||/^premium-verific-[a-zA-Z0-9.-]+\.apk$/.test(release.filename))||release.url!==`/downloads/${release.filename}`||!/^[a-f0-9]{64}$/.test(release.checksum)||!Number.isInteger(release.sizeBytes)||release.sizeBytes<=0)throw new Error('Invalid bundled APK manifest.')
const source=new URL(release.sourceUrl)
if(source.protocol!=='https:'||source.hostname!=='github.com'||!source.pathname.startsWith('/cybernurdin/getpremuimverific/releases/download/')||!source.pathname.endsWith(`/${release.filename}`)||source.username||source.password||source.search)throw new Error('APK source must be the approved public GitHub release asset.')
const target=`public/downloads/${release.filename}`
async function verify(path){
 const file=await stat(path)
 if(!file.isFile()||file.size!==release.sizeBytes)throw new Error('APK size does not match the approved build.')
 const hash=createHash('sha256')
 for await(const chunk of createReadStream(path))hash.update(chunk)
 if(hash.digest('hex')!==release.checksum)throw new Error('APK checksum does not match the approved build.')
}
let exists=true
try{await stat(target)}catch(error){if(error.code==='ENOENT')exists=false;else throw error}
if(!exists){
 await mkdir('public/downloads',{recursive:true})
 console.log('Downloading the verified Android release asset for static hosting…')
 const response=await fetch(source,{signal:AbortSignal.timeout(120000)})
 if(!response.ok||!response.body)throw new Error(`Public APK download failed (${response.status}).`)
 const partial=`${target}.part`
 await pipeline(Readable.fromWeb(response.body),createWriteStream(partial))
 await verify(partial)
 await rename(partial,target)
}
await verify(target)
console.log(`Verified bundled Android APK: ${release.filename} (${release.sizeBytes} bytes).`)
