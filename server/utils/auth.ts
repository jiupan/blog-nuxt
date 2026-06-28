import { createError, type H3Event } from 'h3'

export async function requireAdmin(event: H3Event) {
  const session = await requireUserSession(event)
  const user = session.user as { id?: number } | undefined

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: '未登录或登录已过期'
    })
  }

  return session.user
}
