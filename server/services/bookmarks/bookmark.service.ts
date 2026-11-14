import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { badRequest, conflict, notFound } from '~~/server/utils/api-error'
import { prisma } from '~~/server/utils/prisma'
import type { AdminBookmark, AdminBookmarksPayload, PublicBookmarksPayload } from '~~/types/dto/bookmark'

const pageId = 1
const id = z.number().int().positive()
const revision = z.number().int().nonnegative()
const urlSchema = z.string().trim().max(2048).transform((value, ctx) => {
  try {
    const url = new URL(value)
    if (/^https?:\/\//i.test(value) && !url.username && !url.password && url.href.length <= 2048) return url.href
  } catch {
    // Report invalid URLs with the same message as unsupported schemes.
  }
  ctx.addIssue({ code: 'custom', message: '请输入有效的 HTTP 或 HTTPS 链接' })
  return z.NEVER
})

const localImageSchema = z.string().trim().max(2048).refine(
  value => !value || /^\/(?!\/)[^\\\s]+$/.test(value),
  '请使用本站图片路径，例如 /uploads/…'
)

export const bookmarkActionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('save'),
    revision,
    id: id.optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']),
    fields: z.strictObject({
      title: z.string().trim().min(1, '请填写标题').max(80, '标题最多 80 字'),
      url: urlSchema,
      sectionId: id,
      note: z.string().trim().max(180, '推荐语最多 180 字'),
      isSpotlight: z.boolean().optional(),
      avatar: localImageSchema.optional(),
      cover: localImageSchema.optional()
    })
  }),
  z.strictObject({ action: z.literal('hide'), revision, id }),
  z.strictObject({ action: z.literal('delete'), revision, id }),
  z.strictObject({ action: z.literal('spotlight'), revision, id, enabled: z.boolean() }),
  z.strictObject({ action: z.literal('reorder'), revision, ids: z.array(id) }),
  z.strictObject({
    action: z.literal('saveSection'),
    revision,
    id: id.optional(),
    fields: z.strictObject({
      name: z.string().trim().min(1, '请填写分类名称').max(32, '分类名称最多 32 字'),
      description: z.string().trim().max(120, '分类简介最多 120 字')
    })
  }),
  z.strictObject({ action: z.literal('deleteSection'), revision, id }),
  z.strictObject({ action: z.literal('reorderSections'), revision, ids: z.array(id) }),
  z.strictObject({
    action: z.literal('settings'),
    revision,
    settings: z.strictObject({
      title: z.string().trim().min(1, '请填写页面标题').max(32, '页面标题最多 32 字'),
      intro: z.string().trim().max(120, '引言最多 120 字'),
      showRandom: z.boolean(),
      featuredId: id.nullable().optional(),
      applicationEmail: z.string().trim().max(254).pipe(z.union([z.literal(''), z.email()])).optional(),
      reportUrl: z.union([z.literal(''), urlSchema]).optional()
    })
  })
])

const itemOrder = [{ sort: 'asc' }, { id: 'asc' }] satisfies Prisma.BookmarkOrderByWithRelationInput[]

const sectionSelect = { name: true } as const

function serializeBookmark({ id, title, url, note, sectionId, section, status, publishedAt, isSpotlight, avatar, cover }: Prisma.BookmarkGetPayload<{ include: { section: { select: typeof sectionSelect } } }>): AdminBookmark {
  return { id, title, url, note, sectionId, sectionName: section.name, status, publishedAt: publishedAt?.toISOString() ?? null, isSpotlight, avatar, cover }
}

async function readBookmarks(tx: Prisma.TransactionClient, publishedOnly: boolean): Promise<AdminBookmarksPayload> {
  const { title, intro, featuredId, showRandom, revision, applicationEmail, reportUrl } = await tx.bookmarkPage.findUniqueOrThrow({ where: { id: pageId } })
  const rows = await tx.bookmark.findMany({
    where: publishedOnly ? { status: 'PUBLISHED' } : undefined,
    orderBy: itemOrder,
    include: { section: { select: sectionSelect } }
  })
  const sections = await tx.bookmarkSection.findMany({
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, description: true }
  })
  return { settings: { title, intro, featuredId, showRandom, applicationEmail, reportUrl }, sections, items: rows.map(serializeBookmark), revision }
}

export async function getPublicBookmarks(): Promise<PublicBookmarksPayload> {
  const { settings, items, sections } = await prisma.$transaction(tx => readBookmarks(tx, true), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead
  })
  return {
    settings,
    sections,
    items: items.map(({ status: _status, ...item }) => item)
  }
}

export function getAdminBookmarks() {
  return prisma.$transaction(tx => readBookmarks(tx, false), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead
  })
}

