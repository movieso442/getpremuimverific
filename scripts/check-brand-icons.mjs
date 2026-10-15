import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const ico = await readFile('app/favicon.ico')
assert.equal(ico.readUInt16LE(0), 0)
assert.equal(ico.readUInt16LE(2), 1)
assert.equal(ico.readUInt16LE(4), 6)
for (const [index,size] of [16,32,48,64,128,256].entries()) {
  const entry = 6 + index * 16, bytes = ico.readUInt32LE(entry+8), offset = ico.readUInt32LE(entry+12)
  assert.equal(ico[entry] || 256, size)
  assert.equal(ico[entry+1] || 256, size)
  assert.ok(offset + bytes <= ico.length)
  const actual = ico.subarray(offset, offset+bytes)
  const expected = await sharp('public/brand/mark-master.png').resize(size,size,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).ensureAlpha().png().toBuffer()
  assert.deepEqual(actual, expected, 'ICO must contain this brand mark, not a default framework icon')
}
for (const [path,size] of [['public/brand/favicon.png',96],['public/brand/favicon-32.png',32],['public/brand/icon-192.png',192],['public/brand/icon-512.png',512],['public/brand/apple-touch-icon.png',180],['mobile/assets/app-icon.png',1024],['mobile/assets/adaptive-icon.png',1024]]) {
  const metadata = await sharp(path).metadata()
  assert.equal(metadata.width,size,path); assert.equal(metadata.height,size,path)
}
console.log('PASS: six ICO representations contain the PV logo; search, browser, Apple and Android icons have expected dimensions.')
