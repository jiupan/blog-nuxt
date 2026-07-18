import { ok } from '~~/server/utils/response'
import { prisma } from '~~/server/utils/prisma'
import type { SessionUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const sessionUser = session.user as SessionUser | undefined

  if (!sessionUser?.id) {
    return ok({ user: null })
  }

  const user = await prisma.user.findFirst({
    where: { id: sessionUser.id, status: 'ACTIVE' },
    select: { id: true, username: true, email: true, role: true }
  })

  return ok({ user })
})
