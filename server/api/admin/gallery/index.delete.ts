import { unlink } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ path?: string }>(event)
  const requestedPath = body.path?.trim()
  if (!requestedPath) {
    throw createError({ statusCode: 400, statusMessage: '缺少图片路径' })
  }

  const config = useRuntimeConfig()
  const uploadRoot = resolve(config.uploadDir)
  const filepath = resolve(uploadRoot, ...requestedPath.split('/').filter(Boolean))
  const relativePath = relative(uploadRoot, filepath)

  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath === '' || isAbsolute(relativePath)) {
    throw createError({ statusCode: 400, statusMessage: '图片路径不合法' })
  }

  await unlink(filepath).catch(() => {
    throw createError({ statusCode: 404, statusMessage: '图片不存在或已删除' })
  })

  return ok({ path: relativePath.split(sep).join('/') })
})
