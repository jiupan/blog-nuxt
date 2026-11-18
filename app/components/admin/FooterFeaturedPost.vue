<template>
  <div class="flex flex-wrap items-center gap-2">
    <USelectMenu
      v-model="postId"
      v-model:search-term="search"
      :items="options"
      value-key="value"
      placeholder="选择一篇文章"
      :aria-label="label || '精选文章'"
      :search-input="{ placeholder: '搜索文章标题或正文' }"
      :loading="status === 'pending'"
      :disabled="disabled"
      ignore-filter
      class="min-w-0 flex-1"
    >
      <template #empty>{{ error ? '文章加载失败，请重试' : status === 'pending' ? '正在查找文章…' : '没有匹配的公开文章' }}</template>
    </USelectMenu>
    <UButton v-if="postId && !requiredSelection" type="button" color="neutral" variant="ghost" :disabled="disabled" @click="postId = ''">清除选择</UButton>
    <UButton v-if="error" type="button" color="neutral" variant="ghost" @click="refresh()">重试</UButton>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import type { AdminPostListItem, PublicPostListPayload } from '~~/types/dto/post'

type PostOption = { value: string, label: string }
const props = defineProps<{ disabled?: boolean, pickerKey?: string, label?: string, requiredSelection?: boolean }>()
const postId = defineModel<string>({ required: true })
const search = ref('')
const keyword = ref('')
watch(search, (value, _, onCleanup) => {
  const timer = setTimeout(() => { keyword.value = value.trim() }, 200)
  onCleanup(() => clearTimeout(timer))
})

const { data: results, status, error, refresh } = useLazyFetch('/api/posts', {
  key: props.pickerKey || 'footer-featured-post-options',
  query: { keyword, page: 1, pageSize: 12 },
  transform: (result: ApiResult<PublicPostListPayload>) => result.data.items.map(post => ({ value: String(post.id), label: post.title }))
})
const selected = ref<PostOption>()
const options = computed(() => {
  const items = results.value ?? []
  if (!selected.value || items.some(item => item.value === selected.value?.value)) return items
  return [selected.value, ...items]
})

watch(postId, async (id, _, onCleanup) => {
  selected.value = results.value?.find(item => item.value === id)
  if (!id || selected.value) return
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  selected.value = { value: id, label: '正在加载已选文章…' }
  try {
    const { data: post } = await $fetch<ApiResult<AdminPostListItem>>(`/api/admin/posts/${id}`, { signal: controller.signal })
    if (controller.signal.aborted) return
    const published = post.status === 'PUBLISHED' && post.publishedAt && new Date(post.publishedAt).getTime() <= Date.now()
    selected.value = { value: id, label: published ? post.title : `${post.title}（未公开）` }
  } catch {
    if (!controller.signal.aborted) selected.value = { value: id, label: '已选文章无法读取，请重新选择' }
  }
}, { immediate: true })
</script>
