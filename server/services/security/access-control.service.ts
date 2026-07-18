import type { H3Event } from 'h3'
import { forbidden, unauthorized } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { authPolicy } from './security-policy'

export type SessionUser = {
  id?: number
  username?: string
  email?: string | null
  role?: string
}

export async function requireUser(event: H3Event) {
  const session = await requireUserSession(event)
  const sessionUser = session.user as SessionUser | undefined

  if (!sessionUser?.id) {
    throw unauthorized()
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, username: true, email: true, role: true, status: true }
  })

  if (!user) {
    throw unauthorized()
  }

  if (user.status !== 'ACTIVE') {
    throw forbidden('账号已被禁用')
  }

  return user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event)

  if (user.role !== authPolicy.adminRole) {
    throw forbidden()
  }

  return user
}
