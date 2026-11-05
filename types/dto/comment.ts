export type CommentAuthorKindPayload = 'ACCOUNT' | 'GUEST' | 'LEGACY'

export type CommentStatusPayload = 'PENDING' | 'VISIBLE' | 'HIDDEN' | 'DELETED'

/**
 * 被回复的那条评论。
 * 目标被隐藏或删除时为 null，前端统一渲染「回复的评论不可见」，不暴露原作者与正文。
 */
export type CommentReplyTarget = {
  id: number
  authorName: string
}

export type PublicCommentReply = {
  id: number
  /** 服务端渲染好的 HTML，已经过白名单过滤。 */
  bodyHtml: string
  authorName: string
  authorKind: CommentAuthorKindPayload
  /** 文章作者本人的回复。 */
  isOfficial: boolean
  createdAt: string
  replyTo: CommentReplyTarget | null
  /** 当前访问者能否自助删除。 */
  canDelete: boolean
  /** 评论已被删除，只保留占位。 */
  isDeleted: boolean
}

export type PublicCommentThread = {
  id: number
  bodyHtml: string
  authorName: string
  authorKind: CommentAuthorKindPayload
  isOfficial: boolean
  createdAt: string
  /** 可见回复数。隐藏与待审的回复不计入。 */
  replyCount: number
  canDelete: boolean
  isDeleted: boolean
  /** 预览的前两条可见回复。 */
  replies: PublicCommentReply[]
  /**
   * 预览区最后一条回复之后的位置。
   * 展开回复时把它原样传给回复列表接口，服务端从第二条之后继续，不会重复也不会漏。
   */
  repliesCursor: string | null
}

export type PublicCommentListPayload = {
  items: PublicCommentThread[]
  nextCursor: string | null
  total: number
}

export type PublicCommentRepliesPayload = {
  /** 被展开的楼中楼主评论 id。 */
  threadRootId: number
  items: PublicCommentReply[]
  nextCursor: string | null
}

/** 提交后的回执。 */
export type SubmitCommentPayload = {
  id: number
  status: CommentStatusPayload
  authorName: string
  authorKind: CommentAuthorKindPayload
  createdAt: string
  /** 是否还在等待审核。访客与待审状态为 true。 */
  pendingReview: boolean
}

/** 提交前的身份状态，用于决定评论框的默认身份。 */
export type CommentSessionPayload = {
  guest: {
    hasCredential: boolean
    displayName: string | null
  }
  account: {
    id: number
    username: string
  } | null
}

export type AdminCommentListItem = {
  id: number
  postId: number
  postTitle: string
  postSlug: string
  authorName: string
  authorKind: CommentAuthorKindPayload
  authorUserId: number | null
  /** 所属讨论。回复才有值。 */
  threadRootId: number | null
  /** 被回复的那条评论。 */
  replyToId: number | null
  /** 原始正文，后台要能看到用户到底写了什么。 */
  body: string
  bodyHtml: string
  status: CommentStatusPayload
  /** 可见回复数。 */
  replyCount: number
  createdAt: string
  legacySource: string | null
}

export type AdminCommentModerationPayload = {
  id: number
  status: CommentStatusPayload
  /**
   * 目标状态与当前状态相同，为 true。
   * 重复提交同一次审核不写审计日志。
   */
  unchanged: boolean
}

/** 后台队列计数。 */
export type AdminCommentStatsPayload = {
  total: number
  pending: number
  visible: number
  hidden: number
  deleted: number
}
