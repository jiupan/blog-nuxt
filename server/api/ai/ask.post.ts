import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { askBlog } from '~~/server/services/rag/ask.service'

const bodySchema = z.object({
  question: z.string().trim().min(5, '问题至少需要 5 个字').max(300, '问题不能超过 300 个字')
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = bodySchema.parse(await readBody(event))
  const result = await askBlog(body.question)

  return ok(result)
})
