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
      <section class="seo-score-card">
        <span>SEO 分数</span>
        <strong>{{ result.score }}</strong>
      </section>

      <section v-if="problems.length">
        <h3>待优化项</h3>
        <ul>
          <li v-for="item in problems" :key="item.key">{{ item.title }}：{{ item.description }}</li>
        </ul>
      </section>

      <section>
        <h3>AI 修复建议</h3>
        <ul>
          <li v-for="item in result.advice.fixes" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section>
        <h3>SEO 标题和描述</h3>
        <p>{{ result.advice.seoTitle }}</p>
        <p>{{ result.advice.seoDescription }}</p>
      </section>

      <NuxtLink v-if="isAdmin && selectedId" :to="`/admin/posts/${selectedId}`" class="recommend-admin-link">
        去后台编辑页应用
        <ChevronRightIcon aria-hidden="true" />
      </NuxtLink>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <TargetIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在检查 SEO...' : '选择文章后检查标题、描述、结构、图片和链接。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronRight as ChevronRightIcon,
  Loader2 as Loader2Icon,
  Target as TargetIcon
} from '@lucide/vue'
import type { SeoCheckIssue, SeoCheckResult, SummaryPost } from './lab.types'

defineProps<{
  posts: SummaryPost[]
  selectedPost?: SummaryPost | null
  selectedId: string
  loading: boolean
  error: string
  result: SeoCheckResult | null
  problems: SeoCheckIssue[]
  isAdmin: boolean
}>()

defineEmits<{
  selectPost: [post: SummaryPost]
}>()

const selectOpen = defineModel<boolean>('selectOpen', { required: true })
const selectRef = defineModel<HTMLElement | null>('selectRef', { required: true })
</script>
