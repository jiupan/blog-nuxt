import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async () => {
  const posts = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lte: new Date() }
    },
    select: {
      slug: true,
      updatedAt: true
    }
  })

  return [
    { loc: '/', changefreq: 'daily', priority: 1 },
    { loc: '/posts', changefreq: 'daily', priority: 0.8 },
    { loc: '/archive', changefreq: 'weekly', priority: 0.6 },
    { loc: '/about', changefreq: 'monthly', priority: 0.5 },
    ...posts.map((post) => ({
      loc: `/posts/${post.slug}.html`,
      lastmod: post.updatedAt
    }))
  ]
})
