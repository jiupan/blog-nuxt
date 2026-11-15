import type { H3Event } from 'h3'
import { forbidden, unauthorized } from '../../utils/api-error'
import { authPolicy } from './security-policy'
import { readAccountSession } from './account-session.service'

export type SessionUser = {
  id?: number
  username?: string
  email?: string | null
  role?: string
}

export async function requireUser(event: H3Event) {
  const user = await readAccountSession(event)
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
