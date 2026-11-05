import { createHash } from 'node:crypto'
import { Prisma, type Comment } from '@prisma/client'
import type { H3Event } from 'h3'
import { setResponseHeader } from 'h3'
import { commentClosed, conflict, notFound, rateLimited } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { getTrustedClientIp } from '../../utils/client-ip'
import { assertSameOrigin } from '../../utils/origin'
import { buildPublishedPostWhere } from '../posts/post-visibility'
import {
  getGuestTokenHash,
  resolveCommentIdentity,
  resolveCommentViewer
} from './comment-identity.service'
import {
  lockCommentPost,
  lockCommentTarget,
  lockCommentThreadRoot
} from './comment-lock.service'
import { canDeleteComment } from './comment-query.service'
import { consumeCommentQuota, resolveCommentSecret } from './comment-rate-limit.service'
import type { CreateCommentInput } from './comment.schema'

export type CreateCommentOutcome = {
  comment: Comment
  replayed: boolean
}

type TransactionOutcome =
  | { kind: 'created', comment: Comment }
  | { kind: 'replayed', comment: Comment }
  | { kind: 'blocked', retryAfterSeconds: number }

/**
 * 提交评论。
 *
 * 写入顺序按技术方案执行：
 * 1. 来源校验、会话与字段校验 —— 客户端提供的账号名、角色、作者 id 都不作数。
 * 2. 先查幂等：同一身份同一 requestId 且载荷一致就返回原结果，载荷不同返回 409。
 * 3. 事务里重新检查文章可见性，扣减限流配额并插入。
 * 4. 由服务端根据 replyToId 推导线程根，客户端不能直接指定。
 */
export async function createComment(
  event: H3Event,
  postId: number,
  input: CreateCommentInput
): Promise<CreateCommentOutcome> {
  assertSameOrigin(event)

  const identity = await resolveCommentIdentity(event, {
    identityMode: input.identityMode,
    // 账号身份不接受客户端提供的昵称，判别联合里这一支根本没有这个字段。
    displayName: 'displayName' in input ? input.displayName : undefined
  })

  const fingerprint = hashCommentPayload({
    body: input.body,
    replyToId: input.replyToId ?? null,
    identityMode: identity.kind,
    authorUserId: identity.authorUserId,
    guestTokenHash: identity.guestTokenHash,
    displayName: identity.displayName
  })

  const unique = { postId_requestId: { postId, requestId: input.requestId } }

  // 幂等检查放在事务之前：重放不应该再消耗一次配额。
  const previous = await prisma.comment.findUnique({ where: unique })
  if (previous) {
    if (previous.requestFingerprint !== fingerprint) {
      throw conflict('请求编号已用于其他内容，请生成新的编号')
    }
    return { comment: previous, replayed: true }
  }

  const secret = resolveCommentSecret(event)
  const clientIp = getTrustedClientIp(event)

  let outcome: TransactionOutcome | undefined
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      outcome = await prisma.$transaction(
        async (tx) => {
          // 文章可能在提交前被撤稿或改成定时发布，事务里重新确认一次。
          const post = await tx.post.findFirst({
            where: buildPublishedPostWhere({ id: postId }),
            select: { id: true }
          })
          if (!post) throw notFound('文章不存在')

          const replay = await tx.comment.findUnique({ where: unique })
          if (replay) {
            if (replay.requestFingerprint !== fingerprint) {
              throw conflict('请求编号已用于其他内容，请生成新的编号')
            }
            return { kind: 'replayed', comment: replay }
          }

          // 回复对象按 文章 → 线程根 → 目标 的顺序加锁，与审核动作同一顺序。
          // 锁之后再判断目标是否还能回复，避免审核与回复交叉出错误可见性。
          const target = input.replyToId === undefined
            ? null
            : await lockAndResolveReplyTarget(tx, postId, input.replyToId)

          const threadRootId = target ? (target.threadRootId ?? target.id) : null
          const replyToId = target ? target.id : null

          // 限流扣减与创建在同一事务里。
          const quota = await consumeCommentQuota(tx, {
            identityKind: identity.kind,
            quotaUserId: identity.quotaUserId,
            guestTokenHash: identity.guestTokenHash,
            clientIp,
            secret
          })
          if (!quota.allowed) {
            // 不在这里抛错：抛错会回滚事务，超限请求就永远不消耗配额。
            return { kind: 'blocked', retryAfterSeconds: quota.retryAfterSeconds }
          }

          const comment = await tx.comment.create({
            data: {
              postId,
              threadRootId,
              replyToId,
              authorKind: identity.kind,
              authorUserId: identity.authorUserId,
              guestTokenHash: identity.guestTokenHash,
              authorName: identity.displayName,
              body: input.body,
              bodyFormat: 'MARKDOWN',
              // 访客一律进待审；账号评论通过校验和限流后直接可见。
              status: identity.kind === 'GUEST' ? 'PENDING' : 'VISIBLE',
              requestId: input.requestId,
              requestFingerprint: fingerprint
            }
          })

          return { kind: 'created', comment }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      break
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code)
      ) {
        if (attempt < 2) continue
        throw conflict('同一请求正在处理中，请稍后使用相同 requestId 和内容重试')
      }
      throw error
    }
  }

  if (!outcome) throw conflict('请求尚未完成，请稍后重试')

  if (outcome.kind === 'blocked') {
    setResponseHeader(event, 'Retry-After', outcome.retryAfterSeconds)
    throw rateLimited('评论太频繁，请稍后再试', { retryAfter: outcome.retryAfterSeconds })
  }

  return {
    comment: outcome.comment,
    replayed: outcome.kind === 'replayed'
  }
}

