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

    <div v-if="result" class="writing-result">
      <section class="writing-score-card">
        <span>完成度</span>
        <strong>{{ result.completionScore }}</strong>
      </section>

      <section>
        <h3>摘要建议</h3>
        <p>{{ result.summary }}</p>
      </section>

      <section>
        <h3>SEO 建议</h3>
        <p>{{ result.seoTitle }}</p>
        <p>{{ result.seoDescription }}</p>
      </section>

      <section>
        <h3>还可以补充</h3>
        <ul>
          <li v-for="item in result.missingPoints" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section>
        <h3>标题建议</h3>
        <ul>
          <li v-for="item in result.titleSuggestions" :key="item">{{ item }}</li>
        </ul>
      </section>

      <NuxtLink v-if="isAdmin && selectedId" :to="`/admin/posts/${selectedId}`" class="recommend-admin-link">
        去后台编辑页应用
        <ChevronRightIcon aria-hidden="true" />
      </NuxtLink>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <PenToolIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在分析文章...' : '选择文章后分析摘要、SEO、标题和内容完整度。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight as ChevronRightIcon,
  Loader2 as Loader2Icon,
  PenTool as PenToolIcon
} from '@lucide/vue'
import type { SummaryPost, WritingAssistantResult } from './lab.types'

defineProps<{
  posts: SummaryPost[]
  selectedPost?: SummaryPost | null
  selectedId: string
  loading: boolean
  error: string
  result: WritingAssistantResult | null
  isAdmin: boolean
}>()

defineEmits<{
  selectPost: [post: SummaryPost]
}>()

const selectOpen = defineModel<boolean>('selectOpen', { required: true })
const selectRef = defineModel<HTMLElement | null>('selectRef', { required: true })
</script>
