import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)
const nonEmptyStringList = z.array(nonEmptyString).min(1)
const positiveInteger = z.coerce.number().int().positive()

export const aiSummarySchema = z.object({
  summary: nonEmptyString,
  highlights: nonEmptyStringList,
  audience: nonEmptyString,
  questions: nonEmptyStringList
})

export const aiSeoMetaSchema = z.object({
  seoTitle: nonEmptyString,
  seoDescription: nonEmptyString
})

export const aiRelatedPostTypeSchema = z.enum([
  'PREREQUISITE',
  'EXTENSION',
  'SAME_TOPIC',
  'PRACTICE',
  'BACKGROUND'
])

export const aiRelatedPostsSchema = z.object({
  items: z.array(z.object({
    postId: positiveInteger,
    type: aiRelatedPostTypeSchema,
    reason: nonEmptyString
  })).min(1)
})

export const aiWritingAssistantSchema = z.object({
  summary: nonEmptyString,
  seoTitle: nonEmptyString,
  seoDescription: nonEmptyString,
  suggestedCategoryIds: z.array(positiveInteger).default([]),
  suggestedTagIds: z.array(positiveInteger).default([]),
  completionScore: z.coerce.number(),
  missingPoints: z.array(nonEmptyString).default([]),
  titleSuggestions: z.array(nonEmptyString).default([]),
  writingAdvice: z.array(nonEmptyString).default([])
})

export const aiSeoCheckAdviceSchema = z.object({
  seoTitle: nonEmptyString,
  seoDescription: nonEmptyString,
  fixes: nonEmptyStringList,
  keywordSuggestions: z.array(nonEmptyString).default([])
})

export const aiBlogAnswerSchema = z.object({
  answer: nonEmptyString,
  citationIds: z.array(positiveInteger).default([])
})

export type AiSummaryOutput = z.infer<typeof aiSummarySchema>
export type AiSeoMetaOutput = z.infer<typeof aiSeoMetaSchema>
export type AiRelatedPostsOutput = z.infer<typeof aiRelatedPostsSchema>
export type AiWritingAssistantOutput = z.infer<typeof aiWritingAssistantSchema>
export type AiSeoCheckAdviceOutput = z.infer<typeof aiSeoCheckAdviceSchema>
export type AiBlogAnswerOutput = z.infer<typeof aiBlogAnswerSchema>
