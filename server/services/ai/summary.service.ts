import { requestAiChatJson } from './client'
import { parseSummaryResult } from './parsers'
import { buildSummaryPrompt } from './prompts'
import type { PostSummaryResult, SummaryPost } from './types'

export async function generatePostSummary(post: SummaryPost): Promise<PostSummaryResult> {
  const input = buildSummaryPrompt(post)
  const text = await requestAiChatJson({
    failureMessage: 'AI 摘要生成失败',
    messages: [
      {
        role: 'system',
        content: '你是严谨的中文博客文章摘要助手。只能根据用户提供的文章内容总结，必须返回严格 JSON。'
      },
      {
        role: 'user',
        content: input
      }
    ],
    temperature: 0.2
  })

  return parseSummaryResult(text)
}
