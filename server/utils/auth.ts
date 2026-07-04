import { createError, type H3Event } from 'h3'

type SessionUser = {
  id?: number
  username?: string
  email?: string | null
  role?: string
}

export async function requireUser(event: H3Event) {
  const session = await requireUserSession(event)
  const user = session.user as SessionUser | undefined

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: '未登录或登录已过期'
    })
  }

  return session.user
}

export async function requireAdmin(event: H3Event) {
  const user = await requireUser(event) as SessionUser

  if (user.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: '没有后台访问权限'
    })
  }

  return user
}
