import { ok } from '~~/server/utils/response'
import { publicAccount, readAccountSession } from '~~/server/services/security/account-session.service'
import { accountMailAvailable } from '~~/server/services/users/account-email.service'

export default defineEventHandler(async (event) => {
  const user = await readAccountSession(event)
  return ok({ user: user?.status === 'ACTIVE' ? publicAccount(user) : null, emailAvailable: accountMailAvailable(event) })
})
