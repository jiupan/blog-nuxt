import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import type { AdminCommentListItem } from '../../../types/dto/comment'
import { renderCommentBody } from './comment-render.service'
import type { AdminCommentListQuery } from './comment.schema'

export type AdminCommentListResult = {
  items: AdminCommentListItem[]
  total: number
  page: number
  pageSize: number
}

/**
 * 后台评论列表。
 *
 * 管理员能看到全部状态，包括待审、隐藏与已删除。
 * 排序字段是白名单里的固定枚举，不接受任意 SQL 排序字段。
 */
export async function listAdminComments(query: AdminCommentListQuery): Promise<AdminCommentListResult> {
  const where = buildAdminCommentWhere(query)

  const [items, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: query.sort === 'oldest'
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        post: { select: { title: true, slug: true } },
        _count: { select: { replies: { where: { status: 'VISIBLE' } } } }
      }
    }),
    prisma.comment.count({ where })
  ])

  return {
    items: items.map(item => ({
      id: item.id,
      postId: item.postId,
      postTitle: item.post.title,
      postSlug: item.post.slug,
      authorName: item.authorName,
      authorKind: item.authorKind,
      authorUserId: item.authorUserId,
      threadRootId: item.threadRootId,
      replyToId: item.replyToId,
      body: item.body,
      bodyHtml: renderCommentBody(item.body, item.bodyFormat),
      status: item.status,
      replyCount: item._count.replies,
      createdAt: item.createdAt.toISOString(),
      legacySource: item.legacySource
    })),
    total,
    page: query.page,
    pageSize: query.pageSize
  }
}

function buildAdminCommentWhere(query: AdminCommentListQuery): Prisma.CommentWhereInput {
  const where: Prisma.CommentWhereInput = {}

  if (query.postId !== undefined) where.postId = query.postId
  if (query.status) where.status = query.status

  if (query.keyword) {
    where.authorName = { contains: query.keyword, mode: 'insensitive' }
  }

  if (query.createdFrom || query.createdTo) {
    where.createdAt = {
      ...(query.createdFrom ? { gte: query.createdFrom } : {}),
      ...(query.createdTo ? { lte: query.createdTo } : {})
    }
  }

  return where
}
