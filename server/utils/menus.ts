import { z } from 'zod'
import { normalizeSlug } from '~~/server/utils/slug'

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
    location: 'PRIMARY',
    isActive: true,
    items: [
      { id: -11, parentId: null, title: '文库', url: '/posts', type: 'CUSTOM', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 0, isVisible: true },
      { id: -12, parentId: null, title: '专栏', url: '/archive', type: 'ARCHIVE', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 1, isVisible: true },
      { id: -13, parentId: null, title: '友链', url: '/link', type: 'PAGE', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 2, isVisible: true },
      { id: -14, parentId: null, title: '我的', url: '/about', type: 'PAGE', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 3, isVisible: true }
    ]
  }
}

export function defaultFooterMenu() {
  return {
    id: -2,
    name: '底部菜单',
    slug: 'footer',
    description: '站点底部链接分组',
    location: 'FOOTER',
    isActive: true,
    items: [
      { id: -21, parentId: null, title: '导航', url: null, type: 'CUSTOM', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 0, isVisible: true },
      { id: -22, parentId: -21, title: '首页', url: '/', type: 'HOME', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 0, isVisible: true },
      { id: -23, parentId: -21, title: '文章', url: '/posts', type: 'CUSTOM', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 1, isVisible: true },
      { id: -24, parentId: -21, title: '归档', url: '/archive', type: 'ARCHIVE', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 2, isVisible: true },
      { id: -25, parentId: -21, title: '关于', url: '/about', type: 'PAGE', targetId: null, targetSlug: 'about', targetBlank: false, badge: '', icon: '', sort: 3, isVisible: true },
      { id: -26, parentId: null, title: '分类', url: null, type: 'CATEGORY', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 1, isVisible: true },
      { id: -27, parentId: null, title: '标签', url: null, type: 'TAG', targetId: null, targetSlug: null, targetBlank: false, badge: '', icon: '', sort: 2, isVisible: true }
    ]
  }
}
