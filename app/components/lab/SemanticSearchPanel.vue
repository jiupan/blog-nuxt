<template>
  <div class="summary-tool">
    <div class="summary-field">
      <span>搜索内容</span>
      <textarea
        v-model="query"
        class="semantic-input"
        rows="3"
        placeholder="例如：Nuxt 图片加载怎么优化？"
        :disabled="loading"
      />
    </div>

    <div v-if="error" class="summary-alert">
      {{ error }}
    </div>

    <div v-if="results.length" class="semantic-result">
      <NuxtLink v-for="item in results" :key="item.chunkId" :to="postPath(item.slug)">
        <span>{{ item.headingPath || '文章片段' }}</span>
        <strong>{{ item.title }}</strong>
        <p>{{ item.excerpt }}</p>
      </NuxtLink>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <BrainCircuitIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在语义检索...' : '输入自然语言问题，搜索站内相关文章片段。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BrainCircuit as BrainCircuitIcon,
  Loader2 as Loader2Icon
} from '@lucide/vue'
import { postPath } from '~/utils/post-path'
import type { SemanticSearchResult } from './lab.types'

defineProps<{
  loading: boolean
  error: string
  results: SemanticSearchResult[]
}>()

const query = defineModel<string>('query', { required: true })
</script>
