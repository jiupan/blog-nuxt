import { getQuery } from 'h3'
import { ok } from '~~/server/utils/response'
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

/**
 * 评论队列计数。
 *
 * 后台的筛选按钮要显示每个队列里还剩多少条。带 postId 时只统计该文章的评论，
 * 这样按文章定位之后，队列数字仍然对得上当前看到的范围。
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rawPostId = getQuery(event).postId
  const parsedPostId = Number(rawPostId)
  const where = Number.isInteger(parsedPostId) && parsedPostId > 0
    ? { postId: parsedPostId }
    : {}

  const grouped = await prisma.comment.groupBy({
    by: ['status'],
    where,
    _count: { _all: true }
  })

  const counts = { PENDING: 0, VISIBLE: 0, HIDDEN: 0, DELETED: 0 }
  for (const row of grouped) {
    if (row.status in counts) counts[row.status] = row._count._all
  }

  return ok({
    total: counts.PENDING + counts.VISIBLE + counts.HIDDEN + counts.DELETED,
    pending: counts.PENDING,
    visible: counts.VISIBLE,
    hidden: counts.HIDDEN,
    deleted: counts.DELETED
  })
})
