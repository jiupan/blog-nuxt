import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { normalizeSlug } from '~~/server/utils/slug'

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  summary: z.string().optional().nullable(),
  content: z.string().min(1),
  cover: z.string().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
  tagIds: z.array(z.number().int()).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = postSchema.parse(await readBody(event))
  const slug = normalizeSlug(body.slug || body.title)

  const post = await prisma.post.create({
    data: {
      title: body.title,
      slug,
      summary: body.summary,
      content: body.content,
      cover: body.cover,
      categoryId: body.categoryId,
      status: body.status,
      publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
      seoTitle: body.seoTitle,
      seoDescription: body.seoDescription,
      tags: {
        create: body.tagIds.map((tagId) => ({ tagId }))
      }
    }
  })

  return ok(post, '已创建')
})
