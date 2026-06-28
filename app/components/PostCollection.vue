<template>
  <div class="mx-auto max-w-4xl px-4 py-10">
    <h1 class="text-3xl font-semibold">{{ title }}</h1>
    <div class="mt-6 grid gap-4">
      <article v-for="post in posts" :key="post.id" class="rounded-lg border border-gray-200 bg-white p-5">
        <NuxtLink :to="postPath(post.slug)" class="text-xl font-semibold">{{ post.title }}</NuxtLink>
        <p class="mt-3 text-sm leading-6 text-gray-600">{{ post.summary }}</p>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  query: Record<string, string>
}>()

const { data } = await useFetch('/api/posts', { query: props.query })
const posts = computed(() => data.value?.data.items || [])
</script>
