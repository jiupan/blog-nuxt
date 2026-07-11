import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { badRequest } from '~~/server/utils/api-error'
import { resolveUploadRoot, toUploadUrl } from './path-safety'

const maxUploadSize = 10 * 1024 * 1024
const maxInputPixels = 40_000_000
const allowedFormats = new Set(['jpeg', 'png', 'webp'])
const memeFormats = new Set(['jpeg', 'png', 'webp', 'gif'])
const unsafeSvgPattern = /<\s*(?:script|foreignobject|iframe|object|embed|link|style)\b|(?:\s|<)on[a-z]+\s*=|javascript:/i

export type UploadPurpose = 'image' | 'cover' | 'favicon' | 'meme'

export type UploadedImage = {
  url: string
}

export function parseUploadPurpose(value: unknown): UploadPurpose {
  if (value === 'favicon') return 'favicon'
  if (value === 'meme') return 'meme'
  if (value === 'cover') return 'cover'
  return 'image'
}

export async function uploadImage(input: Buffer, purpose: UploadPurpose): Promise<UploadedImage> {
  if (!input.byteLength) {
    throw badRequest('请选择要上传的图片')
  }

  if (input.byteLength > maxUploadSize) {
    throw badRequest('原图不能超过 10MB')
  }

  const config = useRuntimeConfig()
  const uploadRoot = resolveUploadRoot(config.uploadDir)
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const isMeme = purpose === 'meme'
  const isCover = purpose === 'cover'
  const output = await optimizeImage(input, purpose)
  const filename = `${randomUUID()}${output.extension}`
  const relativeDir = isMeme ? `memes/${year}/${month}` : isCover ? `covers/${year}/${month}` : `${year}/${month}`
  const relativePath = `${relativeDir}/${filename}`

  await mkdir(join(uploadRoot, relativeDir), { recursive: true })
  await writeFile(join(uploadRoot, relativePath), output.data)

  return {
    url: toUploadUrl(relativePath)
  }
}

async function optimizeImage(input: Buffer, purpose: UploadPurpose) {
  if (purpose === 'favicon' && isSvg(input)) {
    const svg = normalizeSvg(input.toString('utf8'))
    if (unsafeSvgPattern.test(svg)) {
      throw badRequest('SVG 不能包含脚本、事件或外部可执行内容')
    }

    return {
      data: Buffer.from(svg.trim()),
      extension: '.svg'
    }
  }

  const image = sharp(input, { limitInputPixels: maxInputPixels })
  const metadata = await image.metadata().catch(() => null)
  const format = metadata?.format || ''
  const allowed = purpose === 'meme' ? memeFormats : allowedFormats

  if (!format || !allowed.has(format) || !metadata?.width || !metadata.height) {
    throw badRequest(purpose === 'meme' ? '表情包只支持 jpg/png/webp/gif 图片' : purpose === 'favicon' ? 'Favicon 只支持 jpg/png/webp/svg 图片' : '只支持 jpg/png/webp 图片')
  }

  if (purpose === 'meme' && format === 'gif') {
    return {
      data: input,
      extension: '.gif'
    }
  }

  const transformer = sharp(input, { limitInputPixels: maxInputPixels })
    .rotate()
    .resize({
      width: purpose === 'favicon' ? 512 : 1600,
      height: purpose === 'favicon' ? 512 : undefined,
      fit: 'inside',
      withoutEnlargement: true
    })

  try {
    if (purpose === 'favicon') {
      return {
        data: await transformer
          .png({ compressionLevel: 9, quality: 85 })
          .toBuffer(),
        extension: '.png'
      }
    }

    return {
      data: await transformer
        .webp({ quality: purpose === 'meme' ? 86 : 80, effort: 4 })
        .toBuffer(),
      extension: '.webp'
    }
  } catch {
    throw badRequest('图片处理失败，请换一张图片重试')
  }
}

function isSvg(input: Buffer) {
  const head = input.subarray(0, 512).toString('utf8').trimStart()
  return head.startsWith('<svg') || head.startsWith('<?xml') && head.includes('<svg')
}

function normalizeSvg(input: string) {
  let svg = input.trim()
  svg = svg.replace(/<path\b(?=[^>]*\bfill=(["'])#fff(?:fff)?\1)(?=[^>]*\btransform=(["'])translate\(0,0\)\2)[^>]*\/>\s*/gi, '')

  const svgTag = svg.match(/<svg\b[^>]*>/i)?.[0]
  if (svgTag && !/\bviewBox=/i.test(svgTag)) {
    const width = Number(svgTag.match(/\bwidth=(["'])(\d+(?:\.\d+)?)\1/i)?.[2])
    const height = Number(svgTag.match(/\bheight=(["'])(\d+(?:\.\d+)?)\1/i)?.[2])
    if (width > 0 && height > 0) {
      svg = svg.replace(svgTag, svgTag.replace(/>$/, ` viewBox="0 0 ${width} ${height}">`))
    }
  }

  return svg
}
