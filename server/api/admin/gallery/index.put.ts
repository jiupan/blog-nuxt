import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { parseRequest } from '~~/server/utils/api-error'
import { updateGalleryImages } from '~~/server/services/media/gallery.service'
import { ok } from '~~/server/utils/response'

const schema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(200),
  changes: z.object({ inRandomPool: z.boolean().optional(), randomEnabled: z.boolean().optional(), memeGroup: z.string().nullable().optional() }).strict()
}).strict()
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const body = parseRequest(schema, await readBody(event))
  await updateGalleryImages(body.paths, body.changes)
  return ok(null, '图库已更新')
})