export async function mutateBookmarks(input: z.infer<typeof bookmarkActionSchema>) {
  try {
    return await prisma.$transaction(async (tx) => {
      // All writes claim the page revision before changing entries or their order.
      const result = await tx.bookmarkPage.updateMany({
        where: { id: pageId, revision: input.revision },
        data: { revision: { increment: 1 } }
      })
      if (!result.count) throw conflict('收录列表已在其他页面更新，请重新加载后再保存', { reason: 'STALE_BOOKMARKS' })

      if (input.action === 'save') {
        if (!await tx.bookmarkSection.findUnique({ where: { id: input.fields.sectionId } })) {
          throw badRequest('请选择有效的分类')
        }
        if (input.status === 'PUBLISHED' && !input.fields.note) throw badRequest('发布前请填写推荐语')
        if (input.id === undefined) {
          const first = await tx.bookmark.findFirst({ orderBy: itemOrder, select: { sort: true } })
          await tx.bookmark.create({
            data: {
              ...input.fields,
              status: input.status,
              sort: (first?.sort ?? 1) - 1,
              publishedAt: input.status === 'PUBLISHED' ? new Date() : null
            }
          })
        } else {
          const current = await tx.bookmark.findUnique({ where: { id: input.id } })
          if (!current) throw notFound('链接不存在')
          const publishedAt = current.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null)
          await tx.bookmark.update({ where: { id: input.id }, data: { ...input.fields, status: input.status, publishedAt } })
          if (input.fields.isSpotlight !== undefined) {
            await tx.bookmarkPage.updateMany({ where: { id: pageId, featuredId: input.id }, data: { featuredId: null } })
          }
        }
      }

      if (input.action === 'spotlight') {
        const updated = await tx.bookmark.updateMany({
          where: { id: input.id, status: 'PUBLISHED' },
          data: { isSpotlight: input.enabled }
        })
        if (!updated.count) throw notFound('只能调整已发布链接的精选状态')
        await tx.bookmarkPage.updateMany({ where: { id: pageId, featuredId: input.id }, data: { featuredId: null } })
      }

      if (input.action === 'hide') {
        const updated = await tx.bookmark.updateMany({
          where: { id: input.id, status: 'PUBLISHED' },
          data: { status: 'HIDDEN' }
        })
        if (!updated.count) throw notFound('这条链接当前未发布')
      }

      if (input.action === 'delete') {
        const deleted = await tx.bookmark.deleteMany({ where: { id: input.id } })
        if (!deleted.count) throw notFound('链接不存在')
      }

      if (input.action === 'hide' || (input.action === 'save' && input.status === 'DRAFT' && input.id !== undefined)) {
        await tx.bookmarkPage.updateMany({ where: { id: pageId, featuredId: input.id }, data: { featuredId: null } })
      }

      if (input.action === 'reorder') {
        const current = await tx.bookmark.findMany({ select: { id: true, sort: true } })
        const ids = new Set(input.ids)
        if (ids.size !== input.ids.length || ids.size !== current.length || current.some(item => !ids.has(item.id))) {
          throw badRequest('排序需包含所有链接且每条只出现一次')
        }
        const currentSort = new Map(current.map(item => [item.id, item.sort]))
        for (const [sort, bookmarkId] of input.ids.entries()) {
          if (currentSort.get(bookmarkId) !== sort) await tx.bookmark.update({ where: { id: bookmarkId }, data: { sort } })
        }
      }

      if (input.action === 'saveSection') {
        const duplicate = await tx.bookmarkSection.findFirst({
          where: { name: { equals: input.fields.name, mode: 'insensitive' }, id: { not: input.id } }
        })
        if (duplicate) throw conflict('这个分类名称已被使用')
        if (input.id === undefined) {
          const last = await tx.bookmarkSection.findFirst({ orderBy: { sort: 'desc' } })
          await tx.bookmarkSection.create({ data: { ...input.fields, sort: (last?.sort ?? -1) + 1 } })
        } else {
          const updated = await tx.bookmarkSection.updateMany({ where: { id: input.id }, data: input.fields })
          if (!updated.count) throw notFound('分类不存在')
        }
      }

      if (input.action === 'deleteSection') {
        if (await tx.bookmark.count({ where: { sectionId: input.id } })) {
          throw conflict('请先把该分类下的链接移到其他分类')
        }
        const deleted = await tx.bookmarkSection.deleteMany({ where: { id: input.id } })
        if (!deleted.count) throw notFound('分类不存在')
      }

      if (input.action === 'reorderSections') {
        const current = await tx.bookmarkSection.findMany({ select: { id: true, sort: true } })
        const ids = new Set(input.ids)
        if (ids.size !== input.ids.length || ids.size !== current.length || current.some(section => !ids.has(section.id))) {
          throw badRequest('排序需包含所有分类且每个只出现一次')
        }
        const currentSort = new Map(current.map(section => [section.id, section.sort]))
        for (const [sort, sectionId] of input.ids.entries()) {
          if (currentSort.get(sectionId) !== sort) await tx.bookmarkSection.update({ where: { id: sectionId }, data: { sort } })
        }
      }

      if (input.action === 'settings') {
        const featuredId = input.settings.featuredId
        if (featuredId != null && !await tx.bookmark.findFirst({ where: { id: featuredId, status: 'PUBLISHED' } })) {
          throw badRequest('请选择已发布的链接作为主推荐')
        }
        await tx.bookmarkPage.update({ where: { id: pageId }, data: input.settings })
      }
      return readBookmarks(tx, false)
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('这条链接已经收录，请在列表中编辑')
    }
    throw error
  }
}
