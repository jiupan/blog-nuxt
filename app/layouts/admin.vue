<template>
  <div class="min-h-screen bg-gray-50">
    <aside class="fixed inset-y-0 left-0 hidden w-60 border-r border-gray-200 bg-white px-4 py-5 md:block">
      <NuxtLink to="/admin" class="block text-lg font-semibold">{{ siteName }}</NuxtLink>
      <nav class="mt-8 grid gap-2 text-sm">
        <NuxtLink class="rounded-md px-3 py-2 hover:bg-gray-100" to="/admin">仪表盘</NuxtLink>
        <NuxtLink class="rounded-md px-3 py-2 hover:bg-gray-100" to="/admin/posts">文章</NuxtLink>
        <NuxtLink class="rounded-md px-3 py-2 hover:bg-gray-100" to="/admin/categories">分类</NuxtLink>
        <NuxtLink class="rounded-md px-3 py-2 hover:bg-gray-100" to="/admin/tags">标签</NuxtLink>
      </nav>
    </aside>
    <div class="md:pl-60">
      <header class="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
        <NuxtLink to="/" class="text-sm text-gray-600">查看前台</NuxtLink>
        <UButton color="neutral" variant="ghost" size="sm" @click="logout">退出登录</UButton>
      </header>
      <main class="p-4 md:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const siteName = config.public.siteName

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}
</script>
