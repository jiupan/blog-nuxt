import { requestAiChatJson } from './client'
import { createAiContentInsufficientError } from './errors'
import { parseBlogAnswerResult } from './parsers'
import { buildBlogAnswerPrompt } from './prompts'
import type { BlogAnswerResult, BlogAnswerSource } from './types'

export async function generateBlogAnswer(question: string, sources: BlogAnswerSource[]): Promise<BlogAnswerResult> {
  if (!sources.length) {
    throw createAiContentInsufficientError('没有可用于回答的站内内容')
  }

  const input = buildBlogAnswerPrompt(question, sources)
  const text = await requestAiChatJson({
    failureMessage: 'AI 问答生成失败',
    messages: [
      {
        role: 'system',
        content: '你是个人博客的站内问答助手。你只能根据提供的博客片段回答，必须返回严格 JSON。'
      },
      {
        role: 'user',
        content: input
      }
    ],
    temperature: 0.2
  })

  return parseBlogAnswerResult(text, sources)
}
