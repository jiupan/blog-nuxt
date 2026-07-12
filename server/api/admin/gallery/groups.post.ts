import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { badRequest } from '~~/server/utils/api-error'
import { createMemeGroup } from '~~/server/services/media/gallery.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  if (typeof body?.name !== 'string') throw badRequest('请输入分组名称')
  return ok(await createMemeGroup(body.name))
})
