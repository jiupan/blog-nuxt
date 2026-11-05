import { Prisma, type CommentStatus } from '@prisma/client'
import type { H3Event } from 'h3'
import { conflict, notFound } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { requireAdmin } from '../security/access-control.service'
import {
  COMMENT_AUDIT_ACTIONS,
  createCommentAuditLog,
  getCommentAuditContext
} from './comment-audit.service'
import { lockCommentPost, lockCommentTarget, lockCommentThreadRoot } from './comment-lock.service'
import { resolveCommentSecret } from './comment-rate-limit.service'
import type { ModerateCommentInput } from './comment.schema'

/**
 * 审核动作表。
 *
 * from 列出允许执行该动作的来源状态：
 * PENDING 可批准或隐藏，VISIBLE 可隐藏，HIDDEN 可恢复为 VISIBLE，删除是终态。
 */
const ACTION_RULES = {
  approve: { target: 'VISIBLE' as CommentStatus, from: ['PENDING'] as CommentStatus[], audit: COMMENT_AUDIT_ACTIONS.approve },
  hide: { target: 'HIDDEN' as CommentStatus, from: ['PENDING', 'VISIBLE'] as CommentStatus[], audit: COMMENT_AUDIT_ACTIONS.hide },
  restore: { target: 'VISIBLE' as CommentStatus, from: ['HIDDEN'] as CommentStatus[], audit: COMMENT_AUDIT_ACTIONS.restore },
  delete: { target: 'DELETED' as CommentStatus, from: ['PENDING', 'VISIBLE', 'HIDDEN'] as CommentStatus[], audit: COMMENT_AUDIT_ACTIONS.delete }
}

export type ModerateCommentOutcome = {
  id: number
  status: CommentStatus
  unchanged: boolean
}

/**
 * 管理员审核。
 *
 * 判断顺序：
 * 1. 已经是目标状态 —— 直接返回成功，不写审计日志。重复提交同一次审核不产生额外记录。
 * 2. 当前状态与 expectedStatus 不一致 —— 并发审核，返回 409 让管理员刷新。
 * 3. 动作与当前状态不匹配 —— 返回 409。
 * 其余情况按文章 → 线程根 → 目标加锁，与回复写入同一顺序。
 */
export async function moderateComment(
  event: H3Event,
  commentId: number,
  input: ModerateCommentInput
): Promise<ModerateCommentOutcome> {
  const operator = await requireAdmin(event)
  const secret = resolveCommentSecret(event)
  const context = getCommentAuditContext(event, secret)
  const rule = ACTION_RULES[input.action]

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const peek = await tx.comment.findUnique({
            where: { id: commentId },
            select: { id: true, postId: true, threadRootId: true }
          })
          if (!peek) throw notFound('评论不存在')

          await lockCommentPost(tx, peek.postId)
          if (peek.threadRootId) await lockCommentThreadRoot(tx, peek.threadRootId)
          await lockCommentTarget(tx, peek.id)

          const comment = await tx.comment.findUnique({
            where: { id: commentId },
            select: { id: true, postId: true, status: true }
          })
          if (!comment) throw notFound('评论不存在')

          if (comment.status === rule.target) {
            return { id: comment.id, status: comment.status, unchanged: true }
          }

          if (comment.status !== input.expectedStatus) {
            throw conflict('评论状态已变化，请刷新后重试')
          }

          if (!rule.from.includes(comment.status)) {
            throw conflict('当前状态不允许该操作')
          }

          const updated = await tx.comment.update({
            where: { id: comment.id },
            data: {
              status: rule.target,
              ...(rule.target === 'DELETED' ? { body: '', deletedAt: new Date() } : {})
            }
          })

          await createCommentAuditLog(tx, {
            operatorId: operator.id,
            commentId: comment.id,
            postId: comment.postId,
            action: rule.audit,
            before: { status: comment.status },
            after: { status: rule.target },
            context
          })

          return { id: updated.id, status: updated.status, unchanged: false }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code)
      ) {
        if (attempt < 2) continue
        throw conflict('评论正在被其他管理员处理，请刷新后重试')
      }
      throw error
    }
  }

  throw conflict('评论正在被其他管理员处理，请刷新后重试')
}
