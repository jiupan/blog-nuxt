import { bookmarkActionSchema, mutateBookmarks } from '~~/server/services/bookmarks/bookmark.service'
import { parseRequest } from '~~/server/utils/api-error'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const input = parseRequest(bookmarkActionSchema, await readBody(event))
  return ok(await mutateBookmarks(input))
})
