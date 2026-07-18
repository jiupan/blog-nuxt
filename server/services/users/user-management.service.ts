import argon2 from 'argon2'
import { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { conflict, notFound } from '../../utils/api-error'
import type { CreateAdminUserInput } from './user.schema'
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

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) {
        throw error
      }
    }
  }
  throw new Error('Serializable transaction retry exhausted')
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
  const passwordHash = await argon2.hash(input.data.password, { type: argon2.argon2id })

  try {
    return await prisma.$transaction(async (tx) => {
      const duplicate = await tx.user.findFirst({
        where: { OR: [{ username: input.data.username }, { email }] },
        select: { username: true, email: true }
      })

      if (duplicate?.username === input.data.username) throw conflict('用户名已被使用')
      if (duplicate?.email === email) throw conflict('邮箱已被使用')

      const user = await tx.user.create({
        data: {
          username: input.data.username,
          email,
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
        after: { username: user.username, email: user.email, role: user.role, status: user.status },
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
    const target = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true } })
    if (!target) throw notFound('用户不存在')

    const user = await tx.user.update({
      where: { id: target.id },
      data: { passwordHash },
      select: managedUserSelect
    })

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
