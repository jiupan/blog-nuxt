import { z } from 'zod'

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  }, '请输入不含登录凭证的 HTTP 或 HTTPS 链接')

export const createAgentKeySchema = z.object({ name: z.string().trim().min(1).max(80) }).strict()
export const agentPostSchema = z
  .object({
    requestId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z0-9_.:-]+$/),
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(200_000),
    slug: z.string().trim().min(1).max(200).optional(),
    summary: z.string().trim().max(2000).nullable().optional(),
    categoryId: z.number().int().positive().nullable().default(null),
    tagIds: z
      .array(z.number().int().positive())
      .max(30)
      .default([])
      .transform((ids) => [...new Set(ids)].sort((a, b) => a - b)),
    status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
    cover: z.union([httpUrl, z.string().regex(/^\/uploads\/[a-zA-Z0-9_./%-]+$/)]).optional(),
    seoTitle: z.string().trim().max(200).optional(),
    seoDescription: z.string().trim().max(500).optional(),
    sources: z
      .array(z.object({ title: z.string().trim().min(1).max(300), url: httpUrl }).strict())
      .max(20)
      .default([])
  })
  .strict()

export type AgentPostInput = z.infer<typeof agentPostSchema>

export const agentRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20)
})
