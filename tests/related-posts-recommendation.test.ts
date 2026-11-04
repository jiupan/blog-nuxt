import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recommendRelatedPosts } from '../server/services/related-posts/recommendation.service'

const { buildCandidates, generate } = vi.hoisted(() => ({
  buildCandidates: vi.fn(),
  generate: vi.fn()
}))

vi.mock('../server/services/related-posts/candidate.service', () => ({
  buildRelatedPostCandidates: buildCandidates
}))
vi.mock('../server/services/ai/related-posts-ai.service', () => ({ generateRelatedPosts: generate }))
vi.mock('~~/server/utils/prisma', () => ({ prisma: {} }))
vi.mock('~~/server/utils/api-error', () => import('../server/utils/api-error'))

const input = { postId: 1, title: 'Current post', content: 'Example content' }
const current = { title: input.title, contentExcerpt: input.content, tagNames: [] }
const candidate = { postId: 2, title: 'Candidate', slug: 'candidate', tagNames: [], viewCount: 0, score: 1 }

beforeEach(() => {
  vi.resetAllMocks()
  buildCandidates.mockResolvedValue({ current, candidates: [candidate] })
})

describe('related post recommendations', () => {
  it('returns the validated candidate and preserves the response fields', async () => {
    generate.mockResolvedValue({
      items: [
        { postId: 2, type: 'SAME_TOPIC', reason: ' Shared topic ' },
        { postId: 2, type: 'SAME_TOPIC', reason: 'Duplicate' },
        { postId: 3, type: 'SAME_TOPIC', reason: 'Outside the candidates' }
      ]
    })

    const result = await recommendRelatedPosts(input)

    expect(buildCandidates).toHaveBeenCalledWith(input)
    expect(generate).toHaveBeenCalledWith(current, [candidate])
    expect(result).toMatchObject({
      items: [{ relatedPostId: 2, postId: 2, title: 'Candidate', reason: 'Shared topic', source: 'AI', sort: 0 }],
      candidateCount: 1
    })
  })

  it('returns 400 without calling AI when there are no published candidates', async () => {
    buildCandidates.mockResolvedValue({ current, candidates: [] })

    await expect(recommendRelatedPosts(input)).rejects.toMatchObject({
      statusCode: 400, data: { code: 'BAD_REQUEST' }
    })
    expect(generate).not.toHaveBeenCalled()
  })

  it('returns 502 when none of the AI results pass candidate validation', async () => {
    generate.mockResolvedValue({ items: [{ postId: 3, type: 'SAME_TOPIC', reason: 'Unknown candidate' }] })

    await expect(recommendRelatedPosts(input)).rejects.toMatchObject({
      statusCode: 502, data: { code: 'AI_RESPONSE_INVALID_SCHEMA' }
    })
  })
})
