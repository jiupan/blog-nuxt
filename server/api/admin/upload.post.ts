import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
])

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const files = await readMultipartFormData(event)
  const file = files?.find((item) => item.name === 'file')

  if (!file?.data || !file.type || !allowedTypes.has(file.type)) {
    throw createError({ statusCode: 400, statusMessage: '只支持 jpg/png/webp/gif 图片' })
  }

  if (file.data.byteLength > 5 * 1024 * 1024) {
    throw createError({ statusCode: 400, statusMessage: '图片不能超过 5MB' })
  }

  const config = useRuntimeConfig()
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const extension = allowedTypes.get(file.type) || extname(file.filename || '') || '.bin'
  const filename = `${randomUUID()}${extension}`
  const dir = join(config.uploadDir, year, month)

  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), file.data)

  return ok({
    url: `/uploads/${year}/${month}/${filename}`
  })
})
