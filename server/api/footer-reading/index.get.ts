import { getFooterReading } from '~~/server/services/posts/footer-reading.service'
import { setCacheControl } from '~~/server/utils/cache-control'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async event => {
  setCacheControl(event, 'no-store')
  return ok(await getFooterReading())
})
