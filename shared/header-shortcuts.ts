import { z } from 'zod'

export const headerShortcutIcons = [
  { name: 'i-lucide-wrench', label: '扳手' },
  { name: 'i-lucide-archive', label: '归档' },
  { name: 'i-lucide-circle-user-round', label: '圆形账户' },
  { name: 'i-lucide-user-round', label: '用户' },
  { name: 'i-lucide-contact-round', label: '名片' },
  { name: 'i-lucide-search', label: '搜索' },
  { name: 'i-lucide-scan-search', label: '扫描搜索' },
  { name: 'i-lucide-moon', label: '月亮' },
  { name: 'i-lucide-moon-star', label: '星月' },
  { name: 'i-lucide-sun', label: '太阳' },
  { name: 'i-lucide-sunrise', label: '日出' },
  { name: 'i-lucide-sparkles', label: '星光' },
  { name: 'i-lucide-compass', label: '指南针' },
  { name: 'i-lucide-flask-conical', label: '实验室' },
  { name: 'i-lucide-folder-open', label: '文件夹' },
  { name: 'i-lucide-box', label: '盒子' },
  { name: 'i-lucide-book-open', label: '书本' },
  { name: 'i-lucide-bookmark', label: '书签' },
  { name: 'i-lucide-layout-grid', label: '网格' },
  { name: 'i-lucide-settings', label: '齿轮' }
] as const

const iconNames = new Set<string>(headerShortcutIcons.map(icon => icon.name))
const fields = {
  enabled: z.boolean(),
  label: z.string().trim().min(1).max(32),
  icon: z.string().refine(name => iconNames.has(name))
}

const headerShortcutSchema = z.discriminatedUnion('id', [
  z.strictObject({ id: z.literal('tools'), ...fields }),
  z.strictObject({ id: z.literal('archive'), ...fields }),
  z.strictObject({ id: z.literal('account'), ...fields, followAvatar: z.boolean() }),
  z.strictObject({ id: z.literal('search'), ...fields }),
  z.strictObject({ id: z.literal('theme'), ...fields, darkLabel: fields.label, darkIcon: fields.icon })
])

const headerShortcutsSchema = z.array(headerShortcutSchema).length(5)
  .refine(items => new Set(items.map(item => item.id)).size === items.length)

export type HeaderShortcut = z.infer<typeof headerShortcutSchema>

export const headerShortcutNames = {
  tools: '工具',
  archive: '归档',
  account: '账户',
  search: '站内搜索',
  theme: '主题切换'
} satisfies Record<HeaderShortcut['id'], string>

const defaultShortcuts: HeaderShortcut[] = [
  { id: 'tools', enabled: true, label: '工具', icon: 'i-lucide-wrench' },
  { id: 'archive', enabled: true, label: '归档', icon: 'i-lucide-archive' },
  { id: 'account', enabled: true, label: '账户', icon: 'i-lucide-circle-user-round', followAvatar: true },
  { id: 'search', enabled: true, label: '站内搜索', icon: 'i-lucide-search' },
  { id: 'theme', enabled: true, label: '切换到夜间模式', icon: 'i-lucide-moon', darkLabel: '切换到白天模式', darkIcon: 'i-lucide-sun' }
]

export const defaultHeaderShortcuts = JSON.stringify(defaultShortcuts)

export function validateHeaderShortcuts(value?: string) {
  if (!value) return
  try {
    const result = headerShortcutsSchema.safeParse(JSON.parse(value))
    if (result.success) return result.data
  } catch {
    return
  }
}

export function readHeaderShortcuts(value?: string): HeaderShortcut[] {
  return validateHeaderShortcuts(value) ?? defaultShortcuts.map(item => ({ ...item }))
}

export function isMobileHeaderShortcut(id: HeaderShortcut['id']) {
  return id !== 'tools' && id !== 'account'
}
