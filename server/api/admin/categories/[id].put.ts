import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { normalizeSlug } from '~~/server/utils/slug'

const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  icon: z.string().regex(/^i-lucide-[a-z0-9-]+$/).optional().or(z.literal(''))
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = categorySchema.parse(await readBody(event))
  const item = await prisma.category.update({
    where: { id },
    data: {
      name: body.name,
      slug: normalizeSlug(body.slug),
      icon: body.icon || null
    }
  })
  return ok(item)
})
