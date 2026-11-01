import { requireAgentToken } from '../../services/agent/agent-key.service'
import { listAdminCategories, listAllAdminTags } from '../../services/taxonomy/taxonomy.service'
import { ok } from '../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAgentToken(event)
  const [categories, tags] = await Promise.all([listAdminCategories(), listAllAdminTags()])
  return ok({
    categories: categories.map(({ id, name, slug }) => ({ id, name, slug })),
    tags: tags.map(({ id, name, slug }) => ({ id, name, slug }))
  })
})
