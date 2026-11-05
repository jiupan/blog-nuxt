import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import type { CommentStatusPayload } from '../../types/dto/comment'
import type { ImportIssue, ImportIssueKind, PlanResult, PlannedComment, PostPlan } from './comment-plan'

export type ApplyOptions = {
  /** 写入 legacySource。默认 twikoo。 */
  source: string
}

export type ApplyResult = {
  inserted: number
  skipped: number
  mismatched: number
  /** 依赖没建起来、没能写入的记录。 */
  unresolved: number
  issues: ImportIssue[]
}

/**
 * 把计划写进数据库。
 *
 * 按文章分批事务写入，顺序固定为主评论在前、回复在后。
 * legacySource 与 legacyId 组成联合唯一键，重跑不会重复插入；
 * 已经存在且内容一致的跳过，内容不一致的只报告不覆盖 ——
 * 后台可能已经审核过这条记录，静默覆盖会把审核结果冲掉。
 */
export async function applyPlan(
  prisma: PrismaClient,
  plan: PlanResult,
  options: ApplyOptions
): Promise<ApplyResult> {
  const result: ApplyResult = {
    inserted: 0,
    skipped: 0,
    mismatched: 0,
    unresolved: 0,
    issues: []
  }

  for (const post of plan.posts) {
    // 一篇文章一个事务。事务内计数先记在局部变量上，提交成功后再合并，
    // 中途回滚不会把没写进去的记录算成已导入。
    const local = await prisma.$transaction(
      async (tx) => applyPost(tx, post, options),
      // Prisma 交互式事务默认 5 秒超时，导入一篇文章很容易超过。
      { timeout: 300_000, maxWait: 60_000 }
    )

    result.inserted += local.inserted
    result.skipped += local.skipped
    result.mismatched += local.mismatched
    result.unresolved += local.unresolved
    result.issues.push(...local.issues)
  }

  return result
}

async function applyPost(
  tx: Prisma.TransactionClient,
  post: PostPlan,
  options: ApplyOptions
): Promise<ApplyResult> {
  const result: ApplyResult = {
    inserted: 0,
    skipped: 0,
    mismatched: 0,
    unresolved: 0,
    issues: []
  }

  const idMap = new Map<string, number>()
  const pending = [...post.items]

  // 同一条回复的被回复对象可能也是同层的回复，所以用定点迭代而不是一次顺序遍历：
  // 依赖满足的先写，不满足的留到下一轮。
  let progressed = true
  while (pending.length > 0 && progressed) {
    progressed = false

    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const item = pending[index]

      if (item.threadRootSourceId) {
        const threadRootId = idMap.get(item.threadRootSourceId)
        const replyToId = item.replyToSourceId ? idMap.get(item.replyToSourceId) : undefined
        if (!threadRootId || !replyToId) continue
      }

      const existing = await tx.comment.findUnique({
        where: {
          legacySource_legacyId: {
            legacySource: options.source,
            legacyId: item.sourceId
          }
        },
        include: {
          threadRoot: { select: { legacyId: true } },
          replyTo: { select: { legacyId: true } }
        }
      })

      if (existing) {
        idMap.set(item.sourceId, existing.id)

        const differences = compareExisting(existing, item)
        if (differences.length === 0) {
          result.skipped += 1
        } else {
          result.mismatched += 1
          result.issues.push({
            kind: 'CONTENT_MISMATCH' satisfies ImportIssueKind,
            blocking: false,
            sourceId: item.sourceId,
            postId: item.postId,
            postSlug: item.postSlug,
            detail: `已导入记录与来源不一致：${differences.join('、')}`
          })
        }

        pending.splice(index, 1)
        progressed = true
        continue
      }

      const created = await tx.comment.create({
        data: {
          postId: item.postId,
          threadRootId: item.threadRootSourceId
            ? (idMap.get(item.threadRootSourceId) ?? null)
            : null,
          replyToId: item.replyToSourceId
            ? (idMap.get(item.replyToSourceId) ?? null)
            : null,
          // 旧评论不关联任何现有账户，也不发访客凭证。
          authorKind: 'LEGACY',
          authorUserId: null,
          guestTokenHash: null,
          authorName: item.nickname,
          body: item.body,
          bodyFormat: 'LEGACY_HTML',
          status: item.status,
          legacySource: options.source,
          legacyId: item.sourceId,
          requestId: null,
          requestFingerprint: null,
          legacyLikeCount: item.likeCount,
          createdAt: item.createdAt,
          deletedAt: item.status === 'DELETED' ? item.createdAt : null
        }
      })

      idMap.set(item.sourceId, created.id)
      result.inserted += 1
      pending.splice(index, 1)
      progressed = true
    }
  }

  // 剩下的记录依赖始终凑不齐：父评论缺失或成环。
  for (const item of pending) {
    result.unresolved += 1
    result.issues.push({
      kind: 'MISSING_PARENT',
      blocking: true,
      sourceId: item.sourceId,
      postId: item.postId,
      postSlug: item.postSlug,
      detail: '依赖的父评论或回复对象没能写入'
    })
  }

  return result
}

/**
 * 比对已导入记录与来源记录。
 *
 * 只返回不一致的字段名，不返回正文内容。正文用摘要表示，
 * 这样报告能指出差异在哪，又不会把评论正文抄进报告文件。
 */
function compareExisting(
  existing: {
    postId: number
    body: string
    authorName: string
    status: CommentStatusPayload
    createdAt: Date
    legacyLikeCount: number | null
    threadRoot: { legacyId: string | null } | null
    replyTo: { legacyId: string | null } | null
  },
  item: PlannedComment
): string[] {
  const differences: string[] = []

  if (existing.postId !== item.postId) differences.push('postId')
  if (existing.body !== item.body) {
    differences.push(`body(${shortHash(item.body)}≠${shortHash(existing.body)})`)
  }
  if (existing.authorName !== item.nickname) differences.push('authorName')
  if (existing.status !== item.status) differences.push('status')
  if (existing.createdAt.getTime() !== item.createdAt.getTime()) differences.push('createdAt')
  if ((existing.legacyLikeCount ?? null) !== (item.likeCount ?? null)) differences.push('legacyLikeCount')
  if ((existing.threadRoot?.legacyId ?? null) !== (item.threadRootSourceId ?? null)) {
    differences.push('threadRoot')
  }
  if ((existing.replyTo?.legacyId ?? null) !== (item.replyToSourceId ?? null)) {
    differences.push('replyTo')
  }

  return differences
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}
