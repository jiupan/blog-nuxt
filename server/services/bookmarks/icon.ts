import decodeIco from 'decode-ico'
import sharp from 'sharp'

const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex')
const maxIconPixels = 1024 * 1024

function decodeFrames(bytes: Buffer) {
  const count = bytes.readUInt16LE(4)
  const directoryEnd = 6 + count * 16
  if (!count || count > 16 || bytes.length < directoryEnd) throw new Error('Invalid ICO directory')
  // The decoder trusts DIB dimensions when allocating pixels. Check each frame first.
  for (let entry = 6; entry < directoryEnd; entry += 16) {
    const size = bytes.readUInt32LE(entry + 8)
    const offset = bytes.readUInt32LE(entry + 12)
    if (offset < directoryEnd || size < 26 || offset + size > bytes.length) throw new Error('Invalid ICO frame')
    const frame = bytes.subarray(offset, offset + size)
    if (!frame.subarray(0, 8).equals(pngSignature)) {
      if (size < 40 || frame.readUInt32LE(0) < 40 || frame.readUInt32LE(0) > size
        || frame.readUInt32LE(4) > 256 || frame.readUInt32LE(8) > 512 || frame.readUInt32LE(8) % 2
        || frame.readUInt32LE(16) !== 0 || frame.readUInt32LE(32) > 256) throw new Error('Invalid ICO bitmap')
    }
  }
  return decodeIco(bytes)
}

export async function normalizeSiteIcon(bytes: Buffer) {
  if (bytes.length >= 6 && bytes.readUInt32LE(0) === 0x00010000) {
    const frames = decodeFrames(bytes)
      .filter(frame => frame.width > 0 && frame.height > 0 && frame.width <= 256 && frame.height <= 256)
      .sort((a, b) => b.width * b.height - a.width * a.height || b.bpp - a.bpp)
    for (const frame of frames) {
      try {
        if (frame.type === 'png') return await renderIcon(Buffer.from(frame.data))
        return await sharp(Buffer.from(frame.data), { raw: { width: frame.width, height: frame.height, channels: 4 } })
          .resize(128, 128, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
      } catch { /* Try another size from the same ICO. */ }
    }
    throw new Error('No usable ICO frame')
  }
  return renderIcon(bytes)
}

async function renderIcon(bytes: Buffer) {
  const raster = bytes.subarray(0, 8).equals(pngSignature)
    || bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    || /^GIF8[79]a$/.test(bytes.toString('ascii', 0, 6))
    || (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
  // Only simple SVG is accepted. It is rendered from memory without a base URL.
  if (!raster) {
    const svg = bytes.toString('utf8').trim()
    if (bytes.length > 128 * 1024 || !svg.startsWith('<') || !/<svg[\s>]/i.test(svg)
      || /<!DOCTYPE|<!ENTITY|<(?:[\w.-]+:)?(?:image|feimage)\b|\bdata\s*:|&#|\\/i.test(svg)) throw new Error('Unsupported SVG content')
  }
  const icon = sharp(bytes, { limitInputPixels: maxIconPixels }).timeout({ seconds: 2 })
  const { format } = await icon.metadata()
  if (raster ? !format || !['png', 'jpeg', 'webp', 'gif'].includes(format) : format !== 'svg') throw new Error('Unsupported icon format')
  return icon.resize(128, 128, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()
}
