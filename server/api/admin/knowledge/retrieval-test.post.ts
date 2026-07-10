import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { searchPostChunks } from '~~/server/services/rag/retrieval.service'
import { askBlog } from '~~/server/services/rag/ask.service'

const schema = z.object({
  query: z.string().trim().min(2).max(300),
  topK: z.number().int().min(1).max(40).default(10),
  generateAnswer: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = schema.parse(await readBody(event))
  const startedAt = performance.now()
  const results = await searchPostChunks({ query: body.query, limit: body.topK })
  const retrievalMs = Math.round(performance.now() - startedAt)
  const answerStartedAt = performance.now()
  const answer = body.generateAnswer ? await askBlog(body.query) : null
  const modelMs = body.generateAnswer ? Math.round(performance.now() - answerStartedAt) : 0
  return ok({ results, answer, metrics: { retrievalMs, modelMs, durationMs: retrievalMs + modelMs } })
})
