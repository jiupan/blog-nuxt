import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { normalizeSlug } from '~~/server/utils/slug'
import { conflict } from '~~/server/utils/api-error'

export const menuLocations = ['PRIMARY', 'FOOTER', 'MOBILE', 'CUSTOM'] as const
export const menuItemTypes = ['CUSTOM', 'POST', 'CATEGORY', 'TAG', 'PAGE', 'ARCHIVE', 'HOME'] as const

export const menuItemInputSchema = z.object({
  id: z.number().int().optional().nullable(),
  parentId: z.number().int().optional().nullable(),
  title: z.string().min(1),
  url: z.string().optional().nullable(),
  type: z.enum(menuItemTypes).default('CUSTOM'),
  targetId: z.number().int().positive().optional().nullable(),
  targetSlug: z.string().optional().nullable(),
  targetBlank: z.boolean().default(false),
  badge: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  sort: z.number().int().default(0),
  isVisible: z.boolean().default(true)
})

export const menuInputSchema = z.object({
  id: z.number().int().optional().nullable(),
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  location: z.enum(menuLocations).default('CUSTOM'),
  isActive: z.boolean().default(true),
  items: z.array(menuItemInputSchema).default([])
})

export const menusInputSchema = z.array(menuInputSchema)

export type MenuInput = z.infer<typeof menuInputSchema>
export type MenuItemInput = z.infer<typeof menuItemInputSchema>
export type MenuLocationInput = typeof menuLocations[number]

export async function getPublicMenu(rawLocation?: string | null) {
  const location = normalizeMenuLocation(rawLocation)
  const menu = await prisma.menu.findFirst({
    where: {
      location,
      isActive: true
    },
    include: {
      items: {
        where: { isVisible: true },
        orderBy: menuItemOrderBy()
      }
    },
    orderBy: { id: 'asc' }
  })

  return menu || getDefaultMenu(location)
}

export async function listAdminMenus() {
  const menus = await prisma.menu.findMany({
    include: {
      items: {
        orderBy: menuItemOrderBy()
      }
    },
    orderBy: [
      { location: 'asc' },
      { id: 'asc' }
    ]
  })

  const data: Array<typeof menus[number] | ReturnType<typeof defaultPrimaryMenu> | ReturnType<typeof defaultFooterMenu>> = [...menus]
  if (!data.some((menu) => menu.location === 'PRIMARY')) {
    data.push(defaultPrimaryMenu())
  }
  if (!data.some((menu) => menu.location === 'FOOTER')) {
    data.push(defaultFooterMenu())
  }

  return data
}

export async function saveMenus(input: MenuInput[]) {
  try {
    return await prisma.$transaction(async (tx) => {
      const incomingMenuIds = input
        .map((menu) => menu.id)
        .filter((id): id is number => Boolean(id && id > 0))

      await tx.menu.deleteMany({
        where: {
          ...(incomingMenuIds.length ? { id: { notIn: incomingMenuIds } } : {})
        }
      })

      const savedMenus = []
      for (const menu of input) {
        const savedMenu = await upsertMenu(tx, menu)
        await saveMenuItems(tx, savedMenu.id, menu.items)

        const menuWithItems = await tx.menu.findUnique({
          where: { id: savedMenu.id },
          include: {
            items: {
              orderBy: menuItemOrderBy()
            }
          }
        })

        if (menuWithItems) {
          savedMenus.push(menuWithItems)
        }
      }

      return savedMenus
    })
  } catch (error) {
    handleMenuWriteError(error)
  }
}

export function normalizeMenuLocation(value?: string | null): MenuLocationInput {
  const location = String(value || 'PRIMARY').toUpperCase()
  return menuLocations.includes(location as MenuLocationInput)
    ? location as MenuLocationInput
    : 'PRIMARY'
}

export function resolveMenuSlug(menu: Pick<MenuInput, 'name' | 'slug'>) {
  const slug = normalizeSlug(menu.slug || menu.name)
  return slug || `menu-${Date.now()}`
}

export function resolveMenuItemUrl(item: MenuItemInput) {
  if (item.url) return item.url
  if (item.type === 'HOME') return '/'
  if (item.type === 'ARCHIVE') return '/archive'
  if (item.type === 'CATEGORY' && item.targetSlug) return `/categories/${item.targetSlug}`
  if (item.type === 'TAG' && item.targetSlug) return `/tags/${item.targetSlug}`
  if ((item.type === 'POST' || item.type === 'PAGE') && item.targetSlug) return `/${item.targetSlug}`
  return ''
}

