import { normalizePostSlug } from '../../server/utils/slug'
import type { CommentStatusPayload } from '../../types/dto/comment'
import type { ResolvedMapping } from './comment-mapping'
import type { LegacyRecord } from './comment-source'

export type PostRef = {
  id: number
  slug: string
  title: string
}

/** 按 slug 查文章。离线校准模式下返回 null。 */
export type PostLookup = {
  find(slug: string): Promise<PostRef | null>
}

export type ImportIssueKind =
  | 'UNTRUSTED_HOST'
  | 'UNRESOLVED_POST'
  | 'MISSING_SOURCE_ID'
  | 'INVALID_DATE'
  | 'EMPTY_BODY'
  | 'UNKNOWN_STATUS'
  | 'MISSING_PARENT'
  | 'CROSS_POST_PARENT'
  | 'PARENT_CYCLE'
  | 'NICKNAME_ADJUSTED'
  | 'CONTENT_MISMATCH'

export type ImportIssue = {
  kind: ImportIssueKind
  /** 阻断导入的问题必须记一条；非阻断的只是提示。 */
  blocking: boolean
  sourceId: string | null
  postId: number | null
  postSlug: string | null
  detail: string
}

export type PlannedComment = {
  sourceId: string
  postId: number
  postSlug: string
  /** 主评论为空。 */
  threadRootSourceId: string | null
  /** 被回复对象。主评论为空。 */
  replyToSourceId: string | null
  nickname: string
  body: string
  status: CommentStatusPayload
  /** 点赞数。字段缺失时留空，不补 0。 */
  likeCount: number | null
  createdAt: Date
  /** 0 是主评论。 */
  depth: number
  mediaConversionCount: number
}

export type PostPlan = {
  post: PostRef
  /** 归属到这篇文章的原始记录数。 */
  sourceRecords: number
  importable: number
  rootCount: number
  replyCount: number
  unassignable: number
  mediaConversions: number
  parentChildAnomalies: number
  statusDistribution: Record<CommentStatusPayload, number>
  items: PlannedComment[]
}

export type PlanResult = {
  posts: PostPlan[]
  issues: ImportIssue[]
  totals: {
    sourceRecords: number
    importable: number
    rootCount: number
    replyCount: number
    unassignable: number
    unresolvedPost: number
    mediaConversions: number
    parentChildAnomalies: number
    unknownStatus: number
    derivedSourceIds: number
    /** 时间或正文不合法、直接待处理的记录数。 */
    rejected: number
    statusDistribution: Record<CommentStatusPayload, number>
  }
}

const ANONYMOUS_NAME = '匿名'
const MAX_NAME_LENGTH = 24

/**
 * 两阶段映射的第二阶段：把归一化后的记录落到具体文章并接好父子关系。
 *
 * 先定归属，再定关系：归属用 URL 里的 slug 查文章，关系用来源 ID 互相引用，
 * 两边都对不上时记录留在报告里，不静默丢弃。
 */
