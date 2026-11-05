import type { CommentAuthorKind, CommentBodyFormat, CommentStatus, Prisma } from '@prisma/client'
import { notFound } from '../../utils/api-error'
import { prisma } from '../../utils/prisma'
import { normalizePostSlug } from '../../utils/slug'
import type {
  PublicCommentListPayload,
  PublicCommentReply,
  PublicCommentRepliesPayload,
  PublicCommentThread
} from '../../../types/dto/comment'
import { buildPublishedPostWhere } from '../posts/post-visibility'
import { decodeCommentCursor, encodeCommentCursor } from './comment-cursor'
import type { CommentViewer } from './comment-identity.service'
import { renderCommentBody } from './comment-render.service'
import { REPLY_PREVIEW_COUNT, type CommentListQuery, type CommentRepliesQuery } from './comment.schema'

/** 删除后的占位文案。作者信息不展示，原昵称也不进公开 DTO。 */
export const DELETED_AUTHOR_NAME = '已删除'

type ReplyRow = {
  id: number
  postId: number
  body: string
  bodyFormat: CommentBodyFormat
  status: CommentStatus
  authorKind: CommentAuthorKind
  authorUserId: number | null
  guestTokenHash: string | null
  authorName: string
  createdAt: Date
  author: { role: string } | null
  replyTo: { id: number, authorName: string, status: CommentStatus, postId: number } | null
}

type ThreadRow = ReplyRow & {
  replies: ReplyRow[]
  _count: { replies: number }
}

/**
 * 主讨论列表。
 *
 * 只返回可展示的主评论：正常可见的，以及还有可见回复的删除占位。
 * 回复预览取正序前两条，展开时用预览最后一条的游标继续，避免重复。
 */
export async function listPublicCommentThreads(
  postId: number,
  query: CommentListQuery,
  viewer: CommentViewer
): Promise<PublicCommentListPayload> {
  const scope = { sort: query.sort, postId }
  const position = query.cursor ? decodeCommentCursor(query.cursor, scope) : null

  const visibility: Prisma.CommentWhereInput = {
    postId,
    threadRootId: null,
    OR: [
      { status: 'VISIBLE' },
      { status: 'DELETED', replies: { some: { status: 'VISIBLE' } } }
    ]
  }

  const where: Prisma.CommentWhereInput = position
    ? { AND: [visibility, buildCursorWhere(query.sort, position.createdAt, position.id)] }
    : visibility

  const [rows, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: query.sort === 'oldest'
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      include: {
        author: { select: { role: true } },
        replyTo: { select: { id: true, authorName: true, status: true, postId: true } },
        replies: {
          where: { status: 'VISIBLE' },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: REPLY_PREVIEW_COUNT,
          include: {
            author: { select: { role: true } },
            replyTo: { select: { id: true, authorName: true, status: true, postId: true } }
          }
        },
        _count: { select: { replies: { where: { status: 'VISIBLE' } } } }
      }
    }),
    prisma.comment.count({ where: visibility })
  ])

  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows
  const last = page[page.length - 1]

  return {
    items: page.map(row => toThreadDto(row, viewer)),
    nextCursor: hasMore && last
      ? encodeCommentCursor(scope, { createdAt: last.createdAt, id: last.id })
      : null,
    total
  }
}

/**
 * 楼中楼回复列表。固定正序，与预览一致。
 * 主讨论不可展示时返回 404，不区分「不存在」和「不可见」。
 */
export async function listPublicCommentReplies(
  postId: number,
  threadRootId: number,
  query: CommentRepliesQuery,
  viewer: CommentViewer
): Promise<PublicCommentRepliesPayload> {
  await assertThreadVisible(postId, threadRootId)

  const scope = { sort: 'oldest' as const, postId, threadRootId }
  const position = query.cursor ? decodeCommentCursor(query.cursor, scope) : null

  const visibility: Prisma.CommentWhereInput = {
    postId,
    threadRootId,
    status: 'VISIBLE'
  }

  const where: Prisma.CommentWhereInput = position
    ? { AND: [visibility, buildCursorWhere('oldest', position.createdAt, position.id)] }
    : visibility

  const rows = await prisma.comment.findMany({
    where,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: query.limit + 1,
    include: {
      author: { select: { role: true } },
      replyTo: { select: { id: true, authorName: true, status: true, postId: true } }
    }
  })

  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows
  const last = page[page.length - 1]

  return {
    threadRootId,
    items: page.map(row => toReplyDto(row, viewer, postId)),
    nextCursor: hasMore && last
      ? encodeCommentCursor(scope, { createdAt: last.createdAt, id: last.id })
      : null
  }
}

