import { realpath, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { homeHeroFallbackCover } from '~~/shared/home-hero'
import { resolveUploadPath, toUploadRelativePath } from './path-safety'

const maxFileBytes = 24 * 1024 * 1024
const maxCacheEntries = 128
const samples = new Map<string, { version: string, color: Promise<string> }>()

function colorFromPixels(pixels: Uint8Array) {
  const sum: [number, number, number] = [0, 0, 0]
  let weight = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i] ?? 0
    const green = pixels[i + 1] ?? 0
    const blue = pixels[i + 2] ?? 0
    const alpha = pixels[i + 3] ?? 0
    const strength = (alpha / 255) * (1 + (Math.max(red, green, blue) - Math.min(red, green, blue)) / 64)
    sum[0] += red * strength
    sum[1] += green * strength
    sum[2] += blue * strength
    weight += strength
  }
  return weight ? `#${sum.map(value => Math.round(value / weight).toString(16).padStart(2, '0')).join('')}` : ''
}

async function sampleLocalCover(cover: string, siteUrl: string, uploadDir: string) {
  try {
    const site = new URL(siteUrl)
    const url = new URL(cover, site.origin)
    if (url.origin !== site.origin) return ''
    const path = decodeURIComponent(url.pathname)
    if (!/\.(?:jpe?g|png|webp|gif|avif)$/i.test(path) || path.includes('\\')) return ''

    const uploaded = path.startsWith('/uploads/')
    const root = await realpath(uploaded ? resolve(uploadDir) : resolve(import.meta.dev ? 'public' : '.output/public'))
    const { filepath } = resolveUploadPath(root, path)
    const file = await realpath(filepath)
    if (!toUploadRelativePath(root, file)) return ''
    const metadata = await stat(file)
    if (!metadata.isFile() || metadata.size > maxFileBytes) return ''

    const version = `${metadata.mtimeMs}:${metadata.size}`
    const previous = samples.get(file)
    if (previous?.version === version) return await previous.color

    const color = sharp(file, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(16, 16, { fit: 'fill' })
      .toColourspace('srgb')
      .ensureAlpha()
      .raw()
      .toBuffer()
      .then(colorFromPixels, () => '')
    samples.delete(file)
    samples.set(file, { version, color })
    const oldest = samples.keys().next().value
    if (oldest && samples.size > maxCacheEntries) samples.delete(oldest)
    return await color
  } catch {
    return ''
  }
}

export async function resolveHomeCoverColor(cover: string | null | undefined, siteUrl: string, uploadDir: string) {
  if (cover) {
    const color = await sampleLocalCover(cover, siteUrl, uploadDir)
    if (color) return color
  }
  return sampleLocalCover(homeHeroFallbackCover, siteUrl, uploadDir)
}
