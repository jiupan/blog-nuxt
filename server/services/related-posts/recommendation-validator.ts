import type { RelatedCandidatePost } from './candidate.service'
import { relationTypes, type RelationType } from './relation.service'

export type AiRelatedPostItem = {
  postId: number
  type: RelationType
  reason: string
}

export function validateRelatedPostRecommendations(items: AiRelatedPostItem[], candidates: RelatedCandidatePost[], currentPostId?: number) {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.postId, candidate]))
  const seen = new Set<number>()
  const validTypes = new Set<string>(relationTypes)

  return items
    .map((item) => ({
      postId: Number(item.postId),
      type: String(item.type || '').trim() as RelationType,
      reason: String(item.reason || '').trim().slice(0, 160)
    }))
    .filter((item) => {
      if (!candidateMap.has(item.postId)) return false
      if (item.postId === currentPostId) return false
      if (seen.has(item.postId)) return false
      if (!validTypes.has(item.type)) return false
      if (!item.reason) return false

      seen.add(item.postId)
      return true
    })
    .slice(0, 6)
    .map((item, index) => {
      const candidate = candidateMap.get(item.postId)!
      return {
        relatedPostId: item.postId,
        postId: item.postId,
        title: candidate.title,
        slug: candidate.slug,
        summary: candidate.summary,
        categoryName: candidate.categoryName,
        tagNames: candidate.tagNames,
        type: item.type,
        reason: item.reason,
        source: 'AI' as const,
        sort: index
      }
    })
}
