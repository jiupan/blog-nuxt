<template>
  <div class="min-h-screen bg-slate-100 text-slate-950">
    <aside class="fixed inset-y-0 left-0 hidden w-[17rem] border-r border-slate-200 bg-white/90 px-4 py-5 backdrop-blur md:block">
      <NuxtLink to="/admin" class="flex items-center gap-3 rounded-lg px-2 py-1.5">
        <span class="grid size-10 place-items-center rounded-lg bg-slate-950 text-white">
          <UIcon name="i-lucide-feather" class="size-5" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-base font-semibold">{{ siteName }}</span>
          <span class="block text-xs text-slate-500">内容管理后台</span>
        </span>
      </NuxtLink>

      <nav class="mt-8 grid gap-1.5 text-sm">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="admin-nav-link"
          :class="{ 'admin-nav-link-active': isActive(item.to) }"
        >
          <UIcon :name="item.icon" class="size-4" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="absolute inset-x-4 bottom-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
          <UIcon name="i-lucide-shield-check" class="size-4 text-emerald-600" />
          已登录
        </div>
        <p class="mt-1 text-xs leading-5 text-slate-500">后台页面仅在客户端渲染，文章保存后前台 SSR 实时读取。</p>
      </div>
    </aside>

    <div class="md:pl-[17rem]">
      <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 backdrop-blur md:px-8">
        <div class="flex h-16 items-center justify-between gap-4">
          <NuxtLink to="/admin" class="flex items-center gap-2 font-semibold md:hidden">
            <UIcon name="i-lucide-feather" class="size-5" />
            {{ siteName }}
          </NuxtLink>
          <nav class="hidden items-center gap-1 md:flex">
            <NuxtLink to="/" class="admin-top-link">
              <UIcon name="i-lucide-external-link" class="size-4" />
              查看前台
            </NuxtLink>
            <NuxtLink to="/admin/posts/create" class="admin-top-link">
              <UIcon name="i-lucide-square-pen" class="size-4" />
              写文章
            </NuxtLink>
          </nav>
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-home" to="/" class="md:hidden" aria-label="查看前台" />
            <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-log-out" @click="logout">退出登录</UButton>
          </div>
        </div>
        <nav class="flex gap-1 overflow-x-auto border-t border-slate-100 py-2 md:hidden">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="admin-mobile-link"
            :class="{ 'admin-mobile-link-active': isActive(item.to) }"
          >
            <UIcon :name="item.icon" class="size-4" />
            {{ item.label }}
          </NuxtLink>
        </nav>
      </header>

      <main class="w-full px-3 py-3 md:px-4 md:py-4">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName)
const route = useRoute()

const navItems = [
  { label: '仪表盘', to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: '文章', to: '/admin/posts', icon: 'i-lucide-newspaper' },
  { label: '分类', to: '/admin/categories', icon: 'i-lucide-folder-tree' },
  { label: '标签', to: '/admin/tags', icon: 'i-lucide-tags' },
  { label: '菜单', to: '/admin/menus', icon: 'i-lucide-menu' },
  { label: '设置', to: '/admin/settings', icon: 'i-lucide-settings' }
]

function isActive(path: string) {
  return path === '/admin' ? route.path === path : route.path.startsWith(path)
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}
</script>
