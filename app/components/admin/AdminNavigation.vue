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
    label: '内容',
    items: [
      { label: '文章', to: '/admin/posts', icon: 'i-lucide-file-text' },
      { label: '分类', to: '/admin/categories', icon: 'i-lucide-folder' },
      { label: '标签', to: '/admin/tags', icon: 'i-lucide-hash' },
      { label: '图库', to: '/admin/gallery', icon: 'i-lucide-images' },
      { label: '网站导航', to: '/admin/bookmarks', icon: 'i-lucide-bookmark' }
    ]
  },
  {
    label: '互动与智能',
    items: [
      { label: '评论', to: '/admin/comments', icon: 'i-lucide-message-circle' },
      { label: '用户管理', to: '/admin/users', icon: 'i-lucide-users' },
      { label: 'AI 知识库', to: '/admin/knowledge', icon: 'i-lucide-orbit' },
      { label: 'Agent 接入', to: '/admin/agent', icon: 'i-lucide-plug-zap' }
    ]
  },
  {
    label: '站点',
    items: [
      { label: '菜单', to: '/admin/menus', icon: 'i-lucide-list-tree' },
      { label: '侧栏', to: '/admin/sidebar', icon: 'i-lucide-panel-right' },
      { label: '站点设置', to: '/admin/settings', icon: 'i-lucide-settings-2' }
    ]
  }
]
function isActive(path: string) {
  return path === '/admin' ? route.path === path : route.path.startsWith(path)
}
</script>
