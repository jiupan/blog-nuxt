import { prisma } from '~~/server/utils/prisma'
import type { RelatedCandidatePost, RelatedCurrentPost } from '~~/server/services/related-posts/candidate.service'
import type { AiRelatedPostItem } from '~~/server/services/related-posts/recommendation-validator'
import type { SeoRuleCheckResult } from '~~/server/services/seo-check/seo-check.service'

type SummaryPost = {
  title: string
  summary?: string | null
  content: string
  category?: {
    name: string
  } | null
  tags?: Array<{
    name: string
  }>
}

export type PostSummaryResult = {
  summary: string
  highlights: string[]
  audience: string
  questions: string[]
}

export type SeoMetaResult = {
  seoTitle: string
  seoDescription: string
}

export type RelatedPostsResult = {
  items: AiRelatedPostItem[]
}

export type WritingAssistantOption = {
  id: number
  name: string
}

export type WritingAssistantResult = {
  summary: string
  seoTitle: string
  seoDescription: string
  suggestedCategoryIds: number[]
  suggestedTagIds: number[]
  completionScore: number
  missingPoints: string[]
  titleSuggestions: string[]
  writingAdvice: string[]
}

export type SeoCheckAdviceResult = {
  seoTitle: string
  seoDescription: string
  fixes: string[]
  keywordSuggestions: string[]
}

const maxContentLength = 12000

export async function generatePostSummary(post: SummaryPost): Promise<PostSummaryResult> {
  const aiConfig = await resolveAiConfig()

  if (!aiConfig.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置 AI API Key'
    })
  }

  const input = buildSummaryPrompt(post)
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.model,
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
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || 'AI 摘要生成失败'
    throw createError({
      statusCode: response.status,
      statusMessage: message
    })
  }

  return parseSummaryResult(extractChatCompletionText(payload))
}

export async function generateSeoMeta(post: SummaryPost): Promise<SeoMetaResult> {
  const aiConfig = await resolveAiConfig()

  if (!aiConfig.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置 AI API Key'
    })
  }

  const input = buildSeoMetaPrompt(post)
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.model,
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
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || 'AI SEO 信息生成失败'
    throw createError({
      statusCode: response.status,
      statusMessage: message
    })
  }

  return parseSeoMetaResult(extractChatCompletionText(payload))
}

export async function generateSeoDescription(post: SummaryPost): Promise<{ seoDescription: string }> {
  const result = await generateSeoMeta(post)
  return { seoDescription: result.seoDescription }
}

export async function generateRelatedPosts(current: RelatedCurrentPost, candidates: RelatedCandidatePost[]): Promise<RelatedPostsResult> {
  const aiConfig = await resolveAiConfig()

  if (!aiConfig.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置 AI API Key'
    })
  }

  if (!candidates.length) {
    throw createError({
      statusCode: 400,
      statusMessage: '没有可推荐的候选文章'
    })
  }

  const input = buildRelatedPostsPrompt(current, candidates)
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.model,
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
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || 'AI 关联文章推荐失败'
    throw createError({
      statusCode: response.status,
      statusMessage: message
    })
  }

  return parseRelatedPostsResult(extractChatCompletionText(payload))
}

export async function generateWritingAssistant(
  post: SummaryPost,
  options: { categories: WritingAssistantOption[], tags: WritingAssistantOption[] }
): Promise<WritingAssistantResult> {
  const aiConfig = await resolveAiConfig()

  if (!aiConfig.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置 AI API Key'
    })
  }

  const input = buildWritingAssistantPrompt(post, options)
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.model,
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
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || 'AI 写作分析失败'
    throw createError({
      statusCode: response.status,
      statusMessage: message
    })
  }

  return parseWritingAssistantResult(extractChatCompletionText(payload), options)
}

export async function generateSeoCheckAdvice(post: SummaryPost & { seoTitle?: string | null, seoDescription?: string | null }, ruleResult: SeoRuleCheckResult): Promise<SeoCheckAdviceResult> {
  const aiConfig = await resolveAiConfig()

  if (!aiConfig.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置 AI API Key'
    })
  }

  const input = buildSeoCheckPrompt(post, ruleResult)
  const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${aiConfig.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: aiConfig.model,
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
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error?.message || 'AI SEO 检查失败'
    throw createError({
      statusCode: response.status,
      statusMessage: message
    })
  }

  return parseSeoCheckAdviceResult(extractChatCompletionText(payload))
}

