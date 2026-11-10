import { getPublicBookmarks } from '~~/server/services/bookmarks/bookmark.service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  return ok(await getPublicBookmarks())
})
