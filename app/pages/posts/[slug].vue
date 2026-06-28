<template>
  <article class="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_240px]">
    <div class="min-w-0">
      <NuxtLink to="/posts" class="text-sm text-emerald-700">返回文章列表</NuxtLink>
      <h1 class="mt-4 text-4xl font-semibold tracking-normal text-gray-950">{{ post.title }}</h1>
      <p class="mt-4 text-lg leading-8 text-gray-600">{{ post.summary }}</p>
      <div class="mt-5 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <span>{{ formatDate(post.publishedAt) }}</span>
        <span v-if="post.category">{{ post.category.name }}</span>
        <span>{{ post.rendered.readingTime }} 分钟阅读</span>
      </div>
      <NuxtImg v-if="post.cover" :src="post.cover" :alt="post.title" class="mt-8 w-full rounded-lg object-cover" />
      <div class="prose-blog mt-8 rounded-lg border border-gray-200 bg-white p-6" v-html="post.rendered.html" />
      <nav class="mt-8 grid gap-4 md:grid-cols-2">
        <NuxtLink v-if="post.previous" :to="`/posts/${post.previous.slug}`" class="rounded-lg border border-gray-200 bg-white p-4">
          <span class="text-xs text-gray-500">上一篇</span>
          <div class="mt-1 font-medium">{{ post.previous.title }}</div>
        </NuxtLink>
        <NuxtLink v-if="post.next" :to="`/posts/${post.next.slug}`" class="rounded-lg border border-gray-200 bg-white p-4">
          <span class="text-xs text-gray-500">下一篇</span>
          <div class="mt-1 font-medium">{{ post.next.title }}</div>
        </NuxtLink>
      </nav>
    </div>
    <aside class="hidden lg:block">
      <div class="sticky top-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 class="text-sm font-semibold">目录</h2>
        <div class="mt-3 grid gap-2 text-sm text-gray-600">
          <a
            v-for="item in post.rendered.toc"
            :key="item.id"
            :href="`#${item.id}`"
            :class="item.level === 3 ? 'pl-4' : ''"
          >
            {{ item.text }}
          </a>
        </div>
      </div>
    </aside>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const { data, error } = await useFetch(`/api/posts/${route.params.slug}`)

if (error.value || !data.value?.data) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
}

const post = computed(() => data.value!.data)

useSeoMeta({
  title: () => post.value.seoTitle || post.value.title,
  description: () => post.value.seoDescription || post.value.summary || '',
  ogTitle: () => post.value.title,
  ogDescription: () => post.value.summary || '',
  ogImage: () => post.value.cover || ''
})

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : ''
}
</script>
