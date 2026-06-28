import { prisma } from '~~/server/utils/prisma'
import { renderMarkdown } from '~~/server/utils/markdown'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
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
        publishedAt: { lt: post.publishedAt || now }
      },
      orderBy: { publishedAt: 'desc' },
      select: { title: true, slug: true }
    }),
    prisma.post.findFirst({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gt: post.publishedAt || now }
      },
      orderBy: { publishedAt: 'asc' },
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
