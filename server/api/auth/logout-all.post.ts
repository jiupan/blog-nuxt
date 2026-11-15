import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { revokeUserSessions } from '~~/server/services/security/account-session.service'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  await revokeUserSessions(user.id)
  await clearUserSession(event)
  return ok(true)
})
