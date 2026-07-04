import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { getCurrentMonth, getMonthlyReview } from '~~/server/services/monthly-review/monthly-review.service'

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const query = querySchema.parse(getQuery(event))
  const result = await getMonthlyReview(query.month || getCurrentMonth())

  return ok(result)
})
