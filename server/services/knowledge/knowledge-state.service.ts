import type { Prisma } from '@prisma/client'
import { prisma } from '../../utils/prisma'
import { hashPostKnowledgeSource } from '../rag/chunker.service'

const postInclude = {
  category: true,
  tags: { include: { tag: true } }
} satisfies Prisma.PostInclude

export async function refreshKnowledgeDocumentState(postId: number) {
  const document = await prisma.knowledgeDocument.findUnique({ where: { postId } })
  if (!document || !document.enabled || document.status === 'SYNCING') return document
  const post = await prisma.post.findUnique({ where: { id: postId }, include: postInclude })
  if (!post) return null
  const sourceHash = hashPostKnowledgeSource(post)
  const status = document.indexedHash && document.indexedHash === sourceHash ? 'SYNCED' : document.indexedHash ? 'STALE' : 'PENDING'
  if (status === 'SYNCED') {
    await prisma.postChunk.updateMany({
      where: { postId },
      data: {
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        categoryId: post.categoryId,
        tagIds: JSON.stringify(post.tags.map((item) => item.tagId))
      }
    })
  }
  if (sourceHash !== document.sourceHash || status !== document.status) {
    return prisma.knowledgeDocument.update({ where: { postId }, data: { sourceHash, status } })
  }
  return document
}
