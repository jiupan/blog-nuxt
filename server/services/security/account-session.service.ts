import type { Prisma, User } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '../../utils/prisma'
import { unauthorized } from '../../utils/api-error'
import { publicProfile, publicProfileSelect } from '../users/public-profile'

const accountSelect = {
  id: true, username: true, email: true, pendingEmail: true, emailVerifiedAt: true,
  role: true, status: true, ...publicProfileSelect
} satisfies Prisma.UserSelect

export type AccountCookie = { user?: { id?: number }, secure?: { accountSessionId?: string } }

export function publicAccount(user: Pick<User, 'id' | 'username' | 'email' | 'pendingEmail' | 'emailVerifiedAt' | 'role' | 'displayName'> & { avatar?: { id: string } | null }) {
  const { id, username, email, pendingEmail, emailVerifiedAt, role } = user
  return { id, username, email, pendingEmail, emailVerifiedAt, role, ...publicProfile(user) }
}

export async function readAccountSession(event: H3Event, session?: AccountCookie) {
  const current = session ?? await getUserSession(event) as AccountCookie
  if (!current.user?.id || !current.secure?.accountSessionId) return null
  const record = await prisma.accountSession.findUnique({
    where: { id: current.secure.accountSessionId },
    select: { expiresAt: true, user: { select: accountSelect } }
  })
  if (!record || record.user.id !== current.user.id || record.expiresAt <= new Date()) return null
  return record.user
}

export async function startAccountSession(event: H3Event, user: Pick<User, 'id' | 'username' | 'role' | 'passwordHash'>) {
  const previous = await getUserSession(event) as AccountCookie
  const maxAge = useRuntimeConfig(event).session.maxAge ?? 60 * 60 * 24 * 7
  const record = await prisma.$transaction(async tx => {
    const updated = await tx.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash, status: 'ACTIVE', role: user.role },
      data: { lastLoginAt: new Date() }
    })
    if (updated.count !== 1) throw unauthorized('账号状态已变化，请重新登录')
    if (previous.secure?.accountSessionId) await revokeAccountSession(previous.secure.accountSessionId, tx)
    await tx.accountSession.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } })
    return tx.accountSession.create({ data: { userId: user.id, expiresAt: new Date(Date.now() + maxAge * 1000) } })
  })
  await replaceUserSession(event, {
    user: { id: user.id, username: user.username, role: user.role },
    secure: { accountSessionId: record.id }
  })
}

export function revokeAccountSession(id: string, tx: Prisma.TransactionClient = prisma) {
  return tx.accountSession.deleteMany({ where: { id } })
}

export function revokeUserSessions(userId: number, tx: Prisma.TransactionClient = prisma) {
  return tx.accountSession.deleteMany({ where: { userId } })
}
