import { z } from 'zod'
import { aboutIcons } from './about-icons'

export const aboutLimits = {
  name: 80,
  subtitle: 160,
  description: 2400,
  group: 40,
  technology: 48,
  groups: 8,
  items: 20,
  payload: 64_000
} as const

const iconNames = new Set(aboutIcons.map(icon => icon.name))
const aboutTechnologySchema = z.object({
  name: z.string().trim().min(1, '填写技术名称').max(aboutLimits.technology),
  icon: z.string().refine(icon => !icon || iconNames.has(icon), '选择列表中的图标')
})

export const aboutProfileSchema = z.object({
  name: z.string().trim().max(aboutLimits.name),
  subtitle: z.string().trim().max(aboutLimits.subtitle),
  description: z.string().trim().max(aboutLimits.description),
  groups: z.array(z.object({
    name: z.string().trim().max(aboutLimits.group),
    items: z.array(aboutTechnologySchema).max(aboutLimits.items)
  })).max(aboutLimits.groups)
}).superRefine(({ groups }, ctx) => {
  const groupNames = new Set<string>()
  for (const [groupIndex, group] of groups.entries()) {
    const groupName = group.name.toLowerCase()
    if (groupNames.has(groupName)) {
      ctx.addIssue({
        code: 'custom',
        path: ['groups', groupIndex, 'name'],
        message: groupName ? '分组名称已存在' : '请给这个分组命名'
      })
    }
    groupNames.add(groupName)

    const techNames = new Set<string>()
    for (const [itemIndex, item] of group.items.entries()) {
      const techName = item.name.toLowerCase()
      if (techName && techNames.has(techName)) {
        ctx.addIssue({
          code: 'custom',
          path: ['groups', groupIndex, 'items', itemIndex, 'name'],
          message: '这个分组已有同名技术'
        })
      }
      techNames.add(techName)
    }
  }
})

export type AboutProfile = z.infer<typeof aboutProfileSchema>
export type AboutGroup = AboutProfile['groups'][number]

export const emptyAboutProfile: AboutProfile = { name: '', subtitle: '', description: '', groups: [] }
export const defaultAboutProfile = JSON.stringify(emptyAboutProfile)

export function parseAboutProfile(value: string) {
  try {
    return aboutProfileSchema.safeParse(JSON.parse(value))
  } catch {
    return null
  }
}

export function visibleAboutGroups(groups: AboutGroup[]) {
  return groups.map(group => ({
    name: group.name.trim(),
    items: group.items.filter(item => item.name.trim()).map(item => ({ name: item.name.trim(), icon: item.icon }))
  })).filter(group => group.items.length)
}
