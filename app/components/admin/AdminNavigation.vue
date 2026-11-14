<template>
  <nav
    class="admin-side-nav"
    aria-label="后台导航"
  >
    <div
      v-for="group in groups"
      :key="group.id"
      class="admin-nav-group"
    >
      <button
        v-if="group.label"
        type="button"
        class="admin-nav-disclosure"
        :class="{ 'is-current': currentGroup === group.id }"
        :aria-expanded="!!expanded[group.id]"
        :aria-controls="`${navId}-${group.id}`"
        @click="expanded[group.id] = !expanded[group.id]"
      >
        <span>{{ group.label }}</span>
        <span v-if="!expanded[group.id] && currentGroup === group.id" class="admin-nav-current" aria-hidden="true" />
        <UIcon name="i-lucide-chevron-right" class="admin-nav-chevron" aria-hidden="true" />
      </button>
      <div
        v-show="!group.label || expanded[group.id]"
        :id="`${navId}-${group.id}`"
        class="admin-nav-links"
      >
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          class="admin-nav-link"
          :class="{ 'admin-nav-link-active': isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          @click="$emit('navigate')"
        >
          <UIcon :name="item.icon" class="size-[18px]" aria-hidden="true" />
          <span>{{ item.label }}</span>
          <span v-if="isActive(item.to)" class="admin-nav-current" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
defineEmits<{ navigate: [] }>()
const route = useRoute()
const navId = useId()
const groups = [
  { id: 'dashboard', label: '', items: [{ label: '工作台', to: '/admin', icon: 'i-lucide-layout-dashboard' }] },
  {
    id: 'content',
    label: '内容管理',
    items: [
      { label: '文章', to: '/admin/posts', icon: 'i-lucide-file-text' },
      { label: '图库', to: '/admin/gallery', icon: 'i-lucide-images' },
      { label: '网站收录', to: '/admin/bookmarks', icon: 'i-lucide-bookmark' },
      { label: '文章分类', to: '/admin/categories', icon: 'i-lucide-folder' },
      { label: '文章标签', to: '/admin/tags', icon: 'i-lucide-hash' }
    ]
  },
  {
    id: 'community',
    label: '评论与用户',
    items: [
      { label: '评论', to: '/admin/comments', icon: 'i-lucide-message-circle' },
      { label: '用户管理', to: '/admin/users', icon: 'i-lucide-users' }
    ]
  },
  {
    id: 'appearance',
    label: '站点外观',
    items: [
      { label: '站点设置', to: '/admin/settings', icon: 'i-lucide-settings-2' },
      { label: '主导航', to: '/admin/menus', icon: 'i-lucide-list-tree' },
      { label: '侧栏', to: '/admin/sidebar', icon: 'i-lucide-panel-right' },
      { label: '页脚', to: '/admin/settings?tab=footer', icon: 'i-lucide-panel-bottom' }
    ]
  },
  {
    id: 'integrations',
    label: 'AI 与接入',
    items: [
      { label: 'AI 知识库', to: '/admin/knowledge', icon: 'i-lucide-orbit' },
      { label: 'Agent 发布接入', to: '/admin/agent', icon: 'i-lucide-plug-zap' }
    ]
  }
]
const currentGroup = computed(() => groups.find(group => group.items.some(item => isActive(item.to)))?.id)
const expanded = useState<Record<string, boolean>>('admin-nav-expanded', () => ({
  content: true,
  ...(currentGroup.value ? { [currentGroup.value]: true } : {})
}))

watch(currentGroup, (group) => {
  if (group) expanded.value[group] = true
})

function isActive(path: string) {
  if (route.path === '/admin/menus' && route.query.location === 'footer') return path === '/admin/settings?tab=footer'
  if (route.path === '/admin/settings') {
    const isFooter = ['footer', 'footerActions'].includes(String(route.query.tab))
    if (path === '/admin/settings?tab=footer') return isFooter
    if (path === '/admin/settings') return !isFooter
  }
  return route.path === path || (path !== '/admin' && route.path.startsWith(path + '/'))
}
</script>
