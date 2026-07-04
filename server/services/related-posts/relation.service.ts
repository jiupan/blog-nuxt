import { prisma } from '~~/server/utils/prisma'

export const relationTypes = ['PREREQUISITE', 'EXTENSION', 'SAME_TOPIC', 'PRACTICE', 'BACKGROUND'] as const
export const relationSources = ['AI', 'MANUAL'] as const

export type RelationType = typeof relationTypes[number]
export type RelationSource = typeof relationSources[number]

export type SavePostRelationItem = {
  relatedPostId: number
  type: RelationType
  reason?: string | null
  sort: number
  source?: RelationSource
}

export async function getPostRelations(postId: number) {
  const relations = await prisma.postRelation.findMany({
    where: {
      postId,
      relatedPost: {
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() }
      }
    },
    include: {
      relatedPost: {
        include: {
          category: true,
          tags: { include: { tag: true } }
        }
      }
    },
    orderBy: [
      { sort: 'asc' },
      { id: 'asc' }
    ]
  })

  return relations.map((relation) => ({
    id: relation.id,
    type: relation.type,
    source: relation.source,
    reason: relation.reason,
    sort: relation.sort,
    post: {
      ...relation.relatedPost,
      tags: relation.relatedPost.tags.map((item) => item.tag)
    }
  }))
}

export async function getAdminPostRelations(postId: number) {
  const relations = await prisma.postRelation.findMany({
    where: { postId },
    include: {
      relatedPost: {
        include: {
          category: true,
          tags: { include: { tag: true } }
        }
      }
    },
    orderBy: [
      { sort: 'asc' },
      { id: 'asc' }
    ]
  })

  return relations.map((relation) => ({
    id: relation.id,
    relatedPostId: relation.relatedPostId,
    type: relation.type,
    source: relation.source,
    reason: relation.reason,
    sort: relation.sort,
    post: {
      ...relation.relatedPost,
      tags: relation.relatedPost.tags.map((item) => item.tag)
    }
  }))
}

export async function savePostRelations(postId: number, items: SavePostRelationItem[]) {
  const normalized = normalizeRelationItems(postId, items)

  if (normalized.length) {
    const publishedCount = await prisma.post.count({
      where: {
        id: { in: normalized.map((item) => item.relatedPostId) },
        status: 'PUBLISHED',
        publishedAt: { lte: new Date() }
      }
    })

    if (publishedCount !== normalized.length) {
      throw createError({
        statusCode: 400,
        statusMessage: '关联文章必须是已发布文章'
      })
    }
  }

  await prisma.$transaction([
    prisma.postRelation.deleteMany({ where: { postId } }),
    ...(normalized.length
      ? [
          prisma.postRelation.createMany({
            data: normalized
          })
        ]
      : [])
  ])

  return getAdminPostRelations(postId)
}

function normalizeRelationItems(postId: number, items: SavePostRelationItem[]) {
  const seen = new Set<number>()

  return items
    .map((item, index) => ({
      postId,
      relatedPostId: item.relatedPostId,
      type: item.type,
      source: item.source || 'AI',
      reason: item.reason?.trim() ? item.reason.trim().slice(0, 160) : null,
      sort: Number.isFinite(item.sort) ? item.sort : index
    }))
    .filter((item) => {
      if (item.relatedPostId === postId || seen.has(item.relatedPostId)) {
        return false
      }

      seen.add(item.relatedPostId)
      return true
    })
    .slice(0, 12)
}
