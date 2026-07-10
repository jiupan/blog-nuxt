import { z } from 'zod'
import { requireLabUser, withAiUsage } from '~~/server/utils/ai-usage'
import { ok } from '~~/server/utils/response'
import { askBlog } from '~~/server/services/rag/ask.service'
import { prisma } from '~~/server/utils/prisma'

const bodySchema = z.object({
  question: z.string().trim().min(5, '问题至少需要 5 个字').max(300, '问题不能超过 300 个字')
})

export default defineEventHandler(async (event) => {
  const body = bodySchema.parse(await readBody(event))
  const user = await requireLabUser(event)
  const startedAt = performance.now()
  try {
    const result = await withAiUsage(event, 'ask-blog', () => askBlog(body.question))
    await prisma.ragQueryLog.create({
      data: {
        userId: user.id,
        question: body.question,
        answer: result.answer,
        status: result.citations.length ? 'SUCCESS' : 'NO_KNOWLEDGE',
        citations: result.citations,
        durationMs: Math.round(performance.now() - startedAt)
      }
    })
    return ok(result)
  } catch (error) {
    await prisma.ragQueryLog.create({
      data: {
        userId: user.id,
        question: body.question,
        status: 'FAILED',
        durationMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message.slice(0, 2000) : '未知错误'
      }
    }).catch(() => null)
    throw error
  }
})
