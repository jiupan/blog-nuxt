export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') {
    return
  }

  const session = await $fetch<{ data: { user: unknown | null } }>('/api/auth/me').catch(() => null)
  if (!session?.data.user) {
    return navigateTo('/admin/login')
  }
})
