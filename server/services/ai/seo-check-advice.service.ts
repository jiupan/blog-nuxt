import type { SeoRuleCheckResult } from '~~/server/services/seo-check/seo-check.service'
import { requestAiChatJson } from './client'
import { parseSeoCheckAdviceResult } from './parsers'
import { buildSeoCheckPrompt } from './prompts'
import type { SeoCheckAdviceResult, SummaryPost } from './types'

export async function generateSeoCheckAdvice(
  post: SummaryPost & { seoTitle?: string | null, seoDescription?: string | null },
  ruleResult: SeoRuleCheckResult
): Promise<SeoCheckAdviceResult> {
  const input = buildSeoCheckPrompt(post, ruleResult)
  const text = await requestAiChatJson({
    failureMessage: 'AI SEO 检查失败',
    messages: [
      {
        role: 'system',
        content: '你是中文博客 SEO 检查助手。你只能根据文章内容和规则检查结果给出优化建议，必须返回严格 JSON。'
      },
      {
        role: 'user',
        content: input
      }
    ],
    temperature: 0.2
  })

  return parseSeoCheckAdviceResult(text)
}
