import { z } from 'zod'
import { collectBookmarkIcon, proposeBookmarkNote } from '../../../services/bookmarks/bookmark-enrichment.service'
import { publicResourceUrl } from '../../../services/bookmarks/public-resource'
import { badRequest, parseRequest } from '../../../utils/api-error'
import { requireAdmin } from '../../../utils/auth'
import { ok } from '../../../utils/response'

const schema = z.strictObject({
  url: z.string().trim().max(2048).regex(/^https?:\/\//i, '请输入有效的 HTTP 或 HTTPS 网址'),
  field: z.enum(['avatar', 'note'])
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = parseRequest(schema, await readBody(event))
  let url: URL
  try { url = publicResourceUrl(body.url) } catch (error) {
    if (error instanceof TypeError) throw badRequest('请输入有效的 HTTP 或 HTTPS 网址')
    throw error
  }
  const value = body.field === 'avatar' ? await collectBookmarkIcon(url) : await proposeBookmarkNote(url)
  return ok({ value })
})