export function defaultPrimaryMenu() {
  return {
    id: -1,
    name: '主菜单',
    slug: 'primary',
    description: '站点主导航',
    location: 'PRIMARY' as const,
    isActive: true,
    items: [
      { id: -11, parentId: null, title: '文库', url: '/posts', type: 'CUSTOM' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 0, isVisible: true },
      { id: -12, parentId: null, title: '专栏', url: '/archive', type: 'ARCHIVE' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 1, isVisible: true },
      { id: -13, parentId: null, title: '友链', url: '/link', type: 'PAGE' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 2, isVisible: true },
      { id: -14, parentId: null, title: '我的', url: '/about', type: 'PAGE' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 3, isVisible: true }
    ]
  }
}

export function defaultFooterMenu() {
  return {
    id: -2,
    name: '底部菜单',
    slug: 'footer',
    description: '站点底部链接分组',
    location: 'FOOTER' as const,
    isActive: true,
    items: [
      { id: -21, parentId: null, title: '导航', url: null, type: 'CUSTOM' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 0, isVisible: true },
      { id: -22, parentId: -21, title: '首页', url: '/', type: 'HOME' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 0, isVisible: true },
      { id: -23, parentId: -21, title: '文章', url: '/posts', type: 'CUSTOM' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 1, isVisible: true },
      { id: -24, parentId: -21, title: '归档', url: '/archive', type: 'ARCHIVE' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 2, isVisible: true },
      { id: -25, parentId: -21, title: '关于', url: '/about', type: 'PAGE' as const, targetId: null, targetSlug: 'about', targetBlank: false, badge: '', icon: '', sort: 3, isVisible: true },
      { id: -26, parentId: null, title: '分类', url: null, type: 'CATEGORY' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 1, isVisible: true },
      { id: -27, parentId: null, title: '标签', url: null, type: 'TAG' as const, targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 2, isVisible: true }
    ]
  }
}

function getDefaultMenu(location: MenuLocationInput) {
  if (location === 'PRIMARY') return defaultPrimaryMenu()
  if (location === 'FOOTER') return defaultFooterMenu()
  return null
}

function menuItemOrderBy() {
  return [
    { sort: 'asc' },
    { id: 'asc' }
  ] satisfies Prisma.MenuItemOrderByWithRelationInput[]
}

async function upsertMenu(tx: Prisma.TransactionClient, menu: MenuInput) {
  const data = {
    name: menu.name.trim(),
    slug: resolveMenuSlug(menu),
    description: menu.description?.trim() || null,
    location: menu.location,
    isActive: menu.isActive
  }

  return menu.id && menu.id > 0
    ? tx.menu.update({
        where: { id: menu.id },
        data
      })
    : tx.menu.create({ data })
}

async function saveMenuItems(tx: Prisma.TransactionClient, menuId: number, items: MenuItemInput[]) {
  const incomingItemIds = items
    .map((item) => item.id)
    .filter((id): id is number => Boolean(id && id > 0))

  await tx.menuItem.deleteMany({
    where: {
      menuId,
      ...(incomingItemIds.length ? { id: { notIn: incomingItemIds } } : {})
    }
  })

  const idMap = new Map<number, number>()
  const topLevelItems = items.filter((item) => !item.parentId)
  const childItems = items.filter((item) => item.parentId)
  const orderedItems = [...topLevelItems, ...childItems]

  for (const [index, item] of orderedItems.entries()) {
    const savedItem = await upsertMenuItem(tx, menuId, item, idMap, index)

    if (item.id) {
      idMap.set(item.id, savedItem.id)
    }
  }
}

function upsertMenuItem(
  tx: Prisma.TransactionClient,
  menuId: number,
  item: MenuItemInput,
  idMap: Map<number, number>,
  index: number
) {
  const parentId = item.parentId
    ? (item.parentId > 0 ? item.parentId : idMap.get(item.parentId)) || null
    : null
  const data = {
    menuId,
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

  return item.id && item.id > 0
    ? tx.menuItem.update({
        where: { id: item.id },
        data
      })
    : tx.menuItem.create({ data })
}

function handleMenuWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw conflict('菜单别名已存在，请换一个别名后重试')
  }

  throw error
}
