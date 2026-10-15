// Deterministic format/size derivatives of the imagegen-extracted logo mark.
import sharp from 'sharp'
import { mkdir, copyFile } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
const source = 'public/brand/mark-master.png'
for (const [size,name] of [[32,'favicon-32'],[96,'favicon'],[192,'icon-192'],[512,'icon-512'],[180,'apple-touch-icon']]) {
  await sharp(source).resize(size,size,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).ensureAlpha().png().toFile(`public/brand/${name}.png`)
}
await mkdir('mobile/assets',{recursive:true})
await sharp(source).resize(720,720,{fit:'contain'}).extend({top:152,bottom:152,left:152,right:152,background:'#ffffff'}).flatten({background:'#ffffff'}).png().toFile('mobile/assets/app-icon.png')
await sharp(source).resize(640,640,{fit:'contain'}).extend({top:192,bottom:192,left:192,right:192,background:{r:0,g:0,b:0,alpha:0}}).png().toFile('mobile/assets/adaptive-icon.png')
await copyFile('public/brand/icon-192.png','mobile/assets/favicon.png')
// Include real small and high-DPI representations, not a single 32px image.
const sizes = [16,32,48,64,128,256]
const images = await Promise.all(sizes.map(size => sharp(source).resize(size,size,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).ensureAlpha().png().toBuffer()))
const header = Buffer.alloc(6 + 16 * sizes.length)
header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4)
let offset = header.length
for (const [index,size] of sizes.entries()) {
  const entry = 6 + index * 16
  header[entry]=size===256?0:size; header[entry+1]=size===256?0:size
  header.writeUInt16LE(1,entry+4); header.writeUInt16LE(32,entry+6)
  header.writeUInt32LE(images[index].length,entry+8); header.writeUInt32LE(offset,entry+12)
  offset += images[index].length
}
await writeFile('app/favicon.ico',Buffer.concat([header,...images]))
console.log('Brand icon assets generated for web, Apple home screen and Android/iPhone native builds.')
