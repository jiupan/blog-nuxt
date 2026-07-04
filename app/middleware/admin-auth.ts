export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') {
    return
  }

  const session = await $fetch<{ data: { user: { role?: string } | null } }>('/api/auth/me').catch(() => null)
  if (!session?.data.user || session.data.user.role !== 'ADMIN') {
    return navigateTo('/admin/login')
  }
})
