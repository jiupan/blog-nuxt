import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { normalizeSlug } from '~~/server/utils/slug'

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = categorySchema.parse(await readBody(event))
  const item = await prisma.category.create({
    data: {
      name: body.name,
      slug: normalizeSlug(body.slug || body.name)
    }
  })
  return ok(item, '已创建')
})
