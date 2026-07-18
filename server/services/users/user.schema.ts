import { z } from 'zod'

export const userRoleSchema = z.enum(['ADMIN', 'USER'])
export const userStatusSchema = z.enum(['ACTIVE', 'DISABLED'])
export const userIdSchema = z.coerce.number().int().positive('用户 ID 不正确')

export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(254).optional().default(''),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  sort: z.enum(['createdAt_desc', 'createdAt_asc', 'lastLoginAt_desc', 'username_asc']).default('createdAt_desc')
})

export const usernameSchema = z.string()
  .trim()
  .min(3, '用户名至少需要 3 个字符')
  .max(32, '用户名不能超过 32 个字符')
  .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和短横线')

export const userEmailSchema = z.string().trim().email('邮箱格式不正确').max(254)

export const userPasswordSchema = z.string()
  .min(12, '密码至少需要 12 位')
  .max(128, '密码不能超过 128 位')
  .refine(value => value.trim().length > 0, '密码不能全部为空白字符')

export const createAdminUserSchema = z.object({
  username: usernameSchema,
  email: userEmailSchema,
  password: userPasswordSchema,
  role: userRoleSchema.default('USER'),
  status: userStatusSchema.default('ACTIVE')
})

export const updateUserRoleSchema = z.object({ role: userRoleSchema })
export const updateUserStatusSchema = z.object({ status: userStatusSchema })
export const resetUserPasswordSchema = z.object({
  password: userPasswordSchema,
  confirmPassword: z.string().optional()
}).superRefine((value, context) => {
  if (value.confirmPassword !== undefined && value.password !== value.confirmPassword) {
    context.addIssue({ code: 'custom', path: ['confirmPassword'], message: '两次输入的密码不一致' })
  }
})

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>
export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>
