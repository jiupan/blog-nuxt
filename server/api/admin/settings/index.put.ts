import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { z } from 'zod'

const allowedSettingKeys = [
  'site_title',
  'site_subtitle',
  'sidebar_description',
  'site_logo',
  'site_favicon',
  'seo_noindex',
  'seo_keywords',
  'seo_description',
  'footer_copyright',
  'footer_bottom_links',
  'footer_actions'
] as const

const bodySchema = z.object({
  site_title: z.string().optional(),
  site_subtitle: z.string().optional(),
  sidebar_description: z.string().optional(),
  site_logo: z.string().optional(),
  site_favicon: z.string().optional(),
  seo_noindex: z.enum(['true', 'false']).optional(),
  seo_keywords: z.string().optional(),
  seo_description: z.string().optional(),
  footer_copyright: z.string().optional(),
  footer_bottom_links: z.string().optional(),
  footer_actions: z.string().optional()
}).strict()

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid settings data' })
  }

  const ops = allowedSettingKeys
    .filter((key) => parsed.data[key] !== undefined)
    .map((key) => {
      const value = parsed.data[key] || ''
      return prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    })

  await Promise.all(ops)
  return ok(null)
})
