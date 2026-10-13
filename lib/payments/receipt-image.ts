export const RECEIPT_MAX_BYTES = 3 * 1024 * 1024
export const RECEIPT_BUCKET = 'payment-receipts'

// Do not trust file names or a browser-supplied content type. SVG/HTML are never accepted.
export function receiptImageType(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > RECEIPT_MAX_BYTES) return null
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return { mime: 'image/png', extension: 'png' }
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' }
  const ascii = (offset: number, value: string) => [...value].every((char, index) => bytes[offset + index] === char.charCodeAt(0))
  if (bytes.length >= 16 && ascii(0, 'RIFF') && ascii(8, 'WEBP') && (ascii(12, 'VP8 ') || ascii(12, 'VP8L') || ascii(12, 'VP8X'))) return { mime: 'image/webp', extension: 'webp' }
  return null
}
