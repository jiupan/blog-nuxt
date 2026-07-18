import type { H3Event } from 'h3'
import type { Prisma } from '@prisma/client'
import { getClientIp } from '../security/rate-limit.service'

export const USER_AUDIT_ACTIONS = {
  created: 'USER_CREATED',
  roleChanged: 'USER_ROLE_CHANGED',
  statusChanged: 'USER_STATUS_CHANGED',
  passwordReset: 'USER_PASSWORD_RESET'
} as const

export type UserAuditContext = {
  ip: string | null
  userAgent: string | null
}

export function getUserAuditContext(event: H3Event): UserAuditContext {
  return {
    ip: getClientIp(event) || null,
    userAgent: getHeader(event, 'user-agent') || null
  }
}

export async function createUserAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    operatorId: number
    targetUserId: number
    action: string
    before?: Prisma.InputJsonValue
    after?: Prisma.InputJsonValue
    context: UserAuditContext
  }
) {
  return tx.adminAuditLog.create({
    data: {
      operatorId: input.operatorId,
      targetUserId: input.targetUserId,
      action: input.action,
      before: input.before,
      after: input.after,
      ip: input.context.ip,
      userAgent: input.context.userAgent
    }
  })
}
