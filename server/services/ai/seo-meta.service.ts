import { requestAiChatJson } from './client'
import { parseSeoMetaResult } from './parsers'
import { buildSeoMetaPrompt } from './prompts'
import type { SeoMetaResult, SummaryPost } from './types'

export async function generateSeoMeta(post: SummaryPost): Promise<SeoMetaResult> {
  const input = buildSeoMetaPrompt(post)
  const text = await requestAiChatJson({
    failureMessage: 'AI SEO 信息生成失败',
    messages: [
      {
        role: 'system',
        content: '你是中文技术博客 SEO 助手。只能根据用户提供的文章内容生成 SEO 标题和描述，必须返回严格 JSON。'
      },
      {
        role: 'user',
        content: input
      }
    ],
    temperature: 0.2
  })

  return parseSeoMetaResult(text)
}

export async function generateSeoDescription(post: SummaryPost): Promise<{ seoDescription: string }> {
  const result = await generateSeoMeta(post)
  return { seoDescription: result.seoDescription }
}
