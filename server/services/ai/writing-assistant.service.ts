import { requestAiChatJson } from './client'
import { parseWritingAssistantResult } from './parsers'
import { buildWritingAssistantPrompt } from './prompts'
import type { SummaryPost, WritingAssistantOption, WritingAssistantResult } from './types'

export async function generateWritingAssistant(
  post: SummaryPost,
  options: { categories: WritingAssistantOption[], tags: WritingAssistantOption[] }
): Promise<WritingAssistantResult> {
  const input = buildWritingAssistantPrompt(post, options)
  const text = await requestAiChatJson({
    failureMessage: 'AI 写作分析失败',
    messages: [
      {
        role: 'system',
        content: '你是中文博客写作编辑助手。你只能根据文章内容和给定分类标签给出建议，必须返回严格 JSON。'
      },
      {
        role: 'user',
        content: input
      }
    ],
    temperature: 0.2
  })

  return parseWritingAssistantResult(text, options)
}
