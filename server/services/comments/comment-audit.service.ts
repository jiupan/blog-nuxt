import type { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { getTrustedClientIp, hashRateKey } from '../../utils/client-ip'

export const COMMENT_AUDIT_ACTIONS = {
  approve: 'COMMENT_APPROVE',
  hide: 'COMMENT_HIDE',
  restore: 'COMMENT_RESTORE',
  delete: 'COMMENT_DELETE'
} as const

export type CommentAuditContext = {
  /** IP 的 HMAC 摘要。原始 IP 不进审计表。 */
  ip: string | null
  userAgent: string | null
}

export function getCommentAuditContext(event: H3Event, secret: string): CommentAuditContext {
  const ip = getTrustedClientIp(event)
  return {
    ip: ip ? hashRateKey(secret, 'ip', ip) : null,
    userAgent: getHeader(event, 'user-agent') || null
  }
}

/**
 * 写审核审计。
 *
 * 只记 commentId、postId、动作和状态差异。
 * 正文、访客凭证摘要、原始邮箱一律不进审计表 —— 审计记录要比目标活得久，
 * 不该跟着隐私数据一起扩散。
 */
export async function createCommentAuditLog(
  tx: Prisma.TransactionClient,
  input: {
    operatorId: number
    commentId: number
    postId: number
    action: string
    before?: Prisma.InputJsonValue
    after?: Prisma.InputJsonValue
    context: CommentAuditContext
  }
) {
  return tx.adminAuditLog.create({
    data: {
      operatorId: input.operatorId,
      commentId: input.commentId,
      postId: input.postId,
      action: input.action,
      before: input.before,
      after: input.after,
      ip: input.context.ip,
      userAgent: input.context.userAgent
    }
  })
}
