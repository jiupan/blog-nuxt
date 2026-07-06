import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { menusInputSchema, saveMenus } from '~~/server/services/menus/menu.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = menusInputSchema.parse(await readBody(event))
  return ok(await saveMenus(body), '已保存')
})
