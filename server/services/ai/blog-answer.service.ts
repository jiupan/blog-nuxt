import { requestAiChatJson, requestAiChatStream } from './client'
import { createAiContentInsufficientError } from './errors'
import { parseBlogAnswerResult } from './parsers'
import { buildBlogAnswerPrompt, buildBlogAnswerStreamPrompt } from './prompts'
import type { BlogAnswerResult, BlogAnswerSource } from './types'
import { getKnowledgeRuntimeSettings } from '~~/server/services/settings/settings.service'

export async function generateBlogAnswer(question: string, sources: BlogAnswerSource[]): Promise<BlogAnswerResult> {
  if (!sources.length) {
    throw createAiContentInsufficientError('没有可用于回答的站内内容')
  }

  const input = buildBlogAnswerPrompt(question, sources)
  const settings = await getKnowledgeRuntimeSettings()
  const text = await requestAiChatJson({
    failureMessage: 'AI 问答生成失败',
    messages: [
      {
        role: 'system',
        content: settings.systemPrompt
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

export async function generateBlogAnswerStream(
  question: string,
  sources: BlogAnswerSource[],
  options: { signal?: AbortSignal, onDelta: (text: string) => void | Promise<void> }
) {
  if (!sources.length) throw createAiContentInsufficientError('没有可用于回答的站内内容')
  const settings = await getKnowledgeRuntimeSettings()
  return requestAiChatStream({
    failureMessage: 'AI 问答生成失败',
    messages: [
      { role: 'system', content: settings.systemPrompt },
      { role: 'user', content: buildBlogAnswerStreamPrompt(question, sources) }
    ],
    temperature: 0.2,
    signal: options.signal,
    onDelta: options.onDelta
  })
}
