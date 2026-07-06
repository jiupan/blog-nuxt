<template>
  <div class="summary-tool">
    <PostSelectField
      v-model:open="selectOpen"
      v-model:select-ref="selectRef"
      :posts="posts"
      :selected-post="selectedPost"
      :selected-id="selectedId"
      :disabled="loading"
      placeholder="请选择一篇已发布文章"
      @select-post="$emit('selectPost', $event)"
    />

    <div v-if="error" class="summary-alert">
      {{ error }}
    </div>

    <div v-if="items.length" class="recommend-result">
      <article v-for="item in items" :key="item.relatedPostId">
        <span>{{ relationTypeLabel(item.type) }}</span>
        <strong>{{ item.title }}</strong>
        <p>{{ item.reason }}</p>
      </article>
      <NuxtLink v-if="isAdmin && selectedId" :to="`/admin/posts/${selectedId}`" class="recommend-admin-link">
        去后台编辑页保存
        <ChevronRightIcon aria-hidden="true" />
      </NuxtLink>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <NetworkIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在生成关联推荐...' : '选择文章后生成继续阅读推荐。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight as ChevronRightIcon,
  Loader2 as Loader2Icon,
  Network as NetworkIcon
} from '@lucide/vue'
import type { RecommendResultItem, SummaryPost } from './lab.types'

defineProps<{
  posts: SummaryPost[]
  selectedPost?: SummaryPost | null
  selectedId: string
  loading: boolean
  error: string
  items: RecommendResultItem[]
  isAdmin: boolean
  relationTypeLabel: (type: string) => string
}>()

defineEmits<{
  selectPost: [post: SummaryPost]
}>()

const selectOpen = defineModel<boolean>('selectOpen', { required: true })
const selectRef = defineModel<HTMLElement | null>('selectRef', { required: true })
</script>
