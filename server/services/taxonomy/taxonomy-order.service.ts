import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { conflict } from '../../utils/api-error'

const idsSchema = z
  .array(z.number().int().positive())
  .refine((ids) => new Set(ids).size === ids.length, '排序列表不能包含重复项')
export const taxonomyOrderSchema = z.object({ ids: idsSchema, expectedIds: idsSchema }).strict()
type OrderInput = z.infer<typeof taxonomyOrderSchema>

export async function saveTaxonomyOrder(kind: 'category' | 'tag', input: OrderInput) {
  const label = kind === 'category' ? '分类' : '标签'
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const query = {
            select: { id: true, sort: true },
            orderBy: [{ sort: 'asc' as const }, { id: 'asc' as const }]
          }
          const current =
            kind === 'category' ? await tx.category.findMany(query) : await tx.tag.findMany(query)
          const currentIds = new Set(current.map((item) => item.id))
          // A complete permutation avoids overwriting hidden pages or accepting stale lists.
          if (
            input.ids.length !== current.length ||
            input.expectedIds.length !== current.length ||
            new Set(input.ids).size !== current.length ||
            input.ids.some((id) => !currentIds.has(id)) ||
            current.some((item, index) => item.id !== input.expectedIds[index])
          ) {
            throw conflict(`${label}列表或顺序已变化，请重新加载排序后再保存`)
          }
          const previousSort = new Map(current.map((item) => [item.id, item.sort]))
          for (const [sort, id] of input.ids.entries()) {
            if (previousSort.get(id) === sort) continue
            if (kind === 'category') await tx.category.update({ where: { id }, data: { sort } })
            else await tx.tag.update({ where: { id }, data: { sort } })
          }
          return { ids: input.ids }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        if (attempt < 2) continue
        throw conflict(`${label}顺序正在被其他操作更新，请重新加载后再试`)
      }
      throw error
    }
  }
  throw conflict('排序未能保存，请重新加载后再试')
}
