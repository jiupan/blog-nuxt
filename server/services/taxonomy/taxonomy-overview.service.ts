import type { TaxonomyOverviewPayload } from '~~/types/dto/taxonomy'
import { prisma } from '../../utils/prisma'
import { buildPublishedPostWhere } from '../posts/post-visibility'

export async function getTaxonomyOverview(kind: 'categories' | 'tags'): Promise<TaxonomyOverviewPayload> {
  const where = buildPublishedPostWhere()
  const orderBy = [{ sort: 'asc' }, { id: 'asc' }] as const
  const postOrder = [{ publishedAt: 'desc' }, { id: 'desc' }] as const
  const postSelect = { id: true, title: true, slug: true } as const
  const totalPromise = prisma.post.count({ where })

  if (kind === 'categories') {
    const [items, totalPosts] = await Promise.all([
      prisma.category.findMany({
        orderBy: [...orderBy],
        select: {
          id: true, name: true, slug: true, icon: true,
          _count: { select: { posts: { where } } },
          posts: { where, orderBy: [...postOrder], take: 10, select: postSelect }
        }
      }),
      totalPromise
    ])
    return { items, totalPosts }
  }

  const [tags, totalPosts] = await Promise.all([
    prisma.tag.findMany({
      orderBy: [...orderBy],
      select: {
        id: true, name: true, slug: true,
        _count: { select: { posts: { where: { post: where } } } },
        posts: {
          where: { post: where },
          orderBy: postOrder.map(order => ({ post: order })),
          take: 3,
          select: { post: { select: postSelect } }
        }
      }
    }),
    totalPromise
  ])
  return { items: tags.map(tag => ({ ...tag, posts: tag.posts.map(item => item.post) })), totalPosts }
}