/**
 * 解析 slug 到已发布文章。
 * 草稿、归档与未来发布的文章一律 404 —— 公开读写与作者删除共用同一口径。
 */
export async function requirePublishedPostId(rawSlug: string): Promise<number> {
  const slug = normalizePostSlug(rawSlug)
  const post = await prisma.post.findFirst({
    where: buildPublishedPostWhere({ slug }),
    select: { id: true }
  })

  if (!post) throw notFound('文章不存在')

  return post.id
}

/**
 * 主讨论是否可展示。
 * 隐藏与待审的主讨论整条不展示；删除的主评论只在还有可见回复时留占位。
 */
export async function assertThreadVisible(postId: number, threadRootId: number) {
  const root = await prisma.comment.findFirst({
    where: { id: threadRootId, postId, threadRootId: null },
    select: { id: true, status: true }
  })

  if (!root) throw notFound('讨论不存在')
  if (root.status === 'VISIBLE') return

  if (root.status === 'DELETED') {
    const visibleReplies = await prisma.comment.count({
      where: { postId, threadRootId, status: 'VISIBLE' }
    })
    if (visibleReplies > 0) return
  }

  throw notFound('讨论不存在')
}

function buildCursorWhere(
  sort: 'newest' | 'oldest',
  createdAt: Date,
  id: number
): Prisma.CommentWhereInput {
  const asc = sort === 'oldest'
  return {
    OR: [
      { createdAt: asc ? { gt: createdAt } : { lt: createdAt } },
      { createdAt, id: asc ? { gt: id } : { lt: id } }
    ]
  }
}

function toThreadDto(row: ThreadRow, viewer: CommentViewer): PublicCommentThread {
  const isDeleted = row.status === 'DELETED'
  const replyCount = row._count.replies
  const replies = row.replies.map(reply => toReplyDto(reply, viewer, row.postId))

  // 预览已经吃掉了前两条，剩下的用最后一条的位置做游标，展开后从第三条继续。
  const lastPreview = row.replies[row.replies.length - 1]
  const repliesCursor = replyCount > replies.length && lastPreview
    ? encodeCommentCursor(
        { sort: 'oldest', postId: row.postId, threadRootId: row.id },
        { createdAt: lastPreview.createdAt, id: lastPreview.id }
      )
    : null

  return {
    id: row.id,
    bodyHtml: isDeleted ? '' : renderCommentBody(row.body, row.bodyFormat),
    authorName: isDeleted ? DELETED_AUTHOR_NAME : row.authorName,
    authorKind: row.authorKind,
    isOfficial: isOfficialAuthor(row.author),
    createdAt: row.createdAt.toISOString(),
    replyCount,
    canDelete: canDeleteComment(row, viewer),
    isDeleted,
    replies,
    repliesCursor
  }
}

function toReplyDto(row: ReplyRow, viewer: CommentViewer, postId: number): PublicCommentReply {
  const isDeleted = row.status === 'DELETED'
  const target = row.replyTo

  // 被回复的目标隐藏或删除时降级成「回复的评论不可见」，不返回作者与正文。
  // 跨文章的引用同样降级 —— 导入数据里的异常父子关系不能顺着公开接口带出去。
  const replyTo = target && target.status === 'VISIBLE' && target.postId === postId
    ? { id: target.id, authorName: target.authorName }
    : null

  return {
    id: row.id,
    bodyHtml: isDeleted ? '' : renderCommentBody(row.body, row.bodyFormat),
    authorName: isDeleted ? DELETED_AUTHOR_NAME : row.authorName,
    authorKind: row.authorKind,
    isOfficial: isOfficialAuthor(row.author),
    createdAt: row.createdAt.toISOString(),
    replyTo,
    canDelete: canDeleteComment(row, viewer),
    isDeleted
  }
}

/** 只有绑定博客账号且当前角色是管理员的评论显示官方标识。旧评论永远不是官方。 */
function isOfficialAuthor(author: { role: string } | null): boolean {
  return author?.role === 'ADMIN'
}

/** 只有原作者本人可以自助删除。 */
export function canDeleteComment(
  comment: { authorUserId: number | null, guestTokenHash: string | null },
  viewer: CommentViewer
): boolean {
  if (viewer.userId && comment.authorUserId === viewer.userId) return true
  if (viewer.guestTokenHash && comment.guestTokenHash && comment.guestTokenHash === viewer.guestTokenHash) {
    return true
  }
  return false
}
