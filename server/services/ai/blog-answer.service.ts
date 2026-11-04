import { requestAiChatJson, requestAiChatStream } from './client'
import { createAiContentInsufficientError, createAiInvalidSchemaError } from './errors'
import { createArticleAnswerWriter } from './article-answer-format'
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
  const writer = createArticleAnswerWriter(options.onDelta)
  const rawAnswer = await requestAiChatStream({
    failureMessage: 'AI 问答生成失败',
    messages: [
      { role: 'system', content: `${settings.systemPrompt}\n\n当前为文章流式对话。此模式的输出格式以本条为准：直接输出 Markdown 回答正文，禁止使用 JSON 外壳。根据来源编号在对应句末插入 [ref:编号]。` },
      { role: 'user', content: buildBlogAnswerStreamPrompt(question, sources) }
    ],
    temperature: 0.2,
    signal: options.signal,
    onDelta: writer.push
  })
  const answer = await writer.finish(rawAnswer)
  if (!answer) throw createAiInvalidSchemaError('AI 返回的回答格式异常，请重试')
  return answer
}