/**
 * 作者自助删除。
 *
 * 软删除并清空正文。重复删除返回成功 —— 删除是幂等的。
 * 非本人一律 404，不区分「不存在」和「不属于你」。
 */
export async function deleteOwnComment(
  event: H3Event,
  postId: number,
  commentId: number
) {
  assertSameOrigin(event)

  const viewer = await resolveCommentViewer(event)
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, postId },
    select: {
      id: true,
      status: true,
      authorUserId: true,
      guestTokenHash: true
    }
  })

  if (!comment) throw notFound('评论不存在')
  if (!canDeleteComment(comment, viewer)) throw notFound('评论不存在')

  if (comment.status === 'DELETED') {
    return { id: comment.id, alreadyDeleted: true }
  }

  await prisma.comment.update({
    where: { id: comment.id },
    data: { status: 'DELETED', body: '', deletedAt: new Date() }
  })

  return { id: comment.id, alreadyDeleted: false }
}

/**
 * 解析回复对象。
 *
 * 只接受同一篇文章里公开可见的评论。待审与隐藏的评论对公众不存在，返回 404；
 * 已删除的评论留了占位，返回 409 说明这条讨论不再接受回复。
 *
 * 锁顺序固定为 文章 → 线程根 → 回复目标。目标与线程根的状态在拿到锁之后重读，
 * 所以审核刚好把线程隐藏掉时，这次回复会拿到 404 而不是写进一条看不见的讨论。
 */
async function lockAndResolveReplyTarget(
  tx: Prisma.TransactionClient,
  postId: number,
  replyToId: number
) {
  const peek = await tx.comment.findFirst({
    where: { id: replyToId, postId },
    select: { id: true, threadRootId: true }
  })
  if (!peek) throw notFound('评论不存在')

  await lockCommentPost(tx, postId)
  if (peek.threadRootId) await lockCommentThreadRoot(tx, peek.threadRootId)
  await lockCommentTarget(tx, peek.id)

  const target = await tx.comment.findFirst({
    where: { id: peek.id, postId },
    select: {
      id: true,
      threadRootId: true,
      status: true,
      threadRoot: { select: { id: true, status: true } }
    }
  })
  if (!target) throw notFound('评论不存在')

  // 线程根不公开时，整条讨论都不公开。
  const rootStatus = target.threadRoot ? target.threadRoot.status : target.status
  if (rootStatus === 'PENDING' || rootStatus === 'HIDDEN') throw notFound('评论不存在')

  if (target.status === 'PENDING' || target.status === 'HIDDEN') throw notFound('评论不存在')
  if (target.status === 'DELETED') throw commentClosed('该评论已删除，不能再回复')

  return target
}

/**
 * 请求快照摘要。
 *
 * 覆盖正文、回复对象、身份与访客昵称 —— 其中任何一项变化都算新的快照，
 * 用同一个 requestId 提交会判成冲突。超时重试复用原 ID 时内容不变，摘要也就不变。
 */
export function hashCommentPayload(input: {
  body: string
  replyToId: number | null
  identityMode: string
  authorUserId: number | null
  guestTokenHash: string | null
  displayName: string
}) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        input.body,
        input.replyToId,
        input.identityMode,
        input.authorUserId,
        input.guestTokenHash,
        input.displayName
      ])
    )
    .digest('hex')
}

/** 访客凭证摘要，删除时用来确认归属。 */
export function currentGuestTokenHash(event: H3Event): string | null {
  return getGuestTokenHash(event)
}
