import argon2 from 'argon2'
import { randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { badRequest, conflict, notFound } from '../../utils/api-error'
import type { CreateAdminUserInput } from './user.schema'
import { revokeUserSessions } from '../security/account-session.service'
import { withSerializableRetry } from '../../utils/serializable'
import {
  createUserAuditLog,
  USER_AUDIT_ACTIONS,
  type UserAuditContext
} from './user-audit.service'

type UserRole = 'ADMIN' | 'USER'
type UserStatus = 'ACTIVE' | 'DISABLED'

const managedUserSelect = {
  id: true,
  username: true,
  email: true,
  pendingEmail: true,
  emailVerifiedAt: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect

type ManagementInput = {
  operatorId: number
  userId: number
  context: UserAuditContext
}

function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export async function createAdminUser(input: {
  operatorId: number
  data: CreateAdminUserInput
  context: UserAuditContext
}) {
  const email = input.data.email.toLowerCase()
  const password = input.data.invite ? randomBytes(32).toString('base64url') : input.data.password
  if (!password) throw badRequest('请设置初始密码')
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })

  try {
    return await prisma.$transaction(async (tx) => {
      const duplicate = await tx.user.findFirst({
        where: { OR: [{ username: input.data.username }, { email, emailVerifiedAt: { not: null } }] },
        select: { username: true, email: true }
      })

      if (duplicate?.username === input.data.username) throw conflict('用户名已被使用')
      if (duplicate?.email === email) throw conflict('邮箱已被使用')

      const user = await tx.user.create({
        data: {
          username: input.data.username,
          pendingEmail: email,
          passwordHash,
          role: input.data.role,
          status: input.data.status
        },
        select: managedUserSelect
      })

      await createUserAuditLog(tx, {
        operatorId: input.operatorId,
        targetUserId: user.id,
        action: USER_AUDIT_ACTIONS.created,
        after: { username: user.username, pendingEmail: email, role: user.role, status: user.status },
        context: input.context
      })

      return user
    })
  } catch (error) {
    if (isUniqueError(error)) throw conflict('用户名或邮箱已被使用')
    throw error
  }
}

export async function updateManagedUserRole(input: ManagementInput & { role: UserRole }) {
  return withSerializableRetry(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: input.userId }, select: managedUserSelect })
    if (!target) throw notFound('用户不存在')
    if (target.role === input.role) return target

    if (target.id === input.operatorId && input.role !== 'ADMIN') {
      throw conflict('不能降低自己的管理员角色')
    }

    if (target.role === 'ADMIN' && target.status === 'ACTIVE' && input.role !== 'ADMIN') {
      const activeAdminCount = await tx.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } })
      if (activeAdminCount <= 1) throw conflict('系统必须至少保留一个正常管理员')
    }

    const user = await tx.user.update({
      where: { id: target.id },
      data: { role: input.role },
      select: managedUserSelect
    })
    await revokeUserSessions(target.id, tx)
    await tx.accountEmailToken.deleteMany({ where: { userId: target.id } })

    await createUserAuditLog(tx, {
      operatorId: input.operatorId,
      targetUserId: target.id,
      action: USER_AUDIT_ACTIONS.roleChanged,
      before: { role: target.role },
      after: { role: user.role },
      context: input.context
    })
    return user
  })
}

export async function updateManagedUserStatus(input: ManagementInput & { status: UserStatus }) {
  return withSerializableRetry(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: input.userId }, select: managedUserSelect })
    if (!target) throw notFound('用户不存在')
    if (target.status === input.status) return target

    if (target.id === input.operatorId && input.status !== 'ACTIVE') {
      throw conflict('不能禁用自己的账号')
    }

    if (target.role === 'ADMIN' && target.status === 'ACTIVE' && input.status !== 'ACTIVE') {
      const activeAdminCount = await tx.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } })
      if (activeAdminCount <= 1) throw conflict('系统必须至少保留一个正常管理员')
    }

    const user = await tx.user.update({
      where: { id: target.id },
      data: { status: input.status },
      select: managedUserSelect
    })
    await revokeUserSessions(target.id, tx)
    await tx.accountEmailToken.deleteMany({ where: { userId: target.id } })

    await createUserAuditLog(tx, {
      operatorId: input.operatorId,
      targetUserId: target.id,
      action: USER_AUDIT_ACTIONS.statusChanged,
      before: { status: target.status },
      after: { status: user.status },
      context: input.context
    })
    return user
  })
}

export async function resetManagedUserPassword(input: ManagementInput & { password: string }) {
  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id })

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true, emailVerifiedAt: true } })
    if (!target) throw notFound('用户不存在')

    const user = await tx.user.update({
      where: { id: target.id },
      data: { passwordHash, ...(target.emailVerifiedAt ? { pendingEmail: null } : {}) },
      select: managedUserSelect
    })
    await revokeUserSessions(target.id, tx)
    await tx.accountEmailToken.deleteMany({ where: { userId: target.id } })

    await createUserAuditLog(tx, {
      operatorId: input.operatorId,
      targetUserId: target.id,
      action: USER_AUDIT_ACTIONS.passwordReset,
      after: { passwordReset: true },
      context: input.context
    })
    return user
  })
}
