<template>
  <div class="admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <p>Admin Console</p>
        <h1>仪表盘</h1>
      </div>
      <div class="admin-page-actions">
        <UButton color="neutral" variant="outline" icon="i-lucide-newspaper" to="/admin/posts">文章列表</UButton>
        <UButton icon="i-lucide-plus" to="/admin/posts/create">新建文章</UButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-3">
      <div v-for="card in statCards" :key="card.label" class="admin-stat-card">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-slate-500">{{ card.label }}</div>
          <span class="grid size-9 place-items-center rounded-lg" :class="card.iconClass">
            <UIcon :name="card.icon" class="size-4" />
          </span>
        </div>
        <div class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{{ card.value }}</div>
        <div class="mt-2 text-xs text-slate-500">{{ card.hint }}</div>
      </div>
    </div>

    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2 class="text-base font-semibold text-slate-950">最近文章</h2>
          <p class="mt-1 text-sm text-slate-500">按接口返回顺序展示最近 8 篇内容</p>
        </div>
        <UButton color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" to="/admin/posts">全部文章</UButton>
      </div>
      <div v-if="posts.length" class="divide-y divide-slate-100">
        <NuxtLink
          v-for="post in posts.slice(0, 8)"
          :key="post.id"
          :to="`/admin/posts/${post.id}`"
          class="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50"
        >
          <span class="min-w-0">
            <span class="block truncate font-medium text-slate-900">{{ post.title }}</span>
            <span class="mt-1 block text-xs text-slate-500">{{ formatDate(post.updatedAt) }}</span>
          </span>
          <UBadge :color="post.status === 'PUBLISHED' ? 'success' : 'neutral'" variant="soft">
            {{ statusText(post.status) }}
          </UBadge>
        </NuxtLink>
      </div>
      <div v-else class="grid place-items-center px-4 py-10 text-center">
        <UIcon name="i-lucide-file-plus-2" class="size-10 text-slate-300" />
        <p class="mt-3 font-medium text-slate-900">还没有文章</p>
        <UButton class="mt-4" icon="i-lucide-plus" to="/admin/posts/create">创建第一篇文章</UButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

const { data: postData } = await useFetch('/api/admin/posts')
const { data: categoryData } = await useFetch('/api/admin/categories')
const { data: tagData } = await useFetch('/api/admin/tags')
const posts = computed(() => postData.value?.data.items || [])
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

const statCards = computed(() => [
  {
    label: '文章',
    value: posts.value.length,
    hint: `${publishedCount.value} 篇已发布，${draftCount.value} 篇草稿`,
    icon: 'i-lucide-newspaper',
    iconClass: 'bg-sky-50 text-sky-700'
  },
  {
    label: '分类',
    value: categories.value.length,
    hint: '用于组织文章频道',
    icon: 'i-lucide-folder-tree',
    iconClass: 'bg-emerald-50 text-emerald-700'
  },
  {
    label: '标签',
    value: tags.value.length,
    hint: '用于内容检索和聚合',
    icon: 'i-lucide-tags',
    iconClass: 'bg-amber-50 text-amber-700'
  }
])

const publishedCount = computed(() => posts.value.filter((post: any) => post.status === 'PUBLISHED').length)
const draftCount = computed(() => posts.value.filter((post: any) => post.status !== 'PUBLISHED').length)

function statusText(status?: string) {
  return status === 'PUBLISHED' ? '已发布' : '草稿'
}

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : ''
}
</script>
