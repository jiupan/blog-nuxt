import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { createRandomPostSlug, normalizePostSlug } from '~~/server/utils/slug'

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
  const slug = await resolvePostSlug(body.slug)

  try {
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: '文章别名已存在，请换一个别名后重试' })
    }

    throw error
  }
})

async function resolvePostSlug(value?: string | null) {
  const customSlug = value ? normalizePostSlug(value) : ''

  if (customSlug) {
    return customSlug
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = createRandomPostSlug()
    const exists = await prisma.post.findUnique({ where: { slug }, select: { id: true } })

    if (!exists) {
      return slug
    }
  }

  return createRandomPostSlug(12)
}
