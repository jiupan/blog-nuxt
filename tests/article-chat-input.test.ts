import { createApp, defineEventHandler, readBody, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import { parseArticleChatInput } from '../server/services/article-chat/article-chat.schema'

// Exercise H3 serialization: an uncaught ZodError was becoming a generic HTTP 500.
const handler = toWebHandler(createApp().use(defineEventHandler(async event => {
  return parseArticleChatInput(await readBody(event))
})))
const request = (body: unknown) => handler(new Request('https://blog.example/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}))

describe('article chat input errors', () => {
  it.each([
    ['', '问题至少需要 2 个字'],
    ['好', '问题至少需要 2 个字'],
    ['  好  ', '问题至少需要 2 个字'],
    ['问'.repeat(301), '问题不能超过 300 个字']
  ])('returns HTTP 400 with a useful message for invalid question length', async (message, expected) => {
    const response = await request({ message })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: { code: 'VALIDATION_ERROR', message: expected, issues: [{ path: ['message'] }] }
    })
  })

  it.each([null, -1, 0, '1', 1.5])('rejects invalid conversation ID %s with HTTP 400', async conversationId => {
    const response = await request({ message: '继续解释', conversationId })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ data: { code: 'VALIDATION_ERROR' } })
  })

  it.each([null, {}, { message: 123 }])('rejects malformed request bodies with HTTP 400', async body => {
    expect((await request(body)).status).toBe(400)
  })

  it('accepts a first question and trims whitespace', async () => {
    const response = await request({ message: '  这篇文章讲了什么？  ' })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ message: '这篇文章讲了什么？' })
  })

  it('preserves the conversation ID and accepts the upper length boundary', () => {
    expect(parseArticleChatInput({ message: '问'.repeat(300), conversationId: 6 })).toEqual({
      message: '问'.repeat(300), conversationId: 6
    })
  })
})
