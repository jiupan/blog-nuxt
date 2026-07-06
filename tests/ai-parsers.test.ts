import { describe, expect, it } from 'vitest'
import { AI_ERROR_CODES } from '../server/services/ai/errors'
import {
  parseBlogAnswerResult,
  parseRelatedPostsResult,
  parseSeoCheckAdviceResult,
  parseSeoMetaResult,
  parseSummaryResult,
  parseWritingAssistantResult
} from '../server/services/ai/parsers'

function expectAiError(error: unknown, code: string, statusMessage: string) {
  expect(error).toMatchObject({
    statusCode: 502,
    statusMessage,
    data: {
      code,
      message: statusMessage
    }
  })
}

describe('AI parser success paths', () => {
  it('parses fenced summary JSON and limits long lists', () => {
    const result = parseSummaryResult([
      '```json',
      '{',
      '  "summary": "文章摘要",',
      '  "highlights": ["a", "b", "c", "d", "e", "f"],',
      '  "audience": "前端开发者",',
      '  "questions": ["q1", "q2", "q3", "q4", "q5", "q6"]',
      '}',
      '```'
    ].join('\n'))

    expect(result).toEqual({
      summary: '文章摘要',
      highlights: ['a', 'b', 'c', 'd', 'e'],
      audience: '前端开发者',
      questions: ['q1', 'q2', 'q3', 'q4', 'q5']
    })
  })

  it('parses SEO meta JSON', () => {
    expect(parseSeoMetaResult(JSON.stringify({
      seoTitle: 'Nuxt 架构治理',
      seoDescription: '一篇关于 Nuxt 项目架构治理的文章'
    }))).toEqual({
      seoTitle: 'Nuxt 架构治理',
      seoDescription: '一篇关于 Nuxt 项目架构治理的文章'
    })
  })

  it('parses related posts and coerces positive integer IDs', () => {
    expect(parseRelatedPostsResult(JSON.stringify({
      items: [
        { postId: '12', type: 'SAME_TOPIC', reason: '主题相同' },
        { postId: 13, type: 'PRACTICE', reason: '实践延伸' }
      ]
    }))).toEqual({
      items: [
        { postId: 12, type: 'SAME_TOPIC', reason: '主题相同' },
        { postId: 13, type: 'PRACTICE', reason: '实践延伸' }
      ]
    })
  })

  it('normalizes writing assistant IDs, scores and list fields', () => {
    const result = parseWritingAssistantResult(JSON.stringify({
      summary: '补全摘要',
      seoTitle: 'SEO 标题',
      seoDescription: 'SEO 描述',
      suggestedCategoryIds: ['2', 99, 3],
      suggestedTagIds: ['1', 2, 3, 4, 5, 6],
      completionScore: 103.4,
      missingPoints: ['缺少结论', '缺少案例'],
      titleSuggestions: ['标题 1', '标题 2', '标题 3', '标题 4', '标题 5', '标题 6'],
      writingAdvice: ['建议 1', '建议 2', '建议 3', '建议 4', '建议 5', '建议 6']
    }), {
      categories: [{ id: 2, name: '前端' }, { id: 3, name: '后端' }],
      tags: [{ id: 1, name: 'Nuxt' }, { id: 2, name: 'Vue' }, { id: 3, name: 'AI' }, { id: 4, name: 'SEO' }, { id: 5, name: '架构' }]
    })

    expect(result).toEqual({
      summary: '补全摘要',
      seoTitle: 'SEO 标题',
      seoDescription: 'SEO 描述',
      suggestedCategoryIds: [2],
      suggestedTagIds: [1, 2, 3, 4, 5],
      completionScore: 100,
      missingPoints: ['缺少结论', '缺少案例'],
      titleSuggestions: ['标题 1', '标题 2', '标题 3', '标题 4', '标题 5'],
      writingAdvice: ['建议 1', '建议 2', '建议 3', '建议 4', '建议 5']
    })
  })

  it('parses SEO check advice and limits fixes', () => {
    const result = parseSeoCheckAdviceResult(JSON.stringify({
      seoTitle: '优化后的标题',
      seoDescription: '优化后的描述',
      fixes: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'],
      keywordSuggestions: ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9']
    }))

    expect(result.fixes).toEqual(['f1', 'f2', 'f3', 'f4', 'f5', 'f6'])
    expect(result.keywordSuggestions).toEqual(['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8'])
  })

  it('filters blog answer citations to available sources', () => {
    const result = parseBlogAnswerResult(JSON.stringify({
      answer: '可以从这些文章开始。',
      citationIds: [1, '2', 99, 2, 3, 4, 5, 6]
    }), [
      { sourceId: 1, title: 'A', slug: 'a', excerpt: 'a' },
      { sourceId: 2, title: 'B', slug: 'b', excerpt: 'b' },
      { sourceId: 3, title: 'C', slug: 'c', excerpt: 'c' },
      { sourceId: 4, title: 'D', slug: 'd', excerpt: 'd' },
      { sourceId: 5, title: 'E', slug: 'e', excerpt: 'e' },
      { sourceId: 6, title: 'F', slug: 'f', excerpt: 'f' }
    ])

    expect(result).toEqual({
      answer: '可以从这些文章开始。',
      citationIds: [1, 2, 2, 3, 4]
    })
  })
})

describe('AI parser failure paths', () => {
  it('throws a stable invalid JSON error for non-JSON output', () => {
    expect(() => parseSummaryResult('not json')).toThrowError(expect.objectContaining({
      data: expect.objectContaining({
        code: AI_ERROR_CODES.RESPONSE_INVALID_JSON
      })
    }))
  })

  it('throws an invalid schema error when required fields are missing', () => {
    try {
      parseSeoMetaResult(JSON.stringify({ seoTitle: '只有标题' }))
      throw new Error('Expected parser to throw')
    } catch (error) {
      expectAiError(error, AI_ERROR_CODES.RESPONSE_INVALID_SCHEMA, 'AI 返回 SEO 信息不完整')
    }
  })

  it('rejects related post items with unsupported relation types', () => {
    try {
      parseRelatedPostsResult(JSON.stringify({
        items: [{ postId: 1, type: 'UNKNOWN', reason: 'bad' }]
      }))
      throw new Error('Expected parser to throw')
    } catch (error) {
      expectAiError(error, AI_ERROR_CODES.RESPONSE_INVALID_SCHEMA, 'AI 没有返回可用的关联文章')
    }
  })

  it('rejects writing assistant arrays with invalid item shapes', () => {
    try {
      parseWritingAssistantResult(JSON.stringify({
        summary: '补全摘要',
        seoTitle: 'SEO 标题',
        seoDescription: 'SEO 描述',
        suggestedCategoryIds: ['bad'],
        suggestedTagIds: [1],
        completionScore: 80,
        missingPoints: ['缺少结论'],
        titleSuggestions: ['标题'],
        writingAdvice: ['建议']
      }), {
        categories: [{ id: 1, name: '前端' }],
        tags: [{ id: 1, name: 'Nuxt' }]
      })
      throw new Error('Expected parser to throw')
    } catch (error) {
      expectAiError(error, AI_ERROR_CODES.RESPONSE_INVALID_SCHEMA, 'AI 返回写作建议字段不完整')
    }
  })
})
