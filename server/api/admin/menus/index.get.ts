import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { listAdminMenus } from '~~/server/services/menus/menu.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return ok(await listAdminMenus())
})
