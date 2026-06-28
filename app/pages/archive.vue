<template>
  <div class="mx-auto max-w-4xl px-4 py-10">
    <h1 class="text-3xl font-semibold">归档</h1>
    <div class="mt-8 grid gap-6">
      <section v-for="group in groups" :key="group.year">
        <h2 class="text-xl font-semibold">{{ group.year }}</h2>
        <div class="mt-3 grid gap-3">
          <NuxtLink v-for="post in group.posts" :key="post.id" :to="`/posts/${post.slug}`" class="flex justify-between rounded-lg border border-gray-200 bg-white p-4">
            <span>{{ post.title }}</span>
            <span class="text-sm text-gray-500">{{ formatDate(post.publishedAt) }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data } = await useFetch('/api/posts', { query: { pageSize: 100 } })
const posts = computed(() => data.value?.data.items || [])
const groups = computed(() => {
  const map = new Map<number, typeof posts.value>()
  for (const post of posts.value) {
    if (!post.publishedAt) {
      continue
    }
    const year = new Date(post.publishedAt).getFullYear()
    map.set(year, [...(map.get(year) || []), post])
  }
  return [...map.entries()].map(([year, groupPosts]) => ({ year, posts: groupPosts }))
})

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : ''
}
</script>
