import type { RelatedCandidatePost, RelatedCurrentPost } from '~~/server/services/related-posts/candidate.service'
import { requestAiChatJson } from './client'
import { createAiContentInsufficientError } from './errors'
import { parseRelatedPostsResult } from './parsers'
import { buildRelatedPostsPrompt } from './prompts'
import type { RelatedPostsResult } from './types'

export async function generateRelatedPosts(current: RelatedCurrentPost, candidates: RelatedCandidatePost[]): Promise<RelatedPostsResult> {
  if (!candidates.length) {
    throw createAiContentInsufficientError('没有可推荐的候选文章')
  }

  const input = buildRelatedPostsPrompt(current, candidates)
  const text = await requestAiChatJson({
    failureMessage: 'AI 关联文章推荐失败',
    messages: [
      {
        role: 'system',
        content: '你是中文博客内容编辑助手。你只能从候选文章中选择相关推荐，必须返回严格 JSON。'
      },
      {
        role: 'user',
        content: input
      }
    ],
    temperature: 0.2
  })

  return parseRelatedPostsResult(text)
}
