import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { defaultFooterMenu, defaultPrimaryMenu } from '~~/server/utils/menus'

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

  const data = menus.length ? menus : []
  if (!data.some((menu) => menu.location === 'PRIMARY')) {
    data.push(defaultPrimaryMenu() as any)
  }
  if (!data.some((menu) => menu.location === 'FOOTER')) {
    data.push(defaultFooterMenu() as any)
  }

  return ok(data)
})
