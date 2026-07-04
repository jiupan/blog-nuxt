import { z } from 'zod'
import { generateSeoCheckAdvice } from '~~/server/utils/ai'
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { ok } from '~~/server/utils/response'
import { runSeoRuleCheck } from '~~/server/services/seo-check/seo-check.service'

const bodySchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional().nullable(),
  content: z.string().min(1),
  categoryId: z.number().int().optional().nullable(),
  tagIds: z.array(z.number().int()).default([]),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = bodySchema.parse(await readBody(event))
  const [category, tags] = await Promise.all([
    body.categoryId
      ? prisma.category.findUnique({
          where: { id: body.categoryId },
          select: { name: true }
        })
      : null,
    body.tagIds.length
      ? prisma.tag.findMany({
          where: { id: { in: body.tagIds } },
          select: { name: true }
        })
      : []
  ])
  const ruleResult = runSeoRuleCheck(body)
  const advice = await generateSeoCheckAdvice({
    title: body.title,
    summary: body.summary,
    content: body.content,
    category,
    tags,
    seoTitle: body.seoTitle,
    seoDescription: body.seoDescription
  }, ruleResult)

  return ok({
    ...ruleResult,
    advice
  })
})
