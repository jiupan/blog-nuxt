import type { H3Event } from 'h3'
import { forbidden, unauthorized } from '../../utils/api-error'
import { authPolicy } from './security-policy'

export type SessionUser = {
  id?: number
  username?: string
  email?: string | null
  role?: string
}

export async function requireUser(event: H3Event) {
  const session = await requireUserSession(event)
  const user = session.user as SessionUser | undefined

  if (!user?.id) {
    throw unauthorized()
  }

  return session.user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event) as SessionUser

  if (user.role !== authPolicy.adminRole) {
    throw forbidden()
  }

  return user
}
