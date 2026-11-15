import type { AccountSnapshot } from '~~/types/dto/user'

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') {
    return
  }

  if (from.path === to.path && from.fullPath !== to.fullPath) return

  const session = await useRequestFetch()<{ data: AccountSnapshot }>('/api/auth/me').catch(() => {
    throw createError({ statusCode: 503, statusMessage: '无法确认后台登录状态，请重试' })
  })
  if (session.data.user?.role !== 'ADMIN') {
    return navigateTo({
      path: '/admin/login',
      query: { redirect: to.fullPath, ...(session.data.user ? { reason: 'forbidden' } : {}) }
    })
  }
})
