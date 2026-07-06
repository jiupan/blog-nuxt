<template>
  <div class="summary-tool">
    <div class="summary-field">
      <span>提问内容</span>
      <textarea
        v-model="question"
        class="semantic-input ask-input"
        rows="4"
        maxlength="300"
        placeholder="例如：这个博客里提到过哪些 Nuxt SEO 优化方法？"
        :disabled="loading"
        @keydown.ctrl.enter.prevent="$emit('ask')"
        @keydown.meta.enter.prevent="$emit('ask')"
      />
      <small class="field-hint">{{ questionLength }}/300，至少 5 个字</small>
    </div>

    <div v-if="error" class="summary-alert">
      {{ error }}
    </div>

    <div v-if="result" class="ask-result">
      <section class="ask-answer">
        <h3>回答</h3>
        <p>{{ result.answer }}</p>
      </section>

      <section v-if="result.citations.length" class="ask-citations">
        <h3>参考来源</h3>
        <NuxtLink v-for="item in result.citations" :key="`${item.postId}-${item.headingPath || item.title}`" :to="postPath(item.slug)">
          <span>{{ item.headingPath || '文章片段' }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.excerpt }}</p>
        </NuxtLink>
      </section>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <MessageSquareTextIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在检索站内内容并生成回答...' : '输入问题后，AI 会基于已发布文章回答并附来源。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Loader2 as Loader2Icon,
  MessageSquareText as MessageSquareTextIcon
} from '@lucide/vue'
import { postPath } from '~/utils/post-path'
import type { AskResult } from './lab.types'

defineProps<{
  loading: boolean
  error: string
  result: AskResult | null
  questionLength: number
}>()

defineEmits<{
  ask: []
}>()

const question = defineModel<string>('question', { required: true })
</script>
