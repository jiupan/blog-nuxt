import { prisma } from '~~/server/utils/prisma'

export async function getPublishedPostById(postId: number) {
  const now = new Date()
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      status: 'PUBLISHED',
      publishedAt: { lte: now }
    },
    include: {
      category: true,
      tags: { include: { tag: true } }
    }
  })

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: '文章不存在或尚未发布'
    })
  }

  return post
}
