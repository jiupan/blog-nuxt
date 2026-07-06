import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { getPublicSettings } from '~~/server/services/settings/settings.service'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'public-navigation')
  return ok(await getPublicSettings())
})
