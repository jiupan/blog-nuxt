import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { badRequest } from '~~/server/utils/api-error'
import { deleteGalleryImage } from '~~/server/services/media/gallery.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<{ path?: string }>(event)
  const requestedPath = body.path?.trim()
  if (!requestedPath) {
    throw badRequest('缺少图片路径')
  }

  return ok(await deleteGalleryImage(requestedPath))
})
