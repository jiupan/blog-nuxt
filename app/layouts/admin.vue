<template>
  <div
    class="admin-shell"
    :class="{ 'admin-shell-focus': focused }"
  >
    <aside class="admin-sidebar">
      <NuxtLink
        to="/admin"
        class="admin-brand"
      >
        <span class="admin-brand-mark">
          <UIcon
            name="i-lucide-feather"
            class="size-5"
          />
        </span>
        <span class="min-w-0">
          <span class="admin-brand-name">{{ siteName }}</span>
          <span class="admin-brand-subtitle">创作与内容管理</span>
        </span>
      </NuxtLink>
      <AdminNavigation />
      <NuxtLink
        to="/"
        target="_blank"
        class="admin-sidebar-site"
      >
        <UIcon
          name="i-lucide-arrow-up-right"
          class="size-4"
        />
        打开博客
        <span>查看前台</span>
      </NuxtLink>
      <div class="admin-sidebar-account">
        <span class="admin-avatar">{{ username.slice(0, 1).toUpperCase() || 'J' }}</span>
        <div>
          <strong>{{ username || '管理员' }}</strong>
          <small>管理员工作空间</small>
        </div>
        <UIcon
          name="i-lucide-shield-check"
          class="size-4"
        />
      </div>
    </aside>

    <div
      ref="mainShell"
      class="admin-main-shell"
    >
      <header class="admin-topbar">
        <div class="admin-topbar-inner">
          <div class="admin-breadcrumb">
            <UButton
              class="admin-menu-trigger"
              color="neutral"
              variant="ghost"
              icon="i-lucide-panel-left"
              aria-label="打开导航"
              @click="mobileNavOpen = true"
            />
            <h1 class="admin-topbar-title">{{ pageName }}</h1>
          </div>
          <div class="admin-topbar-actions">
            <div id="admin-page-actions">
              <UButton
                v-if="isDashboard"
                icon="i-lucide-plus"
                to="/admin/posts/create"
                size="sm"
              >
                新建文章
              </UButton>
            </div>
            <NuxtLink
              to="/"
              target="_blank"
              class="admin-top-link"
            >
              <UIcon
                name="i-lucide-external-link"
                class="size-4"
              />
              <span>查看前台</span>
            </NuxtLink>
            <UDropdownMenu
              :items="accountItems"
              :portal="false"
              :content="{ align: 'end' }"
            >
              <button
                type="button"
                class="admin-account-trigger"
                aria-label="账户菜单"
              >
                <span class="admin-avatar">{{ username.slice(0, 1).toUpperCase() || 'J' }}</span>
                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-3.5"
                />
              </button>
            </UDropdownMenu>
          </div>
        </div>
      </header>
      <main
        id="admin-main"
        class="admin-content"
      >
        <slot />
      </main>
      <footer class="admin-footer">
        <span>{{ siteName }} · 内容工作台</span>
        <span>让每一次记录，都有迹可循。</span>
      </footer>
    </div>

    <USlideover
      v-model:open="mobileNavOpen"
      side="left"
      title="工作空间导航"
      :ui="{ content: 'admin-mobile-drawer w-72', body: 'p-4' }"
    >
      <template #body>
        <AdminNavigation @navigate="mobileNavOpen = false" />
        <NuxtLink
          to="/"
          class="admin-sidebar-site"
          @click="mobileNavOpen = false"
        >
          查看前台
          <UIcon
            name="i-lucide-external-link"
            class="size-4"
          />
        </NuxtLink>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import '@fontsource-variable/noto-sans-sc'
import '~/assets/css/admin.css'

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName)
const route = useRoute()
const isDashboard = computed(() => route.path === '/admin')
const mobileNavOpen = ref(false)
const mainShell = ref<HTMLElement | null>(null)
const focused = useState('admin-editor-focused', () => false)
const { data: sessionData } = await useFetch<{ data: { user: { username?: string } | null } }>('/api/auth/me')
const username = computed(() => sessionData.value?.data.user?.username || '')
const pageNames: Record<string, string> = {
  posts: '文章',
  categories: '分类',
  tags: '标签',
  comments: '评论',
  menus: '菜单',
  gallery: '图库',
  bookmarks: '网站导航',
  sidebar: '侧栏',
  knowledge: 'AI 知识库',
  agent: 'Agent 接入',
  users: '用户管理',
  settings: '站点设置'
}
const pageName = computed(() => pageNames[route.path.split('/')[2] || ''] || '工作台')
const accountItems = [
  [{ label: username.value || '管理员', type: 'label' as const }],
  [
    { label: '站点设置', icon: 'i-lucide-settings', to: '/admin/settings' },
    {
      label: '退出登录',
      icon: 'i-lucide-log-out',
      onSelect: () => {
        void logout()
      }
    }
  ]
]

watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false
    if (mainShell.value) mainShell.value.scrollTop = 0
  }
)
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}
</script>
