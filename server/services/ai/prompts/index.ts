import type { RelatedCandidatePost, RelatedCurrentPost } from '~~/server/services/related-posts/candidate.service'
import type { SeoRuleCheckResult } from '~~/server/services/seo-check/seo-check.service'
import type { BlogAnswerSource, SummaryPost, WritingAssistantOption } from '../types'

const maxContentLength = 12000

export function buildSummaryPrompt(post: SummaryPost) {
  const tags = post.tags?.map((tag) => tag.name).filter(Boolean).join('、') || '无'
  const category = post.category?.name || '未分类'
  const cleanContent = cleanMarkdown(post.content).slice(0, maxContentLength)

  return [
    '你是博客文章摘要助手。请只根据给定文章内容总结，不要编造文章没有的信息。',
    '请用中文输出，并返回严格 JSON，不要包裹 Markdown 代码块。',
    'JSON 结构必须是：',
    '{"summary":"不超过180字的摘要","highlights":["要点1","要点2","要点3"],"audience":"适合哪些读者","questions":["延伸问题1","延伸问题2","延伸问题3"]}',
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

export function buildSeoMetaPrompt(post: SummaryPost) {
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

export function buildRelatedPostsPrompt(current: RelatedCurrentPost, candidates: RelatedCandidatePost[]) {
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

export function buildWritingAssistantPrompt(post: SummaryPost, options: { categories: WritingAssistantOption[], tags: WritingAssistantOption[] }) {
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

export function buildSeoCheckPrompt(post: SummaryPost & { seoTitle?: string | null, seoDescription?: string | null }, ruleResult: SeoRuleCheckResult) {
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

export function buildBlogAnswerPrompt(question: string, sources: BlogAnswerSource[]) {
  const sourceText = sources.map((source) => {
    return [
      `[来源 ${source.sourceId}]`,
      `title: ${source.title}`,
      `slug: ${source.slug}`,
      `heading: ${source.headingPath || '文章片段'}`,
      `content: ${cleanMarkdown(source.excerpt).slice(0, 900)}`
    ].join('\n')
  }).join('\n\n---\n\n')

  return [
    '请基于下面提供的知识库片段回答用户问题。',
    '要求：',
    '1. 只能使用提供的知识库片段，不要使用外部知识补充。',
    '2. 如果片段中没有足够依据，请明确说明“当前知识库中没有找到足够依据”。',
    '3. 不要编造文章标题、链接、来源编号或片段中没有的结论。',
    '4. 回答用中文，结构清晰，控制在 600 字以内。',
    '5. citationIds 只能填写用到的来源编号，最多 5 个。',
    '6. 返回严格 JSON，不要包裹 Markdown 代码块。',
    'JSON 结构必须是：{"answer":"回答内容","citationIds":[1,2]}',
    '',
    `用户问题：${question}`,
    '',
    '知识库片段：',
    sourceText
  ].join('\n')
}

function cleanMarkdown(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
