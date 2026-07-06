import { ok } from '~~/server/utils/response'
import { setCacheControl } from '~~/server/utils/cache-control'
import { getPublicMenu } from '~~/server/services/menus/menu.service'

export default defineEventHandler(async (event) => {
  setCacheControl(event, 'public-navigation')
  return ok(await getPublicMenu(getRouterParam(event, 'location') || 'PRIMARY'))
})