async function resolveAiConfig() {
  const config = useRuntimeConfig()
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: ['ai_api_key', 'ai_base_url', 'ai_model']
      }
    }
  })
  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]))
  const envBaseUrl = process.env.AI_BASE_URL
  const envModel = process.env.AI_MODEL

  return {
    apiKey: String(config.aiApiKey || settings.ai_api_key || '').trim(),
    baseUrl: normalizeBaseUrl(String(envBaseUrl ? config.aiBaseUrl : (settings.ai_base_url || config.aiBaseUrl)).trim()),
    model: String(envModel ? config.aiModel : (settings.ai_model || config.aiModel)).trim()
  }
}

function normalizeBaseUrl(value: string) {
  return (value || 'https://api.deepseek.com').replace(/\/+$/, '')
}

function buildSummaryPrompt(post: SummaryPost) {
  const tags = post.tags?.map((tag) => tag.name).filter(Boolean).join('、') || '无'
  const category = post.category?.name || '未分类'
  const cleanContent = cleanMarkdown(post.content).slice(0, maxContentLength)

  return [
    '你是博客文章摘要助手。请只根据给定文章内容总结，不要编造文章没有的信息。',
    '请用中文输出，并返回严格 JSON，不要包裹 Markdown 代码块。',
    'JSON 结构必须是：',
    '{"summary":"不超过120字的摘要","highlights":["要点1","要点2","要点3"],"audience":"适合哪些读者","questions":["延伸问题1","延伸问题2","延伸问题3"]}',
    '',
    `文章标题：${post.title}`,
    `已有摘要：${post.summary || '无'}`,
    `分类：${category}`,
    `标签：${tags}`,
    '',
    '文章正文：',
    cleanContent
  ].join('\n')
}

function buildSeoMetaPrompt(post: SummaryPost) {
  const tags = post.tags?.map((tag) => tag.name).filter(Boolean).join('、') || '无'
  const category = post.category?.name || '未分类'
  const cleanContent = cleanMarkdown(post.content).slice(0, maxContentLength)

  return [
    '请根据文章内容生成搜索引擎友好的中文 SEO 标题和 SEO 描述。',
    '要求：',
    '1. SEO 标题不超过 32 个中文字符，包含文章核心关键词。',
    '2. SEO 描述 80 到 160 个中文字符之间。',
    '3. 准确概括文章主题和读者收益。',
    '4. 不要夸大，不要编造文章没有的信息。',
    '5. 不要使用“本文将”这类空泛表达。',
    '6. 返回严格 JSON，不要包裹 Markdown 代码块。',
    'JSON 结构必须是：{"seoTitle":"SEO 标题","seoDescription":"SEO 描述"}',
    '',
    `文章标题：${post.title}`,
    `已有摘要：${post.summary || '无'}`,
    `分类：${category}`,
    `标签：${tags}`,
    '',
    '文章正文：',
    cleanContent
  ].join('\n')
}

function buildRelatedPostsPrompt(current: RelatedCurrentPost, candidates: RelatedCandidatePost[]) {
  const currentTags = current.tagNames.length ? current.tagNames.join('、') : '无'
  const candidateText = candidates.map((candidate) => {
    return [
      `postId: ${candidate.postId}`,
      `title: ${candidate.title}`,
      `summary: ${candidate.summary || '无'}`,
      `category: ${candidate.categoryName || '未分类'}`,
      `tags: ${candidate.tagNames.length ? candidate.tagNames.join('、') : '无'}`,
      `publishedAt: ${candidate.publishedAt || '未知'}`,
      `viewCount: ${candidate.viewCount}`,
      `ruleScore: ${candidate.score}`
    ].join('\n')
  }).join('\n---\n')

  return [
    '请从候选文章中选择 3-6 篇最适合作为当前文章“继续阅读”的文章，并生成排序、推荐类型和推荐理由。',
    '要求：',
    '1. 只能从候选文章里选择，不能编造 postId。',
    '2. 不要选择和当前文章重复的文章。',
    '3. 推荐理由要具体，说明为什么适合继续阅读。',
    '4. reason 控制在 30-80 个中文字符。',
    '5. type 只能从以下枚举中选择：PREREQUISITE, EXTENSION, SAME_TOPIC, PRACTICE, BACKGROUND。',
    '6. 必须返回严格 JSON，不要包裹 Markdown 代码块。',
    'JSON 结构必须是：{"items":[{"postId":12,"type":"EXTENSION","reason":"推荐理由"}]}',
    '',
    '当前文章：',
    `title: ${current.title}`,
    `summary: ${current.summary || '无'}`,
    `category: ${current.categoryName || '未分类'}`,
    `tags: ${currentTags}`,
    `contentExcerpt: ${current.contentExcerpt}`,
    '',
    '候选文章：',
    candidateText
  ].join('\n')
}

