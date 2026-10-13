import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RECEIPT_MAX_BYTES, receiptImageType } from './receipt-image'
test('receipt accepts raster signatures, rejects HTML/SVG and oversized files', () => {
  assert.equal(receiptImageType(Uint8Array.from([137,80,78,71,13,10,26,10]))?.mime, 'image/png')
  assert.equal(receiptImageType(Uint8Array.from([255,216,255,0]))?.mime, 'image/jpeg')
  assert.equal(receiptImageType(Buffer.from('RIFF0000WEBPVP8X'))?.mime, 'image/webp')
  for (const input of ['', '<svg></svg>', '<html>image.png</html>', 'RIFF0000WEBPFAIL']) assert.equal(receiptImageType(Buffer.from(input)), null)
  assert.equal(receiptImageType(new Uint8Array(RECEIPT_MAX_BYTES + 1)), null)
})
