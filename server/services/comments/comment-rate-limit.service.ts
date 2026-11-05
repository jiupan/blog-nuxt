import { Prisma, type CommentRateScope, type CommentRateWindow } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '../../utils/prisma'
import { hashRateKey } from '../../utils/client-ip'

/**
 * 起步限额。
 *
 * 账号 5 条/分钟、30 条/小时；访客凭证 3 条/10 分钟、10 条/小时。
 * IP 是软限制，给得比身份配额宽，避免同一出口 NAT 下的正常访客被误伤，
 * 它的作用是挡住没有凭证的批量刷量。
 */
export const COMMENT_RATE_LIMITS = {
  ACCOUNT: { MINUTE: 5, HOUR: 30 },
  GUEST: { TEN_MINUTES: 3, HOUR: 10 },
  IP: { MINUTE: 30, HOUR: 120 }
} as const

export type CommentQuotaInput = {
  /** 提交时选择的身份。访客身份同样可以带一个已登录账户的配额。 */
  identityKind: 'ACCOUNT' | 'GUEST'
  /** 配额归属的账户。账号身份是本人，访客身份下是登录着的账户，都没有则为空。 */
  quotaUserId: number | null
  guestTokenHash: string | null
  clientIp: string | null
  secret: string
}

export type CommentQuotaResult = {
  allowed: boolean
  scope: CommentRateScope | null
  limit: number
  retryAfterSeconds: number
}

type RateBucket = {
  scope: CommentRateScope
  windowKind: CommentRateWindow
  limit: number
  keyHash: string
}

/**
 * 扣减配额。
 *
 * 计数在数据库里用 ON CONFLICT 条件更新累加并封顶，重启和多副本都绕不过去。
 * 超限时返回 allowed=false 而不是抛错 —— 事务照常提交，超限请求一样消耗配额；
 * 调用方在事务外再抛 429。
 */
export async function consumeCommentQuota(
  tx: Prisma.TransactionClient,
  input: CommentQuotaInput,
  now = new Date()
): Promise<CommentQuotaResult> {
  for (const bucket of buildBuckets(input)) {
    const count = await incrementBucket(tx, bucket, now)
    if (count > bucket.limit) {
      return {
        allowed: false,
        scope: bucket.scope,
        limit: bucket.limit,
        retryAfterSeconds: secondsUntilReset(bucket, now)
      }
    }
  }

  return { allowed: true, scope: null, limit: 0, retryAfterSeconds: 0 }
}

/**
 * 限流桶的密钥来源。
 *
 * 优先用独立的 NUXT_COMMENT_RATE_SECRET；没配就退回 session 密码 ——
 * 它同样是只在服务端存在的密钥，不曾暴露给浏览器。
 */
export function resolveCommentSecret(event: H3Event): string {
  const config = useRuntimeConfig(event)
  return String(config.commentRateSecret || config.session.password || '')
}

/**
 * 清理过期桶。
 * 按 expiresAt 排序批量删除，避免表无限增长。
 */
export async function pruneExpiredCommentRateBuckets(limit = 500) {
  return prisma.$executeRaw(Prisma.sql`
    DELETE FROM "CommentRateBucket" WHERE "id" IN (
      SELECT "id" FROM "CommentRateBucket"
      WHERE "expiresAt" < NOW()
      ORDER BY "expiresAt"
      LIMIT ${limit}
    )
  `)
}

async function incrementBucket(
  tx: Prisma.TransactionClient,
  bucket: RateBucket,
  now: Date
): Promise<number> {
  const windowStart = windowStartFor(bucket.windowKind, now)
  const expiresAt = new Date(
    windowStart.getTime() + windowDurationMs(bucket.windowKind) + 60_000
  )
  const scope = Prisma.sql`${bucket.scope}::"CommentRateScope"`
  const windowKind = Prisma.sql`${bucket.windowKind}::"CommentRateWindow"`

  const rows = await tx.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    INSERT INTO "CommentRateBucket"
      ("scope", "keyHash", "windowStart", "windowKind", "count", "expiresAt", "createdAt", "updatedAt")
    VALUES
      (${scope}, ${bucket.keyHash}, ${windowStart}::timestamp, ${windowKind}, 1, ${expiresAt}::timestamp, NOW(), NOW())
    ON CONFLICT ("scope", "keyHash", "windowStart", "windowKind")
    DO UPDATE SET
      "count" = LEAST("CommentRateBucket"."count" + 1, ${bucket.limit + 1}::int),
      "updatedAt" = NOW()
    RETURNING "count"
  `)

  return rows[0]?.count ?? 1
}

/**
 * 需要扣减的桶。
 *
 * 账号身份扣账号配额；访客身份扣访客配额，若此时有登录账户，
 * 账户配额也一起扣 —— 否则换个身份就能绕过按账户计的限额。
 * IP 桶始终扣。
 */
function buildBuckets(input: CommentQuotaInput): RateBucket[] {
  const buckets: RateBucket[] = []

  if (input.quotaUserId !== null) {
    buckets.push(
      ...bucketSet('ACCOUNT', String(input.quotaUserId), input.secret, COMMENT_RATE_LIMITS.ACCOUNT)
    )
  }

  if (input.identityKind === 'GUEST' && input.guestTokenHash) {
    buckets.push(
      ...bucketSet('GUEST', input.guestTokenHash, input.secret, COMMENT_RATE_LIMITS.GUEST)
    )
  }

  if (input.clientIp) {
    buckets.push(...bucketSet('IP', input.clientIp, input.secret, COMMENT_RATE_LIMITS.IP))
  }

  return buckets
}

function bucketSet(
  scope: CommentRateScope,
  value: string,
  secret: string,
  limits: Record<string, number>
): RateBucket[] {
  const keyHash = hashRateKey(secret, scope.toLowerCase(), value)

  return Object.entries(limits).map(([windowKind, limit]) => ({
    scope,
    windowKind: windowKind as CommentRateWindow,
    limit,
    keyHash
  }))
}

/** 固定窗口的起点。UTC 对齐，重启与换副本都不会算出不同的窗口。 */
function windowStartFor(kind: CommentRateWindow, now: Date): Date {
  const start = new Date(now.getTime())

  if (kind === 'MINUTE') {
    start.setUTCSeconds(0, 0)
  } else if (kind === 'TEN_MINUTES') {
    start.setUTCSeconds(0, 0)
    start.setUTCMinutes(Math.floor(start.getUTCMinutes() / 10) * 10)
  } else {
    start.setUTCMinutes(0, 0, 0)
  }

  return start
}

function windowDurationMs(kind: CommentRateWindow): number {
  if (kind === 'MINUTE') return 60_000
  if (kind === 'TEN_MINUTES') return 600_000
  return 3_600_000
}

function secondsUntilReset(bucket: RateBucket, now: Date): number {
  const windowStart = windowStartFor(bucket.windowKind, now)
  const resetAt = windowStart.getTime() + windowDurationMs(bucket.windowKind)
  return Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000))
}
