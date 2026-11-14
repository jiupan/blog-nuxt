<template>
  <nav
    class="admin-side-nav"
    aria-label="后台导航"
  >
    <div
      v-for="group in groups"
      :key="group.label"
      class="admin-nav-group"
    >
      <p
        v-if="group.label"
        class="admin-nav-group-label"
      >
        {{ group.label }}
      </p>
      <NuxtLink
        v-for="item in group.items"
        :key="item.to"
        :to="item.to"
        class="admin-nav-link"
        :class="{ 'admin-nav-link-active': isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        @click="$emit('navigate')"
      >
        <UIcon
          :name="item.icon"
          class="size-[18px]"
        />
        <span>{{ item.label }}</span>
        <span
          v-if="isActive(item.to)"
          class="admin-nav-current"
        />
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineEmits<{ navigate: [] }>()
const route = useRoute()
const groups = [
  { label: '', items: [{ label: '工作台', to: '/admin', icon: 'i-lucide-layout-dashboard' }] },
  {
    label: '内容管理',
    items: [
      { label: '文章', to: '/admin/posts', icon: 'i-lucide-file-text' },
      { label: '文章分类', to: '/admin/categories', icon: 'i-lucide-folder' },
      { label: '文章标签', to: '/admin/tags', icon: 'i-lucide-hash' },
      { label: '图库', to: '/admin/gallery', icon: 'i-lucide-images' },
      { label: '网站收录', to: '/admin/bookmarks', icon: 'i-lucide-bookmark' }
    ]
  },
  {
    label: '站点外观',
    items: [
      { label: '站点设置', to: '/admin/settings', icon: 'i-lucide-settings-2' },
      { label: '主导航', to: '/admin/menus', icon: 'i-lucide-list-tree' },
      { label: '侧栏', to: '/admin/sidebar', icon: 'i-lucide-panel-right' },
      { label: '页脚', to: '/admin/settings?tab=footer', icon: 'i-lucide-panel-bottom' }
    ]
  },
  {
    label: '评论与用户',
    items: [
      { label: '评论', to: '/admin/comments', icon: 'i-lucide-message-circle' },
      { label: '用户管理', to: '/admin/users', icon: 'i-lucide-users' }
    ]
  },
  {
    label: 'AI 与接入',
    items: [
      { label: 'AI 知识库', to: '/admin/knowledge', icon: 'i-lucide-orbit' },
      { label: 'Agent 发布接入', to: '/admin/agent', icon: 'i-lucide-plug-zap' }
    ]
  }
]
function isActive(path: string) {
  if (route.path === '/admin/menus' && route.query.location === 'footer') return path === '/admin/settings?tab=footer'
  if (route.path === '/admin/settings') {
    const isFooter = ['footer', 'footerActions', 'footerMenu'].includes(String(route.query.tab))
    if (path === '/admin/settings?tab=footer') return isFooter
    if (path === '/admin/settings') return !isFooter
  }
  return route.path === path || (path !== '/admin' && route.path.startsWith(path + '/'))
}
</script>
