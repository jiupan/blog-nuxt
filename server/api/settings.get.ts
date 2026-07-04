import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'

const publicSettingKeys = new Set([
  'site_title',
  'site_subtitle',
  'site_brand',
  'sidebar_description',
  'site_logo',
  'site_favicon',
  'seo_noindex',
  'seo_keywords',
  'seo_description',
  'footer_copyright',
  'footer_bottom_links',
  'footer_actions'
])

export default defineEventHandler(async () => {
  const rows = await prisma.setting.findMany()
  const settings: Record<string, string> = {}
  for (const row of rows) {
    if (!publicSettingKeys.has(row.key)) {
      continue
    }
    settings[row.key] = row.value
  }
  return ok(settings)
})
