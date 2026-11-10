import { getAdminBookmarks } from '~~/server/services/bookmarks/bookmark.service'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return ok(await getAdminBookmarks())
})
