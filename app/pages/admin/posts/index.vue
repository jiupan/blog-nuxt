<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">文章管理</h1>
      <UButton icon="i-lucide-plus" to="/admin/posts/create">新建文章</UButton>
    </div>
    <div class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600">
          <tr>
            <th class="px-4 py-3">标题</th>
            <th class="px-4 py-3">状态</th>
            <th class="px-4 py-3">更新时间</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="post in posts" :key="post.id">
            <td class="px-4 py-3 font-medium">{{ post.title }}</td>
            <td class="px-4 py-3">
              <UBadge :color="post.status === 'PUBLISHED' ? 'success' : 'neutral'" variant="soft">{{ post.status }}</UBadge>
            </td>
            <td class="px-4 py-3 text-gray-500">{{ formatDate(post.updatedAt) }}</td>
            <td class="px-4 py-3 text-right">
              <UButton size="sm" variant="ghost" :to="`/admin/posts/${post.id}`">编辑</UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

const { data } = await useFetch('/api/admin/posts')
const posts = computed(() => data.value?.data.items || [])

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : ''
}
</script>
