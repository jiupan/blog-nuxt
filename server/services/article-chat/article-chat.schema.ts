import { z } from 'zod'
import { validationError } from '../../utils/api-error'

export const articleChatInputSchema = z.object({
  conversationId: z.number().int().positive().optional(),
  message: z.string().trim().min(2, '问题至少需要 2 个字').max(300, '问题不能超过 300 个字')
})

export function parseArticleChatInput(value: unknown) {
  const parsed = articleChatInputSchema.safeParse(value)
  if (!parsed.success) {
    throw validationError(parsed.error.issues[0]?.message || '对话参数不正确', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message }))
    })
  }
  return parsed.data
}