function buildWritingAssistantPrompt(post: SummaryPost, options: { categories: WritingAssistantOption[], tags: WritingAssistantOption[] }) {
  const tags = post.tags?.map((tag) => tag.name).filter(Boolean).join('、') || '无'
  const category = post.category?.name || '未分类'
  const categoryOptions = options.categories.length
    ? options.categories.map((item) => `${item.id}:${item.name}`).join('、')
    : '无'
  const tagOptions = options.tags.length
    ? options.tags.map((item) => `${item.id}:${item.name}`).join('、')
    : '无'
  const cleanContent = cleanMarkdown(post.content).slice(0, maxContentLength)

  return [
    '请作为博客写作编辑助手分析当前文章草稿，并给出可直接应用到后台表单的建议。',
    '要求：',
    '1. 所有建议必须基于文章内容，不要编造文章没有的信息。',
    '2. summary 不超过 120 个中文字符。',
    '3. seoTitle 不超过 32 个中文字符。',
    '4. seoDescription 控制在 80 到 160 个中文字符。',
    '5. suggestedCategoryIds 只能从给定分类 ID 中选择，最多 1 个。',
    '6. suggestedTagIds 只能从给定标签 ID 中选择，最多 5 个。',
    '7. completionScore 为 0 到 100 的整数，表示文章完成度。',
    '8. missingPoints、titleSuggestions、writingAdvice 每项 2 到 5 条，句子要具体。',
    '9. 返回严格 JSON，不要包裹 Markdown 代码块。',
    'JSON 结构必须是：{"summary":"摘要","seoTitle":"SEO 标题","seoDescription":"SEO 描述","suggestedCategoryIds":[1],"suggestedTagIds":[1,2],"completionScore":80,"missingPoints":["缺少..."],"titleSuggestions":["标题建议"],"writingAdvice":["写作建议"]}',
    '',
    `当前标题：${post.title}`,
    `当前摘要：${post.summary || '无'}`,
    `当前分类：${category}`,
    `当前标签：${tags}`,
    `可选分类：${categoryOptions}`,
    `可选标签：${tagOptions}`,
    '',
    '文章正文：',
    cleanContent
  ].join('\n')
}

function buildSeoCheckPrompt(post: SummaryPost & { seoTitle?: string | null, seoDescription?: string | null }, ruleResult: SeoRuleCheckResult) {
  const tags = post.tags?.map((tag) => tag.name).filter(Boolean).join('、') || '无'
  const category = post.category?.name || '未分类'
  const cleanContent = cleanMarkdown(post.content).slice(0, maxContentLength)
  const issueText = ruleResult.issues
    .filter((issue) => issue.type !== 'success')
    .map((issue) => `${issue.title}：${issue.description}`)
    .join('\n') || '无明显规则问题'

  return [
    '请根据文章内容和规则检查结果，给出 SEO 修复建议，并生成可直接应用的 SEO 标题和描述。',
    '要求：',
    '1. 不要编造文章没有的信息。',
    '2. seoTitle 不超过 32 个中文字符。',
    '3. seoDescription 控制在 80 到 160 个中文字符。',
    '4. fixes 给出 3 到 6 条具体修复建议。',
    '5. keywordSuggestions 给出 3 到 8 个关键词或短语。',
    '6. 返回严格 JSON，不要包裹 Markdown 代码块。',
    'JSON 结构必须是：{"seoTitle":"SEO 标题","seoDescription":"SEO 描述","fixes":["建议"],"keywordSuggestions":["关键词"]}',
    '',
    `规则分数：${ruleResult.score}`,
    '规则问题：',
    issueText,
    '',
    `文章标题：${post.title}`,
    `已有摘要：${post.summary || '无'}`,
    `已有 SEO 标题：${post.seoTitle || '无'}`,
    `已有 SEO 描述：${post.seoDescription || '无'}`,
    `分类：${category}`,
    `标签：${tags}`,
    '',
    '文章正文：',
    cleanContent
  ].join('\n')
}

