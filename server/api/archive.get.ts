import { parseRequest } from '~~/server/utils/api-error'
import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { listPublicArchive, publicArchiveQuerySchema } from '~~/server/services/posts/post-query.service'

export default defineEventHandler(async (event) => {
  const query = parseRequest(publicArchiveQuerySchema, getQuery(event))
  setCacheControl(event, 'public-content')
  return ok(await listPublicArchive(query))
})
