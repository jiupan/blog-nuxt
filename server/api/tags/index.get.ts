import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { listPublicTags } from '~~/server/services/taxonomy/taxonomy.service'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'public-navigation')
  return ok(await listPublicTags())
})
