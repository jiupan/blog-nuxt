import { badRequest } from '../../utils/api-error'

/** 游标格式版本。改结构时必须加版本，否则旧游标会被误读成新格式。 */
const CURSOR_VERSION = 1

export type CommentCursorSort = 'newest' | 'oldest'

export type CommentCursorScope = {
  /** 主讨论列表按请求的排序校验，回复列表固定正序。 */
  sort: CommentCursorSort
  postId: number
  /** 回复列表额外校验线程根，跨讨论的游标一律拒绝。 */
  threadRootId?: number
}

export type CommentCursorPosition = {
  createdAt: Date
  id: number
}

type CommentCursorPayload = {
  v: number
  s: CommentCursorSort
  p: number
  t?: number
  c: string
  i: number
}

/** 游标失效。结构化 400，不泄露内部字段。 */
function invalidCursor() {
  return badRequest('分页参数无效，请刷新页面后重试')
}

export function encodeCommentCursor(scope: CommentCursorScope, position: CommentCursorPosition): string {
  const payload: CommentCursorPayload = {
    v: CURSOR_VERSION,
    s: scope.sort,
    p: scope.postId,
    ...(scope.threadRootId === undefined ? {} : { t: scope.threadRootId }),
    c: position.createdAt.toISOString(),
    i: position.id
  }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

/**
 * 解析并校验游标。
 *
 * 校验版本、排序、文章与线程根，任何一项对不上都返回结构化 400。
 * 排序必须一致 —— 换方向后旧游标的位置没有意义。
 */
export function decodeCommentCursor(raw: string, scope: CommentCursorScope): CommentCursorPosition {
  const payload = parseCursorPayload(raw)
  if (!payload) throw invalidCursor()

  if (payload.v !== CURSOR_VERSION) throw invalidCursor()
  if (payload.s !== scope.sort) throw invalidCursor()
  if (payload.p !== scope.postId) throw invalidCursor()

  if (scope.threadRootId === undefined) {
    if (payload.t !== undefined) throw invalidCursor()
  } else if (payload.t !== scope.threadRootId) {
    throw invalidCursor()
  }

  const createdAt = new Date(payload.c)
  if (Number.isNaN(createdAt.getTime())) throw invalidCursor()
  if (!Number.isInteger(payload.i) || payload.i <= 0) throw invalidCursor()

  return { createdAt, id: payload.i }
}

function parseCursorPayload(raw: string): CommentCursorPayload | null {
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as CommentCursorPayload
  } catch {
    return null
  }
}
