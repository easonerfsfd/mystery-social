import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ALLOWED_TYPES = {
  'data:image/jpeg': 'jpg',
  'data:image/jpg':  'jpg',
  'data:image/png':  'png',
  'data:image/gif':  'gif',
  'data:image/webp': 'webp',
}

// 4MB decoded limit (base64 inflates ~33%, so 5.3MB base64 → ~4MB file)
const MAX_DECODED_BYTES = 4 * 1024 * 1024

export function saveImage(imageBase64, uploadsDir, prefix) {
  const mime = Object.keys(ALLOWED_TYPES).find(k => imageBase64.startsWith(k + ';base64,'))
  if (!mime) throw Object.assign(new Error('Unsupported image type'), { status: 400 })

  const ext = ALLOWED_TYPES[mime]
  const buffer = Buffer.from(imageBase64.slice(mime.length + ';base64,'.length), 'base64')
  if (buffer.length > MAX_DECODED_BYTES) throw Object.assign(new Error('Image too large'), { status: 413 })

  // prefix must already be safe (timestamp + fixed token)
  const filename = `${prefix}-${Date.now()}.${ext}`
  writeFileSync(join(uploadsDir, filename), buffer)
  return `/uploads/${filename}`
}
