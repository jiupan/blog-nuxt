import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { parseRequest } from '~~/server/utils/api-error'
import { getGalleryImageUsage } from '~~/server/services/media/gallery.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  const { path } = parseRequest(z.object({ path: z.string().min(1) }), getQuery(event))
  return ok(await getGalleryImageUsage(path))
})
