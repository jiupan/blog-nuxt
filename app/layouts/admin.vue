<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <NuxtLink to="/admin" class="admin-brand">
        <span class="admin-brand-mark">
          <UIcon name="i-lucide-feather" class="size-5" />
        </span>
        <span class="min-w-0">
          <span class="admin-brand-name">{{ siteName }}</span>
          <span class="admin-brand-subtitle">内容管理后台</span>
        </span>
      </NuxtLink>

      <nav class="admin-side-nav">
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

      <div class="admin-session-card">
        <div class="flex items-center gap-2 text-sm font-medium text-slate-900">
          <UIcon name="i-lucide-shield-check" class="size-4 text-emerald-600" />
          已登录
        </div>
        <p>保存后前台会实时读取最新内容。</p>
      </div>
    </aside>

    <div class="admin-main-shell">
      <header class="admin-topbar">
        <div class="admin-topbar-inner">
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
            <div v-if="username" class="admin-user-chip">
              <UIcon name="i-lucide-user-round" class="size-4" />
              <span>{{ username }}</span>
            </div>
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

      <main class="admin-content">
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
const { data: sessionData } = await useFetch<{ data: { user: { username?: string } | null } }>('/api/auth/me')
const username = computed(() => sessionData.value?.data.user?.username || '')

const navItems = [
  { label: '仪表盘', to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: '文章', to: '/admin/posts', icon: 'i-lucide-newspaper' },
  { label: '分类', to: '/admin/categories', icon: 'i-lucide-folder-tree' },
  { label: '标签', to: '/admin/tags', icon: 'i-lucide-tags' },
  { label: '菜单', to: '/admin/menus', icon: 'i-lucide-menu' },
  { label: '图库', to: '/admin/gallery', icon: 'i-lucide-images' },
  { label: '侧栏', to: '/admin/sidebar', icon: 'i-lucide-panel-right' },
  { label: 'AI 知识库', to: '/admin/knowledge', icon: 'i-lucide-brain-circuit' },
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
