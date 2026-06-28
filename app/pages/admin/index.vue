<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">仪表盘</h1>
      <UButton icon="i-lucide-plus" to="/admin/posts/create">新建文章</UButton>
    </div>
    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <div class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="text-sm text-gray-500">文章</div>
        <div class="mt-2 text-3xl font-semibold">{{ posts.length }}</div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="text-sm text-gray-500">分类</div>
        <div class="mt-2 text-3xl font-semibold">{{ categories.length }}</div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-5">
        <div class="text-sm text-gray-500">标签</div>
        <div class="mt-2 text-3xl font-semibold">{{ tags.length }}</div>
      </div>
    </div>
    <div class="mt-8 rounded-lg border border-gray-200 bg-white">
      <div class="border-b border-gray-200 px-5 py-4 font-medium">最近文章</div>
      <div class="divide-y divide-gray-100">
        <NuxtLink v-for="post in posts.slice(0, 8)" :key="post.id" :to="`/admin/posts/${post.id}`" class="flex items-center justify-between px-5 py-4">
          <span>{{ post.title }}</span>
          <UBadge :color="post.status === 'PUBLISHED' ? 'success' : 'neutral'" variant="soft">{{ post.status }}</UBadge>
        </NuxtLink>
      </div>
    </div>
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
</script>
