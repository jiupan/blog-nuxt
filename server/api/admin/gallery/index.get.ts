import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { listGalleryImages } from '~~/server/services/media/gallery.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await listGalleryImages())
})
