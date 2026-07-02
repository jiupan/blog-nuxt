import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

const maxUploadSize = 10 * 1024 * 1024
const maxInputPixels = 40_000_000
const allowedFormats = new Set(['jpeg', 'png', 'webp'])

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
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const extension = isFavicon ? '.png' : '.webp'
  const filename = `${randomUUID()}${extension}`
  const dir = join(config.uploadDir, year, month)
  const output = await optimizeImage(file.data, isFavicon)

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), output)

  return ok({
    url: `/uploads/${year}/${month}/${filename}`
  })
})

async function optimizeImage(input: Buffer, isFavicon: boolean) {
  const image = sharp(input, { limitInputPixels: maxInputPixels })
  const metadata = await image.metadata().catch(() => null)

  if (!metadata?.format || !allowedFormats.has(metadata.format) || !metadata.width || !metadata.height) {
    throw createError({ statusCode: 400, statusMessage: '只支持 jpg/png/webp 图片' })
  }

  const transformer = sharp(input, { limitInputPixels: maxInputPixels })
    .rotate()
    .resize({
      width: isFavicon ? 512 : 1600,
      height: isFavicon ? 512 : undefined,
      fit: 'inside',
      withoutEnlargement: true
    })

  try {
    if (isFavicon) {
      return await transformer
        .png({ compressionLevel: 9, quality: 85 })
        .toBuffer()
    }

    return await transformer
      .webp({ quality: 80, effort: 4 })
      .toBuffer()
  } catch {
    throw createError({ statusCode: 400, statusMessage: '图片处理失败，请换一张图片重试' })
  }
}
