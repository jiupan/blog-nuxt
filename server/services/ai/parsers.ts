import type {
  BlogAnswerResult,
  BlogAnswerSource,
  PostSummaryResult,
  RelatedPostsResult,
  SeoCheckAdviceResult,
  SeoMetaResult,
  WritingAssistantOption,
  WritingAssistantResult
} from './types'
import {
  aiBlogAnswerSchema,
  aiRelatedPostsSchema,
  aiSeoCheckAdviceSchema,
  aiSeoMetaSchema,
  aiSummarySchema,
  aiWritingAssistantSchema
} from './schemas'
import { createAiInvalidJsonError, createAiInvalidSchemaError } from './errors'

export function parseSummaryResult(text: string): PostSummaryResult {
  const parsed = parseAiJsonWithSchema(text, aiSummarySchema, 'AI 返回摘要字段不完整')
  const result = {
    summary: parsed.summary,
    highlights: parsed.highlights.slice(0, 5),
    audience: parsed.audience,
    questions: parsed.questions.slice(0, 5)
  }

  return result
}

export function parseSeoMetaResult(text: string): SeoMetaResult {
  return parseAiJsonWithSchema(text, aiSeoMetaSchema, 'AI 返回 SEO 信息不完整')
}

export function parseRelatedPostsResult(text: string): RelatedPostsResult {
  return parseAiJsonWithSchema(text, aiRelatedPostsSchema, 'AI 没有返回可用的关联文章')
}

export function parseWritingAssistantResult(
  text: string,
  options: { categories: WritingAssistantOption[], tags: WritingAssistantOption[] }
): WritingAssistantResult {
  const parsed = parseAiJsonWithSchema(text, aiWritingAssistantSchema, 'AI 返回写作建议字段不完整')
  const categoryIds = new Set(options.categories.map((item) => item.id))
  const tagIds = new Set(options.tags.map((item) => item.id))
  const result = {
    summary: parsed.summary,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    suggestedCategoryIds: normalizeNumberList(parsed.suggestedCategoryIds).filter((id) => categoryIds.has(id)).slice(0, 1),
    suggestedTagIds: normalizeNumberList(parsed.suggestedTagIds).filter((id) => tagIds.has(id)).slice(0, 5),
    completionScore: clampInteger(parsed.completionScore, 0, 100),
    missingPoints: normalizeStringList(parsed.missingPoints).slice(0, 5),
    titleSuggestions: normalizeStringList(parsed.titleSuggestions).slice(0, 5),
    writingAdvice: normalizeStringList(parsed.writingAdvice).slice(0, 5)
  }

  return result
}

export function parseSeoCheckAdviceResult(text: string): SeoCheckAdviceResult {
  const parsed = parseAiJsonWithSchema(text, aiSeoCheckAdviceSchema, 'AI 返回 SEO 检查字段不完整')

  return {
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    fixes: parsed.fixes.slice(0, 6),
    keywordSuggestions: parsed.keywordSuggestions.slice(0, 8)
  }
}

export function parseBlogAnswerResult(text: string, sources: BlogAnswerSource[]): BlogAnswerResult {
  const parsed = parseAiJsonWithSchema(text, aiBlogAnswerSchema, 'AI 返回问答内容为空')
  const allowedIds = new Set(sources.map((source) => source.sourceId))
  const citationIds = normalizeNumberList(parsed.citationIds)
    .filter((id) => allowedIds.has(id))
    .slice(0, 5)

  return { answer: parsed.answer, citationIds }
}

function parseAiJson(text: string): unknown {
  const jsonText = stripJsonFence(text)

  try {
    return JSON.parse(jsonText)
  } catch {
    throw createAiInvalidJsonError()
  }
}

function parseAiJsonWithSchema<T>(text: string, schema: { parse: (value: unknown) => T }, invalidMessage: string): T {
  try {
    return schema.parse(parseAiJson(text))
  } catch (error) {
    if (isHttpError(error)) {
      throw error
    }

    throw createAiInvalidSchemaError(invalidMessage)
  }
}

function isHttpError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'statusCode' in error)
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