export async function buildPlan(options: {
  records: LegacyRecord[]
  mapping: ResolvedMapping
  lookup: PostLookup
  /** 跳过 host 白名单检查。离线校准时用。 */
  allowAnyHost?: boolean
}): Promise<PlanResult> {
  const { records, mapping, lookup } = options
  const issues: ImportIssue[] = []

  const bySourceId = new Map<string, LegacyRecord>()
  for (const record of records) {
    if (!bySourceId.has(record.sourceId)) bySourceId.set(record.sourceId, record)
  }

  const postCache = new Map<string, PostRef | null>()
  const assignment = new Map<string, PostRef>()
  let unresolvedPost = 0
  let unknownStatus = 0
  let derivedSourceIds = 0
  let rejected = 0

  for (const record of records) {
    if (record.sourceIdDerived) derivedSourceIds += 1

    // 时间解析不出来就没法定位顺序，直接待处理。空正文只在非删除状态下算异常。
    if (!record.createdAt) {
      rejected += 1
      issues.push({
        kind: 'INVALID_DATE',
        blocking: true,
        sourceId: record.sourceId,
        postId: null,
        postSlug: null,
        detail: '时间字段无法解析'
      })
      continue
    }

    if (!record.body.trim() && record.status !== 'DELETED') {
      rejected += 1
      issues.push({
        kind: 'EMPTY_BODY',
        blocking: true,
        sourceId: record.sourceId,
        postId: null,
        postSlug: null,
        detail: '正文为空'
      })
      continue
    }

    if (!record.statusKnown) {
      unknownStatus += 1
      issues.push({
        kind: 'UNKNOWN_STATUS',
        blocking: false,
        sourceId: record.sourceId,
        postId: null,
        postSlug: null,
        detail: `状态标记未识别，按 ${mapping.defaultStatus} 导入`
      })
    }

    const host = record.host
    const hostTrusted = !host
      || options.allowAnyHost
      || mapping.allowedHosts.length === 0
      || mapping.allowedHosts.includes(host)

    if (!hostTrusted) {
      unresolvedPost += 1
      issues.push({
        kind: 'UNTRUSTED_HOST',
        blocking: true,
        sourceId: record.sourceId,
        postId: null,
        postSlug: null,
        detail: `来源域名 ${host} 不在可信列表`
      })
      continue
    }

    const post = await resolvePost(record, mapping, lookup, postCache)
    if (!post) {
      unresolvedPost += 1
      issues.push({
        kind: 'UNRESOLVED_POST',
        blocking: true,
        sourceId: record.sourceId,
        postId: null,
        postSlug: null,
        detail: `无法从 ${record.path || record.url || '(空地址)'} 匹配到文章`
      })
      continue
    }

    assignment.set(record.sourceId, post)
  }

  // 按文章分组，逐组接父子关系。
  const grouped = new Map<number, { post: PostRef, records: LegacyRecord[] }>()
  for (const record of records) {
    const post = assignment.get(record.sourceId)
    if (!post) continue

    const bucket = grouped.get(post.id)
    if (bucket) bucket.records.push(record)
    else grouped.set(post.id, { post, records: [record] })
  }

  const posts: PostPlan[] = []
  let totalImportable = 0
  let totalRoots = 0
  let totalReplies = 0
  let totalMedia = 0
  let totalParentAnomalies = 0
  const totalStatus = emptyStatusDistribution()

  for (const [postId, bucket] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
    const plan: PostPlan = {
      post: bucket.post,
      sourceRecords: bucket.records.length,
      importable: 0,
      rootCount: 0,
      replyCount: 0,
      unassignable: 0,
      mediaConversions: 0,
      parentChildAnomalies: 0,
      statusDistribution: emptyStatusDistribution(),
      items: []
    }

    for (const record of bucket.records) {
      const nickname = normalizeNickname(record.nickname)
      if (nickname.adjusted) {
        issues.push({
          kind: 'NICKNAME_ADJUSTED',
          blocking: false,
          sourceId: record.sourceId,
          postId,
          postSlug: bucket.post.slug,
          detail: nickname.detail
        })
      }

      const isRoot = !record.parentSourceId && !record.replyToSourceId
      let threadRootSourceId: string | null = null
      let replyToSourceId: string | null = null
      let depth = 0

      if (!isRoot) {
        const relation = resolveRelation(record, bucket, assignment, bySourceId)

        if ('issue' in relation) {
          plan.unassignable += 1
          plan.parentChildAnomalies += 1
          issues.push({
            kind: relation.issue.kind,
            blocking: true,
            sourceId: record.sourceId,
            postId,
            postSlug: bucket.post.slug,
            detail: relation.issue.detail
          })
          continue
        }

        threadRootSourceId = relation.threadRootSourceId
        replyToSourceId = relation.replyToSourceId
        depth = relation.depth
        plan.replyCount += 1
      } else {
        plan.rootCount += 1
      }

      plan.items.push({
        sourceId: record.sourceId,
        postId,
        postSlug: bucket.post.slug,
        threadRootSourceId,
        replyToSourceId,
        nickname: nickname.value,
        body: record.body,
        status: record.status,
        likeCount: record.likeCount,
        createdAt: record.createdAt!,
        depth,
        mediaConversionCount: record.mediaConversions.length
      })

      plan.importable += 1
      plan.mediaConversions += record.mediaConversions.length
      plan.statusDistribution[record.status] += 1
      totalStatus[record.status] += 1
    }

    plan.items.sort((a, b) => (
      a.depth - b.depth
      || a.createdAt.getTime() - b.createdAt.getTime()
      || a.sourceId.localeCompare(b.sourceId)
    ))

    posts.push(plan)

    totalImportable += plan.importable
    totalRoots += plan.rootCount
    totalReplies += plan.replyCount
    totalMedia += plan.mediaConversions
    totalParentAnomalies += plan.parentChildAnomalies
  }

  return {
    posts,
    issues,
    totals: {
      sourceRecords: records.length,
      importable: totalImportable,
      rootCount: totalRoots,
      replyCount: totalReplies,
      // 每条没能进入计划的原始记录都有一条阻断问题，差额因此能逐条对上。
      unassignable: records.length - totalImportable,
      unresolvedPost,
      mediaConversions: totalMedia,
      parentChildAnomalies: totalParentAnomalies,
      unknownStatus,
      derivedSourceIds,
      rejected,
      statusDistribution: totalStatus
    }
  }
}

/**
 * 解析回复关系。
 *
 * 线程根从父链一路往上找，找不到根、跨文章或成环都归为待处理，
 * 不允许把回复挂到别的文章或挂到不存在的评论上。
 */
