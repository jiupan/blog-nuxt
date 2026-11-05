import type { CommentAuthorKindPayload } from '~~/types/dto/comment'

export const COMMENT_BODY_MAX_LENGTH = 2000
export const COMMENT_NAME_MIN_LENGTH = 2
export const COMMENT_NAME_MAX_LENGTH = 24

/**
 * 按 Unicode 码点计数。
 *
 * 服务端用的是同一套口径，前端必须一致，否则中文昵称会在服务端被判超长。
 */
export function countCommentCodePoints(value: string) {
  return Array.from(value || '').length
}

/**
 * 头像首字。
 *
 * 取第一个码点而不是第一个 UTF-16 单元，emoji 才不会被截成半个代理对。
 */
export function commentInitial(name: string) {
  const trimmed = (name || '').trim()
  if (!trimmed) return '·'
  return [...trimmed][0]!.toUpperCase()
}

/** 评论时间。绝对时间比相对时间更省事，也不用处理跨时区。 */
export function formatCommentTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const day = date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return `${day} ${time}`
}

/** 身份标签。只用于无障碍提示与后台，不参与权限判断。 */
export function commentAuthorKindLabel(kind: CommentAuthorKindPayload) {
  if (kind === 'ACCOUNT') return '账号'
  if (kind === 'GUEST') return '访客'
  return '历史评论'
}
