import { z } from 'zod'

export const MAX_COMMENT_BODY_LENGTH = 2000
export const MIN_DISPLAY_NAME_LENGTH = 2
export const MAX_DISPLAY_NAME_LENGTH = 24
export const DEFAULT_THREAD_PAGE_SIZE = 12
export const MAX_THREAD_PAGE_SIZE = 30
export const DEFAULT_REPLY_PAGE_SIZE = 20
export const MAX_REPLY_PAGE_SIZE = 30
export const REPLY_PREVIEW_COUNT = 2

/** 按 Unicode 码点计数，避免中文昵称被 UTF-16 单元数误判超长。 */
export function countCodePoints(value: string): number {
  return Array.from(value).length
}

const bodySchema = z
  .string()
  .trim()
  .refine((value) => value.length > 0, '评论内容不能为空')
  .refine(
    (value) => countCodePoints(value) <= MAX_COMMENT_BODY_LENGTH,
    `评论内容不能超过 ${MAX_COMMENT_BODY_LENGTH} 个字符`
  )

const displayNameSchema = z
  .string()
  .trim()
  .refine(
    (value) => countCodePoints(value) >= MIN_DISPLAY_NAME_LENGTH,
    `昵称至少 ${MIN_DISPLAY_NAME_LENGTH} 个字符`
  )
  .refine(
    (value) => countCodePoints(value) <= MAX_DISPLAY_NAME_LENGTH,
    `昵称最多 ${MAX_DISPLAY_NAME_LENGTH} 个字符`
  )

const requestIdSchema = z.uuid('请求编号格式不正确')

const replyToIdSchema = z.coerce.number().int().positive().optional()

/**
 * 提交评论。
 *
 * ACCOUNT 与 GUEST 两种身份用判别联合拆开：账号身份的展示名一律由服务端从会话回查，
 * 客户端提交的 displayName 只在访客身份下有效。
 */
export const createCommentSchema = z.discriminatedUnion('identityMode', [
  z
    .object({
      body: bodySchema,
      replyToId: replyToIdSchema,
      requestId: requestIdSchema,
      identityMode: z.literal('ACCOUNT')
    })
    .strict(),
  z
    .object({
      body: bodySchema,
      replyToId: replyToIdSchema,
      requestId: requestIdSchema,
      identityMode: z.literal('GUEST'),
      /** 不传则由服务端生成匿名昵称。 */
      displayName: displayNameSchema.optional()
    })
    .strict()
])

export type CreateCommentInput = z.infer<typeof createCommentSchema>

export const commentListQuerySchema = z.object({
  sort: z.enum(['newest', 'oldest']).default('newest'),
  cursor: z.string().trim().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_THREAD_PAGE_SIZE).default(DEFAULT_THREAD_PAGE_SIZE)
})

export type CommentListQuery = z.infer<typeof commentListQuerySchema>

export const commentRepliesQuerySchema = z.object({
  cursor: z.string().trim().max(512).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_REPLY_PAGE_SIZE).default(DEFAULT_REPLY_PAGE_SIZE)
})

export type CommentRepliesQuery = z.infer<typeof commentRepliesQuerySchema>

export const adminCommentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  postId: z.coerce.number().int().positive().optional(),
  status: z.enum(['PENDING', 'VISIBLE', 'HIDDEN', 'DELETED']).optional(),
  keyword: z.string().trim().max(100).optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
  sort: z.enum(['newest', 'oldest']).default('newest')
})

export type AdminCommentListQuery = z.infer<typeof adminCommentListQuerySchema>

export const commentIdSchema = z.coerce.number().int().positive()

export const moderateCommentSchema = z
  .object({
    action: z.enum(['approve', 'hide', 'restore', 'delete']),
    /** 客户端看到的状态。与服务端当前状态不一致说明有并发审核，返回 409。 */
    expectedStatus: z.enum(['PENDING', 'VISIBLE', 'HIDDEN', 'DELETED']),
    /** 仅内部可见的备注，不进入公开 DTO，也不写入审计正文。 */
    reason: z.string().trim().max(500).optional()
  })
  .strict()

export type ModerateCommentInput = z.infer<typeof moderateCommentSchema>
