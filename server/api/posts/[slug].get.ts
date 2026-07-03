import { prisma } from '~~/server/utils/prisma'
import { renderMarkdown } from '~~/server/utils/markdown'
import { ok } from '~~/server/utils/response'
import { normalizePostSlug } from '~~/server/utils/slug'

export default defineEventHandler(async (event) => {
  const slug = normalizePostSlug(getRouterParam(event, 'slug') || '')
  const now = new Date()

  const post = await prisma.post.findFirst({
    where: {
      slug,
      status: 'PUBLISHED',
      publishedAt: { lte: now }
    },
    include: {
      category: true,
      tags: { include: { tag: true } }
    }
  })

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  await prisma.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } }
  })

  const [previous, next, rendered] = await Promise.all([
    prisma.post.findFirst({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
        OR: [
          { createdAt: { gt: post.createdAt } },
          {
            createdAt: post.createdAt,
            id: { gt: post.id }
          }
        ]
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' }
      ],
      select: { title: true, slug: true }
    }),
    prisma.post.findFirst({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
        OR: [
          { createdAt: { lt: post.createdAt } },
          {
            createdAt: post.createdAt,
            id: { lt: post.id }
          }
        ]
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      select: { title: true, slug: true }
    }),
    renderMarkdown(post.content)
  ])

  return ok({
    ...post,
    tags: post.tags.map((item) => item.tag),
    rendered,
    previous,
    next
  })
})
