import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { menusInputSchema, resolveMenuItemUrl, resolveMenuSlug } from '~~/server/utils/menus'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = menusInputSchema.parse(await readBody(event))

  const menus = await prisma.$transaction(async (tx) => {
    const incomingMenuIds = body
      .map((menu) => menu.id)
      .filter((id): id is number => Boolean(id && id > 0))

    await tx.menu.deleteMany({
      where: {
        ...(incomingMenuIds.length ? { id: { notIn: incomingMenuIds } } : {})
      }
    })

    const savedMenus = []
    for (const menu of body) {
      const savedMenu = menu.id && menu.id > 0
        ? await tx.menu.update({
            where: { id: menu.id },
            data: {
              name: menu.name.trim(),
              slug: resolveMenuSlug(menu),
              description: menu.description?.trim() || null,
              location: menu.location,
              isActive: menu.isActive
            }
          })
        : await tx.menu.create({
            data: {
              name: menu.name.trim(),
              slug: resolveMenuSlug(menu),
              description: menu.description?.trim() || null,
              location: menu.location,
              isActive: menu.isActive
            }
          })

      const incomingItemIds = menu.items
        .map((item) => item.id)
        .filter((id): id is number => Boolean(id && id > 0))

      await tx.menuItem.deleteMany({
        where: {
          menuId: savedMenu.id,
          ...(incomingItemIds.length ? { id: { notIn: incomingItemIds } } : {})
        }
      })

      const idMap = new Map<number, number>()
      const topLevelItems = menu.items.filter((item) => !item.parentId)
      const childItems = menu.items.filter((item) => item.parentId)
      const orderedItems = [...topLevelItems, ...childItems]

      for (const [index, item] of orderedItems.entries()) {
        const parentId = item.parentId
          ? (item.parentId > 0 ? item.parentId : idMap.get(item.parentId)) || null
          : null
        const data = {
          menuId: savedMenu.id,
          parentId,
          title: item.title.trim(),
          url: resolveMenuItemUrl(item) || null,
          type: item.type,
          targetId: item.targetId || null,
          targetSlug: item.targetSlug?.trim() || null,
          targetBlank: item.targetBlank,
          badge: item.badge?.trim() || null,
          icon: item.icon?.trim() || null,
          sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : index,
          isVisible: item.isVisible
        }

        const savedItem = item.id && item.id > 0
          ? await tx.menuItem.update({
            where: { id: item.id },
            data
          })
          : await tx.menuItem.create({ data })

        if (item.id) {
          idMap.set(item.id, savedItem.id)
        }
      }

      const menuWithItems = await tx.menu.findUnique({
        where: { id: savedMenu.id },
        include: {
          items: {
            orderBy: [
              { sort: 'asc' },
              { id: 'asc' }
            ]
          }
        }
      })
      if (menuWithItems) {
        savedMenus.push(menuWithItems)
      }
    }

    return savedMenus
  })

  return ok(menus, '已保存')
})
