import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { requireAdmin } from '~~/server/utils/auth'
import { ok } from '~~/server/utils/response'
import { normalizePostSlug } from '~~/server/utils/slug'

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().optional().nullable(),
  content: z.string().min(1),
  cover: z.string().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
  tagIds: z.array(z.number().int()).default([]),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = postSchema.parse(await readBody(event))
  const current = await prisma.post.findUnique({ where: { id } })

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  const slug = normalizePostSlug(body.slug)

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: '文章别名不能为空' })
  }

  try {
    const post = await prisma.post.update({
      where: { id },
      data: {
        title: body.title,
        slug,
        summary: body.summary,
        content: body.content,
        cover: body.cover,
        categoryId: body.categoryId,
        status: body.status,
        publishedAt: body.status === 'PUBLISHED' ? current.publishedAt || new Date() : null,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        tags: {
          deleteMany: {},
          create: body.tagIds.map((tagId) => ({ tagId }))
        }
      }
    })

    return ok(post)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: '文章别名已存在，请换一个别名后重试' })
    }

    throw error
  }
})
