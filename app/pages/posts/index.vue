<template>
  <div class="mx-auto px-4 py-10" style="width: min(100% - 32px, 1290px)">
    <div class="flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-3xl font-semibold text-gray-950">文章</h1>
        <p class="mt-2 text-gray-600">记录技术、项目和想法。</p>
      </div>
      <UInput v-model="keyword" icon="i-lucide-search" placeholder="搜索文章" class="md:w-72" @keyup.enter="refresh" />
    </div>

    <div class="mt-6 grid gap-8 md:grid-cols-[260px_1fr]">
      <PublicSidebar
        class="posts-sidebar"
        :site-name="siteName"
        :description="siteSettings.sidebar_description"
        :categories="categories"
        :tags="tags"
        :posts="posts"
      />

      <div class="grid gap-4">
        <article v-for="post in posts" :key="post.id" class="rounded-lg border border-gray-200 bg-white p-5">
          <div class="post-list-title-row">
            <NuxtLink :to="postPath(post.slug)" class="text-xl font-semibold text-gray-950">{{ post.title }}</NuxtLink>
            <span v-if="post.isPinned" class="post-list-pin">
              <UIcon name="i-lucide-pin" class="size-3" />
              置顶
            </span>
          </div>
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
const route = useRoute()
const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const { data, refresh } = await useFetch('/api/posts', {
  query: computed(() => ({ keyword: keyword.value || undefined }))
})
const { data: categoryData } = await useFetch('/api/categories')
const { data: tagData } = await useFetch('/api/tags')
const posts = computed(() => data.value?.data.items || [])
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

watch(() => route.query.keyword, (value) => {
  keyword.value = typeof value === 'string' ? value : ''
})

useSeoMeta({
  title: '文章',
  description: '博客文章列表'
})

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : ''
}
</script>

<style scoped>
.posts-sidebar {
  position: sticky;
  top: 84px;
  align-self: start;
}

.post-list-title-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.post-list-pin {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  color: #b45309;
  font-size: 0.72rem;
  font-weight: 850;
  line-height: 1;
  padding: 0.28rem 0.5rem;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .posts-sidebar {
    position: static;
  }
}
</style>
