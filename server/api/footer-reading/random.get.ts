import { getRandomFooterPost } from '~~/server/services/posts/footer-reading.service'
import { setCacheControl } from '~~/server/utils/cache-control'
import { ok } from '~~/server/utils/response'
import { normalizePostSlug } from '~~/server/utils/slug'

export default defineEventHandler(async event => {
  setCacheControl(event, 'no-store')
  const { exclude } = getQuery(event)
  return ok(await getRandomFooterPost(typeof exclude === 'string' ? normalizePostSlug(exclude) : ''))
})