function resolveRelation(
  record: LegacyRecord,
  bucket: { post: PostRef, records: LegacyRecord[] },
  assignment: Map<string, PostRef>,
  bySourceId: Map<string, LegacyRecord>
): { threadRootSourceId: string; replyToSourceId: string; depth: number } | { issue: { kind: ImportIssueKind, detail: string } } {
  const parentSourceId = record.parentSourceId ?? record.replyToSourceId
  if (!parentSourceId) {
    return { issue: { kind: 'MISSING_PARENT', detail: '既没有父评论也没有回复对象' } }
  }

  const parent = bySourceId.get(parentSourceId)
  if (!parent) {
    return { issue: { kind: 'MISSING_PARENT', detail: `父评论 ${parentSourceId} 不在备份里` } }
  }

  const parentPost = assignment.get(parent.sourceId)
  if (!parentPost || parentPost.id !== bucket.post.id) {
    return {
      issue: {
        kind: 'CROSS_POST_PARENT',
        detail: `父评论 ${parentSourceId} 属于另一篇文章`
      }
    }
  }

  const root = walkToRoot(parent, bySourceId, assignment, bucket.post.id)
  if ('issue' in root) return root

  // 回复对象优先用被回复的那条；缺失或跨文章时退回线程根，保证回复对象始终可用。
  const targetSourceId = record.replyToSourceId
    && bySourceId.has(record.replyToSourceId)
    && assignment.get(record.replyToSourceId)?.id === bucket.post.id
    ? record.replyToSourceId
    : root.rootSourceId

  return {
    threadRootSourceId: root.rootSourceId,
    replyToSourceId: targetSourceId,
    depth: root.depth + 1
  }
}

/**
 * 沿父链找线程根，同时算出深度并检测环。
 */
function walkToRoot(
  start: LegacyRecord,
  bySourceId: Map<string, LegacyRecord>,
  assignment: Map<string, PostRef>,
  postId: number
): { rootSourceId: string; depth: number } | { issue: { kind: ImportIssueKind, detail: string } } {
  const visited = new Set<string>()
  let current = start
  let depth = 0

  while (true) {
    if (visited.has(current.sourceId)) {
      return { issue: { kind: 'PARENT_CYCLE', detail: `父链在 ${current.sourceId} 成环` } }
    }
    visited.add(current.sourceId)

    if (!current.parentSourceId) {
      return { rootSourceId: current.sourceId, depth }
    }

    const parent = bySourceId.get(current.parentSourceId)
    if (!parent) {
      return { issue: { kind: 'MISSING_PARENT', detail: `父评论 ${current.parentSourceId} 不在备份里` } }
    }

    const parentPost = assignment.get(parent.sourceId)
    if (!parentPost || parentPost.id !== postId) {
      return {
        issue: {
          kind: 'CROSS_POST_PARENT',
          detail: `父评论 ${parent.sourceId} 属于另一篇文章`
        }
      }
    }

    depth += 1
    current = parent
  }
}

/**
 * 旧 URL 到当前文章 slug 的候选。
 *
 * 先试整段路径，再试最后一段，再去掉 .html 后缀，最后统一归一化。
 * 人工确认的别名优先。
 */
async function resolvePost(
  record: LegacyRecord,
  mapping: ResolvedMapping,
  lookup: PostLookup,
  cache: Map<string, PostRef | null>
): Promise<PostRef | null> {
  const candidates = slugCandidates(record.path)
  const aliases = new Map<string, string>()

  for (const candidate of candidates) {
    const alias = mapping.postAliases[candidate]
    if (alias) aliases.set(candidate, alias)
  }

  const ordered = [...aliases.values(), ...candidates]

  for (const candidate of ordered) {
    if (!cache.has(candidate)) {
      cache.set(candidate, await lookup.find(candidate))
    }

    const post = cache.get(candidate)
    if (post) return post
  }

  return null
}

export function slugCandidates(path: string): string[] {
  const cleaned = path.trim().replace(/^\/+|\/+$/g, '')
  const raw = new Set<string>()

  if (cleaned) {
    raw.add(cleaned)

    const segments = cleaned.split('/').filter(Boolean)
    const last = segments[segments.length - 1]
    if (last) {
      raw.add(last)
      raw.add(last.replace(/\.html?$/i, ''))
    }
  }

  const candidates = new Set<string>()
  for (const value of raw) {
    const normalized = normalizePostSlug(value)
    candidates.add(normalized || value)
    candidates.add(value)
  }

  return [...candidates]
}

/**
 * 昵称规整。
 *
 * 缺失时用「匿名」，超长时截断。历史昵称原样保留，不套用访客昵称的禁用词规则 ——
 * 旧站的昵称不代表当前权限。
 */
export function normalizeNickname(name: string): { value: string, adjusted: boolean, detail: string } {
  const trimmed = name.trim()

  if (!trimmed) {
    return { value: ANONYMOUS_NAME, adjusted: true, detail: '昵称为空，使用「匿名」' }
  }

  const codePoints = Array.from(trimmed)
  if (codePoints.length > MAX_NAME_LENGTH) {
    return {
      value: codePoints.slice(0, MAX_NAME_LENGTH).join(''),
      adjusted: true,
      detail: `昵称超过 ${MAX_NAME_LENGTH} 个字符，已截断`
    }
  }

  return { value: trimmed, adjusted: false, detail: '' }
}

export function emptyStatusDistribution(): Record<CommentStatusPayload, number> {
  return { PENDING: 0, VISIBLE: 0, HIDDEN: 0, DELETED: 0 }
}
