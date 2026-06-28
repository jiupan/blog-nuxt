<template>
  <div class="mx-auto max-w-6xl px-4 py-10">
    <div class="flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl font-semibold text-gray-950">文章</h1>
        <p class="mt-2 text-gray-600">记录技术、项目和想法。</p>
      </div>
      <UInput v-model="keyword" icon="i-lucide-search" placeholder="搜索文章" class="md:w-72" @keyup.enter="refresh" />
    </div>

    <div class="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
      <aside class="space-y-6">
        <div>
          <h2 class="text-sm font-semibold text-gray-900">分类</h2>
          <div class="mt-3 grid gap-2 text-sm text-gray-600">
            <NuxtLink to="/posts">全部</NuxtLink>
            <NuxtLink v-for="item in categories" :key="item.id" :to="`/categories/${item.slug}`">{{ item.name }}</NuxtLink>
          </div>
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900">标签</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <NuxtLink
              v-for="item in tags"
              :key="item.id"
              :to="`/tags/${item.slug}`"
              class="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs"
            >
              {{ item.name }}
            </NuxtLink>
          </div>
        </div>
      </aside>

      <div class="grid gap-4">
        <article v-for="post in posts" :key="post.id" class="rounded-lg border border-gray-200 bg-white p-5">
          <NuxtLink :to="`/posts/${post.slug}`" class="text-xl font-semibold text-gray-950">{{ post.title }}</NuxtLink>
          <p class="mt-3 text-sm leading-6 text-gray-600">{{ post.summary }}</p>
          <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span>{{ formatDate(post.publishedAt) }}</span>
            <span v-if="post.category">{{ post.category.name }}</span>
            <span>{{ post.viewCount }} 次阅读</span>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const keyword = ref('')
const { data, refresh } = await useFetch('/api/posts', {
  query: computed(() => ({ keyword: keyword.value || undefined }))
})
const { data: categoryData } = await useFetch('/api/categories')
const { data: tagData } = await useFetch('/api/tags')
const posts = computed(() => data.value?.data.items || [])
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

useSeoMeta({
  title: '文章',
  description: '博客文章列表'
})

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : ''
}
</script>
