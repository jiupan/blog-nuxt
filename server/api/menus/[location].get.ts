import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { defaultFooterMenu, defaultPrimaryMenu, menuLocations } from '~~/server/utils/menus'

export default defineEventHandler(async (event) => {
  const requestedLocation = String(getRouterParam(event, 'location') || 'PRIMARY').toUpperCase()
  const location = menuLocations.includes(requestedLocation as any)
    ? requestedLocation
    : 'PRIMARY'

  const menu = await prisma.menu.findFirst({
    where: {
      location: location as any,
      isActive: true
    },
    include: {
      items: {
        where: { isVisible: true },
        orderBy: [
          { sort: 'asc' },
          { id: 'asc' }
        ]
      }
    },
    orderBy: { id: 'asc' }
  })

  return ok(menu || (location === 'PRIMARY' ? defaultPrimaryMenu() : location === 'FOOTER' ? defaultFooterMenu() : null))
})
