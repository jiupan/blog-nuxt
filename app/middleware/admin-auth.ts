export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') {
    return
  }

  const { data } = await useFetch('/api/auth/me')
  if (!data.value?.data.user) {
    return navigateTo('/admin/login')
  }
})
