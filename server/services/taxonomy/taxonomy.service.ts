import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { buildPublishedPostWhere } from '~~/server/services/posts/post-query.service'
import { prisma } from '~~/server/utils/prisma'
import { normalizeSlug } from '~~/server/utils/slug'
import { badRequest, conflict, notFound } from '~~/server/utils/api-error'

const iconSchema = z.string().regex(/^i-lucide-[a-z0-9-]+$/).optional().or(z.literal(''))

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  icon: iconSchema
})

export const updateCategorySchema = createCategorySchema.extend({
  slug: z.string().min(1)
})

export const createTagSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional()
})

export const updateTagSchema = createTagSchema.extend({
  slug: z.string().min(1)
})

export const listAdminTagsSchema = z.object({
  search: z.string().trim().max(80).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(40)
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type ListAdminTagsInput = z.infer<typeof listAdminTagsSchema>

export function listAdminCategories() {
  return prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { posts: true } } }
  })
}

export function listPublicCategories() {
  return prisma.category.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: {
          posts: {
            where: buildPublishedPostWhere()
          }
        }
      }
    }
  })
}

export async function createCategory(input: CreateCategoryInput) {
  try {
    return await prisma.category.create({
      data: {
        name: input.name,
        slug: resolveTaxonomySlug(input.slug, input.name),
        icon: input.icon || null
      }
    })
  } catch (error) {
    handleTaxonomyWriteError(error, '分类')
  }
}

export async function updateCategory(id: number, input: UpdateCategoryInput) {
  const slug = resolveTaxonomySlug(input.slug)

  try {
    return await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug,
        icon: input.icon || null
      }
    })
  } catch (error) {
    handleTaxonomyWriteError(error, '分类')
  }
}

export async function deleteCategory(id: number) {
  try {
    await prisma.category.delete({ where: { id } })
  } catch (error) {
    if (isPrismaError(error, 'P2003')) {
      throw badRequest('该分类下仍有文章，不能删除')
    }

    if (isPrismaError(error, 'P2025')) {
      throw createTaxonomyNotFoundError('分类')
    }

    throw error
  }
}

export async function listAdminTags(input: ListAdminTagsInput) {
  const where: Prisma.TagWhereInput = input.search
    ? { OR: [
        { name: { contains: input.search, mode: 'insensitive' } },
        { slug: { contains: input.search, mode: 'insensitive' } }
      ] }
    : {}
  const [total, items] = await prisma.$transaction([
    prisma.tag.count({ where }),
    prisma.tag.findMany({
      where,
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }, { id: 'asc' }],
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
      include: { _count: { select: { posts: true } } }
    })
  ])
  return {
    items,
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      hasMore: input.page * input.pageSize < total
    }
  }
}

export function listAllAdminTags() {
  return prisma.tag.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { posts: true } } }
  })
}

export function listPublicTags() {
  return prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          posts: {
            where: {
              post: buildPublishedPostWhere()
            }
          }
        }
      }
    }
  })
}

export async function createTag(input: CreateTagInput) {
  try {
    return await prisma.tag.create({
      data: {
        name: input.name,
        slug: resolveTaxonomySlug(input.slug, input.name)
      }
    })
  } catch (error) {
    handleTaxonomyWriteError(error, '标签')
  }
}

export async function updateTag(id: number, input: UpdateTagInput) {
  const slug = resolveTaxonomySlug(input.slug)

  try {
    return await prisma.tag.update({
      where: { id },
      data: {
        name: input.name,
        slug
      }
    })
  } catch (error) {
    handleTaxonomyWriteError(error, '标签')
  }
}

export async function deleteTag(id: number) {
  try {
    await prisma.tag.delete({ where: { id } })
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      throw createTaxonomyNotFoundError('标签')
    }

    throw error
  }
}

function resolveTaxonomySlug(value?: string | null, fallback?: string) {
  const slug = normalizeSlug(value || fallback || '')

  if (!slug) {
    throw badRequest('别名不能为空')
  }

  return slug
}

function handleTaxonomyWriteError(error: unknown, label: '分类' | '标签'): never {
  if (isPrismaError(error, 'P2002')) {
    throw conflict(`${label}别名已存在，请换一个别名后重试`)
  }

  if (isPrismaError(error, 'P2025')) {
    throw createTaxonomyNotFoundError(label)
  }

  throw error
}

function createTaxonomyNotFoundError(label: '分类' | '标签') {
  return notFound(`${label}不存在`)
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}
