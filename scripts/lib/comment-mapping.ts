import type { CommentStatusPayload } from '../../types/dto/comment'

/**
 * 上游字段到本地字段的候选列表。
 *
 * 候选按顺序取第一个存在且非空的字段。Twikoo 的字段名只是候选，不是约定 ——
 * 真实样本确认之前，任何一个字段都可能对不上，所以映射文件可以覆盖这份默认值。
 */
export type LegacyFieldMap = {
  /** 稳定来源 ID。幂等靠它，没有它就没法重跑去重。 */
  sourceId: string[]
  /** 评论所在文章的地址，可以是完整 URL，也可以是路径。 */
  url: string[]
  /** 父评论 ID。Twikoo 里是 rid，指向线程根。 */
  parentId: string[]
  /** 被回复的评论 ID。Twikoo 里是 pid。 */
  replyToId: string[]
  /** 被回复者的昵称。只作人工核对用，不进数据表。 */
  replyToNickname: string[]
  nickname: string[]
  body: string[]
  createdAt: string[]
  /** 历史点赞数。字段缺失时必须留空，不能补成 0。 */
  likeCount: string[]
  status: string[]
}

export const DEFAULT_FIELD_MAP: LegacyFieldMap = {
  sourceId: ['_id', 'id', 'oid', 'commentId', 'comment_id'],
  url: ['url', 'path', 'permalink'],
  parentId: ['rid', 'parentId', 'parent_id', 'rootId'],
  replyToId: ['pid', 'replyToId', 'reply_id', 'targetId'],
  replyToNickname: ['ruser', 'replyToNickname', 'reply_user'],
  nickname: ['nick', 'nickname', 'name'],
  body: ['comment', 'body', 'content', 'text', 'message'],
  createdAt: ['created', 'createdAt', 'createTime', 'created_at', 'time'],
  likeCount: ['like', 'likeCount', 'liked', 'likes', 'like_count'],
  status: ['status', 'state', 'visibility']
}

/**
 * 状态标记到本地状态的映射。
 *
 * 刻意不收录数字状态：数字的含义必须先用样本确认，猜错会把该隐藏的评论公开出去。
 * 确认之后在映射文件里补一条即可，例如 "0": "VISIBLE"。
 */
export const DEFAULT_STATUS_MAP: Record<string, CommentStatusPayload> = {
  '': 'VISIBLE',
  normal: 'VISIBLE',
  visible: 'VISIBLE',
  published: 'VISIBLE',
  public: 'VISIBLE',
  ok: 'VISIBLE',
  hidden: 'HIDDEN',
  hide: 'HIDDEN',
  spam: 'HIDDEN',
  deleted: 'DELETED',
  delete: 'DELETED',
  removed: 'DELETED',
  pending: 'PENDING',
  audit: 'PENDING',
  review: 'PENDING',
  unreviewed: 'PENDING'
}

/** 映射文件。字段名与结构见 docs/comments-import.md。 */
export type LegacyMappingFile = {
  /** 覆盖或补充默认候选。 */
  fields?: Partial<LegacyFieldMap>
  /** 覆盖或补充状态映射。 */
  statusMap?: Record<string, CommentStatusPayload>
  /** 状态无法判定时的兜底。默认 PENDING —— 未知的旧状态一律不自动变可见。 */
  defaultStatus?: CommentStatusPayload
  /** 可信站点 host。旧 URL 的 host 不在表内就不导入。 */
  allowedHosts?: string[]
  /** 旧路径或旧 slug 到当前 slug 的人工映射。 */
  postAliases?: Record<string, string>
  /** 表情图来源域名。命中时按表情计数。 */
  emojiHosts?: string[]
}

export type ResolvedMapping = {
  fields: LegacyFieldMap
  statusMap: Record<string, CommentStatusPayload>
  defaultStatus: CommentStatusPayload
  allowedHosts: string[]
  postAliases: Record<string, string>
  emojiHosts: string[]
  /** 状态映射是不是人工改过的。没改过说明数字状态仍然是猜的。 */
  statusMapOverridden: boolean
}

/**
 * 合并默认映射与映射文件。
 *
 * 映射文件里的候选列表是追加而不是替换：只写一个字段名不会把其余默认候选清掉，
 * 想完全改写就把该字段写成完整数组。
 */
export function resolveMapping(file: LegacyMappingFile | null): ResolvedMapping {
  const fields: LegacyFieldMap = { ...DEFAULT_FIELD_MAP }

  for (const key of Object.keys(DEFAULT_FIELD_MAP) as (keyof LegacyFieldMap)[]) {
    const override = file?.fields?.[key]
    if (Array.isArray(override) && override.length > 0) {
      fields[key] = [...new Set([...override, ...DEFAULT_FIELD_MAP[key]])]
    }
  }

  return {
    fields,
    statusMap: { ...DEFAULT_STATUS_MAP, ...(file?.statusMap ?? {}) },
    defaultStatus: file?.defaultStatus ?? 'PENDING',
    allowedHosts: [...new Set((file?.allowedHosts ?? []).map((host) => host.toLowerCase()))],
    postAliases: { ...(file?.postAliases ?? {}) },
    emojiHosts: [...new Set((file?.emojiHosts ?? []).map((host) => host.toLowerCase()))],
    statusMapOverridden: Boolean(file?.statusMap)
  }
}

/**
 * 取候选字段的值。
 *
 * 空字符串只在状态标记上有意义（空串表示正常），其他字段把空串当成没有值。
 */
export function pickField(
  raw: Record<string, unknown>,
  candidates: string[],
  options: { allowEmptyString?: boolean } = {}
): unknown {
  for (const key of candidates) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue

    const value = raw[key]
    if (value === undefined || value === null) continue
    if (typeof value === 'string' && value.trim() === '' && !options.allowEmptyString) continue

    return value
  }

  return undefined
}
