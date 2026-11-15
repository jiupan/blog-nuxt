import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { parseRequest } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { userIdSchema } from '~~/server/services/users/user.schema'
import { getAdminUserAudit } from '~~/server/services/users/user-query.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = parseRequest(userIdSchema, getRouterParam(event, 'id'))
  const { cursor } = parseRequest(z.object({ cursor: userIdSchema.optional() }), getQuery(event))
  return ok(await getAdminUserAudit(id, cursor))
})
