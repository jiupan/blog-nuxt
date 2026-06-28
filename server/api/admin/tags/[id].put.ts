import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { normalizeSlug } from '~~/server/utils/slug'

const tagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = tagSchema.parse(await readBody(event))
  const item = await prisma.tag.update({
    where: { id },
    data: {
      name: body.name,
      slug: normalizeSlug(body.slug)
    }
  })
  return ok(item)
})
