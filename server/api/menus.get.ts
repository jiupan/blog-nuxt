import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { getPublicMenu } from '~~/server/services/menus/menu.service'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  setCacheControl(event, 'public-navigation')
  return ok(await getPublicMenu(String(query.location || 'PRIMARY')))
})
