// Deterministic format/size derivatives of the imagegen-extracted logo mark.
import sharp from 'sharp'
import { mkdir, copyFile } from 'node:fs/promises'
import { readFile, writeFile } from 'node:fs/promises'
const source = 'public/brand/mark-master.png'
for (const [size,name] of [[32,'favicon-32'],[192,'icon-192'],[512,'icon-512'],[180,'apple-touch-icon']]) {
  await sharp(source).resize(size,size,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).ensureAlpha().png().toFile(`public/brand/${name}.png`)
}
await mkdir('mobile/assets',{recursive:true})
await sharp(source).resize(720,720,{fit:'contain'}).extend({top:152,bottom:152,left:152,right:152,background:'#ffffff'}).flatten({background:'#ffffff'}).png().toFile('mobile/assets/app-icon.png')
await sharp(source).resize(640,640,{fit:'contain'}).extend({top:192,bottom:192,left:192,right:192,background:{r:0,g:0,b:0,alpha:0}}).png().toFile('mobile/assets/adaptive-icon.png')
await copyFile('public/brand/icon-192.png','mobile/assets/favicon.png')
const favicon = await readFile('public/brand/favicon-32.png')
const header = Buffer.alloc(22)
header.writeUInt16LE(1,2); header.writeUInt16LE(1,4)
header[6]=32; header[7]=32; header.writeUInt16LE(1,10); header.writeUInt16LE(32,12)
header.writeUInt32LE(favicon.length,14); header.writeUInt32LE(22,18)
await writeFile('app/favicon.ico',Buffer.concat([header,favicon]))
console.log('Brand icon assets generated for web, Apple home screen and Android/iPhone native builds.')
