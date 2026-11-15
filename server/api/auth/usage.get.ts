import { getAiQuota } from '~~/server/services/ai/usage-ledger.service'
import { getKnowledgeRuntimeSettings } from '~~/server/services/settings/settings.service'
import { requireUser } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { dailyUserLimit } = await getKnowledgeRuntimeSettings()
  const identity = { userId: user.id }
  const [lab, article] = await Promise.all([
    getAiQuota(identity, false, user.role === 'ADMIN' ? null : dailyUserLimit),
    getAiQuota(identity, true, dailyUserLimit)
  ])
  return ok({ lab, article })
})
