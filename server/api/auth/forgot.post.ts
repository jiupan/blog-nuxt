import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { parseRequest } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { limitAccountMail, requireAccountMail, sendAccountEmail } from '~~/server/services/users/account-email.service'
import { userEmailSchema } from '~~/server/services/users/user.schema'

export default defineEventHandler(async (event) => {
  requireAccountMail(event)
  limitAccountMail(event, 'forgot-password')
  const { email } = parseRequest(z.object({ email: userEmailSchema }), await readBody(event))
  // Lookup and delivery both happen outside the response path.
  event.waitUntil((async () => {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), emailVerifiedAt: { not: null }, status: 'ACTIVE' },
      select: { id: true, email: true }
    })
    if (user?.email) {
      limitAccountMail(event, 'send-recovery', user.id)
      await sendAccountEmail(event, user.id, user.email, 'RESET')
    }
  })().catch(() => {}))
  return ok(true)
})
