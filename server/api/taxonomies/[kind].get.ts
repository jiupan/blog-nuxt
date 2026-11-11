import { z } from 'zod'
import { getTaxonomyOverview } from '../../services/taxonomy/taxonomy-overview.service'
import { setCacheControl } from '../../utils/cache-control'
import { ok } from '../../utils/response'

export default defineEventHandler(async (event) => {
  const { kind } = await getValidatedRouterParams(event, z.object({ kind: z.enum(['categories', 'tags']) }).parse)
  setCacheControl(event, 'public-navigation')
  return ok(await getTaxonomyOverview(kind))
})
