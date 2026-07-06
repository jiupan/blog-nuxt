import { listSitemapPosts } from '~~/server/services/posts/post-query.service'

export default defineEventHandler(async () => {
  const posts = await listSitemapPosts()

  return [
    { loc: '/', changefreq: 'daily', priority: 1 },
    { loc: '/posts', changefreq: 'daily', priority: 0.8 },
    { loc: '/archive', changefreq: 'weekly', priority: 0.6 },
    { loc: '/about', changefreq: 'monthly', priority: 0.5 },
    ...posts.map((post) => ({
      loc: `/${post.slug}.html`,
      lastmod: post.updatedAt
    }))
  ]
})
