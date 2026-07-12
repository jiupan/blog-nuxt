import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { badRequest } from '~~/server/utils/api-error'
import { deleteMemeGroup } from '~~/server/services/media/gallery.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  if (typeof body?.id !== 'string') throw badRequest('表情包分组不合法')
  return ok(await deleteMemeGroup(body.id))
})
