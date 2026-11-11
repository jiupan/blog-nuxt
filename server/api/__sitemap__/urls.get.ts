import { listSitemapPosts } from '../../services/posts/post-query.service'
import { listPublicCategories, listPublicTags } from '../../services/taxonomy/taxonomy.service'

export default defineEventHandler(async () => {
  const [posts, categories, tags] = await Promise.all([
    listSitemapPosts(),
    listPublicCategories(),
    listPublicTags()
  ])

  return [
    { loc: '/', changefreq: 'daily', priority: 1 },
    { loc: '/archive', changefreq: 'daily', priority: 0.8 },
    { loc: '/categories', changefreq: 'daily', priority: 0.6 },
    { loc: '/tags', changefreq: 'daily', priority: 0.6 },
    { loc: '/about', changefreq: 'monthly', priority: 0.5 },
    { loc: '/tools' },
    { loc: '/link' },
    { loc: '/lab' },
    ...categories
      .filter((item) => item._count.posts > 0)
      .map((item) => ({ loc: `/categories/${encodeURIComponent(item.slug)}`, _encoded: true })),
    ...tags
      .filter((item) => item._count.posts > 0)
      .map((item) => ({ loc: `/tags/${encodeURIComponent(item.slug)}`, _encoded: true })),
    ...posts.map((post) => ({
      loc: `/${post.slug}.html`,
      lastmod: post.updatedAt
    }))
  ]
})
