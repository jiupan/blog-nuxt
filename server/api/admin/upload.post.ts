import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

const maxUploadSize = 10 * 1024 * 1024
const maxInputPixels = 40_000_000
const allowedFormats = new Set(['jpeg', 'png', 'webp'])
const memeFormats = new Set(['jpeg', 'png', 'webp', 'gif'])

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const files = await readMultipartFormData(event)
  const file = files?.find((item) => item.name === 'file')

  if (!file?.data) {
    throw createError({ statusCode: 400, statusMessage: '请选择要上传的图片' })
  }

  if (file.data.byteLength > maxUploadSize) {
    throw createError({ statusCode: 400, statusMessage: '原图不能超过 10MB' })
  }

  const config = useRuntimeConfig()
  const purpose = String(getQuery(event).purpose || '')
  const isFavicon = purpose === 'favicon'
  const isMeme = purpose === 'meme'
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const output = await optimizeImage(file.data, { isFavicon, isMeme })
  const extension = output.extension
  const filename = `${randomUUID()}${extension}`
  const dir = isMeme ? join(config.uploadDir, 'memes', year, month) : join(config.uploadDir, year, month)
  const urlPath = isMeme ? `memes/${year}/${month}/${filename}` : `${year}/${month}/${filename}`

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), output.data)

  return ok({
    url: `/uploads/${urlPath}`
  })
})

async function optimizeImage(input: Buffer, options: { isFavicon: boolean, isMeme: boolean }) {
  const image = sharp(input, { limitInputPixels: maxInputPixels })
  const metadata = await image.metadata().catch(() => null)
  const format = metadata?.format || ''
  const allowed = options.isMeme ? memeFormats : allowedFormats

  if (!format || !allowed.has(format) || !metadata?.width || !metadata.height) {
    throw createError({ statusCode: 400, statusMessage: options.isMeme ? '表情包只支持 jpg/png/webp/gif 图片' : '只支持 jpg/png/webp 图片' })
  }

  if (options.isMeme && format === 'gif') {
    return {
      data: input,
      extension: '.gif'
    }
  }

  const transformer = sharp(input, { limitInputPixels: maxInputPixels })
    .rotate()
    .resize({
      width: options.isFavicon ? 512 : 1600,
      height: options.isFavicon ? 512 : undefined,
      fit: 'inside',
      withoutEnlargement: true
    })

  try {
    if (options.isFavicon) {
      return {
        data: await transformer
          .png({ compressionLevel: 9, quality: 85 })
          .toBuffer(),
        extension: '.png'
      }
    }

    return {
      data: await transformer
        .webp({ quality: options.isMeme ? 86 : 80, effort: 4 })
        .toBuffer(),
      extension: '.webp'
    }
  } catch {
    throw createError({ statusCode: 400, statusMessage: '图片处理失败，请换一张图片重试' })
  }
}
