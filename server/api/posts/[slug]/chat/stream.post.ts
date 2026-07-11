import { createEventStream } from 'h3'
import { articleChatInputSchema, streamArticleChatMessage } from '~~/server/services/article-chat/article-chat.service'

export default defineEventHandler(async (event) => {
  const input = articleChatInputSchema.parse(await readBody(event))
  const stream = createEventStream(event)
  const controller = new AbortController()
  stream.onClosed(() => controller.abort())

  void (async () => {
    try {
      const result = await streamArticleChatMessage(event, String(getRouterParam(event, 'slug') || ''), input, {
        signal: controller.signal,
        onMeta: data => stream.push({ event: 'meta', data: JSON.stringify(data) }),
        onDelta: text => stream.push({ event: 'delta', data: JSON.stringify({ text }) })
      })
      await stream.push({ event: 'done', data: JSON.stringify(result) })
    } catch (error) {
      if (!controller.signal.aborted) {
        const candidate = error as { statusMessage?: string, message?: string }
        await stream.push({ event: 'error', data: JSON.stringify({ message: candidate.statusMessage || candidate.message || '回答生成失败，请稍后重试' }) })
      }
    } finally {
      await stream.close()
    }
  })()

  return stream.send()
})
