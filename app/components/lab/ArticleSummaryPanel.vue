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

    <div v-if="result" class="summary-result">
      <section>
        <h3>摘要</h3>
        <p>{{ result.summary }}</p>
      </section>

      <section>
        <h3>文章要点</h3>
        <ul>
          <li v-for="item in result.highlights" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section>
        <h3>适合读者</h3>
        <p>{{ result.audience }}</p>
      </section>

      <section>
        <h3>延伸问题</h3>
        <ul>
          <li v-for="item in result.questions" :key="item">{{ item }}</li>
        </ul>
      </section>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <SparklesIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在生成文章摘要...' : '选择文章后生成摘要、要点和延伸问题。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Loader2 as Loader2Icon,
  Sparkles as SparklesIcon
} from '@lucide/vue'
import type { SummaryPost, SummaryResult } from './lab.types'

defineProps<{
  posts: SummaryPost[]
  selectedPost?: SummaryPost | null
  selectedId: string
  loading: boolean
  error: string
  result: SummaryResult | null
}>()

defineEmits<{
  selectPost: [post: SummaryPost]
}>()

const selectOpen = defineModel<boolean>('selectOpen', { required: true })
const selectRef = defineModel<HTMLElement | null>('selectRef', { required: true })
</script>