function cleanMarkdown(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractChatCompletionText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string' && content.trim()) {
    return content
  }

  throw createError({
    statusCode: 502,
    statusMessage: 'AI 返回内容为空'
  })
}

function parseSummaryResult(text: string): PostSummaryResult {
  const jsonText = stripJsonFence(text)

  let parsed: any

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回格式不是有效 JSON'
    })
  }

  const result = {
    summary: String(parsed.summary || '').trim(),
    highlights: normalizeStringList(parsed.highlights).slice(0, 5),
    audience: String(parsed.audience || '').trim(),
    questions: normalizeStringList(parsed.questions).slice(0, 5)
  }

  if (!result.summary || !result.highlights.length || !result.audience || !result.questions.length) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回摘要字段不完整'
    })
  }

  return result
}

function parseSeoMetaResult(text: string): SeoMetaResult {
  const jsonText = stripJsonFence(text)

  let parsed: any

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回格式不是有效 JSON'
    })
  }

  const seoTitle = String(parsed.seoTitle || '').trim()
  const seoDescription = String(parsed.seoDescription || '').trim()

  if (!seoTitle || !seoDescription) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回 SEO 信息不完整'
    })
  }

  return { seoTitle, seoDescription }
}

function parseRelatedPostsResult(text: string): RelatedPostsResult {
  const jsonText = stripJsonFence(text)

  let parsed: any

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回格式不是有效 JSON'
    })
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items.map((item: any) => ({
        postId: Number(item.postId),
        type: String(item.type || '').trim(),
        reason: String(item.reason || '').trim()
      }))
    : []

  if (!items.length) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 没有返回可用的关联文章'
    })
  }

  return { items }
}

function parseWritingAssistantResult(text: string, options: { categories: WritingAssistantOption[], tags: WritingAssistantOption[] }): WritingAssistantResult {
  const jsonText = stripJsonFence(text)

  let parsed: any

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回格式不是有效 JSON'
    })
  }

  const categoryIds = new Set(options.categories.map((item) => item.id))
  const tagIds = new Set(options.tags.map((item) => item.id))
  const result = {
    summary: String(parsed.summary || '').trim(),
    seoTitle: String(parsed.seoTitle || '').trim(),
    seoDescription: String(parsed.seoDescription || '').trim(),
    suggestedCategoryIds: normalizeNumberList(parsed.suggestedCategoryIds).filter((id) => categoryIds.has(id)).slice(0, 1),
    suggestedTagIds: normalizeNumberList(parsed.suggestedTagIds).filter((id) => tagIds.has(id)).slice(0, 5),
    completionScore: clampInteger(parsed.completionScore, 0, 100),
    missingPoints: normalizeStringList(parsed.missingPoints).slice(0, 5),
    titleSuggestions: normalizeStringList(parsed.titleSuggestions).slice(0, 5),
    writingAdvice: normalizeStringList(parsed.writingAdvice).slice(0, 5)
  }

  if (!result.summary || !result.seoTitle || !result.seoDescription) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回写作建议字段不完整'
    })
  }

  return result
}

function parseSeoCheckAdviceResult(text: string): SeoCheckAdviceResult {
  const jsonText = stripJsonFence(text)

  let parsed: any

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回格式不是有效 JSON'
    })
  }

  const seoTitle = String(parsed.seoTitle || '').trim()
  const seoDescription = String(parsed.seoDescription || '').trim()
  const fixes = normalizeStringList(parsed.fixes).slice(0, 6)
  const keywordSuggestions = normalizeStringList(parsed.keywordSuggestions).slice(0, 8)

  if (!seoTitle || !seoDescription || !fixes.length) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 返回 SEO 检查字段不完整'
    })
  }

  return { seoTitle, seoDescription, fixes, keywordSuggestions }
}

function stripJsonFence(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function normalizeNumberList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
}

function clampInteger(value: unknown, min: number, max: number) {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.round(numeric)))
}
