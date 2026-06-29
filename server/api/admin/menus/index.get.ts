import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { defaultPrimaryMenu } from '~~/server/utils/menus'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const menus = await prisma.menu.findMany({
    include: {
      items: {
        orderBy: [
          { sort: 'asc' },
          { id: 'asc' }
        ]
      }
    },
    orderBy: [
      { location: 'asc' },
      { id: 'asc' }
    ]
  })

  return ok(menus.length ? menus : [defaultPrimaryMenu()])
})
