<template>
  <div class="summary-tool">
    <PostSelectField
      v-model:open="selectOpen"
      v-model:select-ref="selectRef"
      :posts="posts"
      :selected-post="selectedPost"
      :selected-id="selectedId"
      :disabled="loading"
      placeholder="请选择一篇文章"
      @select-post="$emit('selectPost', $event)"
    />

    <div v-if="error" class="summary-alert">
      {{ error }}
    </div>

    <div v-if="result" class="link-check-result">
      <section class="link-check-summary">
        <article>
          <span>总链接</span>
          <strong>{{ result.summary.total }}</strong>
        </article>
        <article>
          <span>正常</span>
          <strong>{{ result.summary.ok }}</strong>
        </article>
        <article>
          <span>异常</span>
          <strong>{{ result.summary.broken + result.summary.timeout + result.summary.unknown }}</strong>
        </article>
        <article>
          <span>跳转</span>
          <strong>{{ result.summary.redirect }}</strong>
        </article>
      </section>

      <section v-if="result.items.length" class="link-check-list">
        <article v-for="item in result.items" :key="`${item.url}-${item.line}`">
          <div>
            <span :class="`status-${item.status.toLowerCase()}`">{{ linkStatusLabel(item.status) }}</span>
            <small>第 {{ item.line }} 行</small>
          </div>
          <strong>{{ item.text || item.url }}</strong>
          <a :href="item.url" target="_blank" rel="noopener noreferrer">{{ item.url }}</a>
          <p v-if="item.finalUrl">跳转到：{{ item.finalUrl }}</p>
          <p v-else-if="item.error">{{ item.error }}</p>
        </article>
      </section>

      <div v-else class="summary-empty">
        <Link2OffIcon aria-hidden="true" />
        <span>这篇文章没有检测到外部链接。</span>
      </div>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <Link2OffIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在检查外部链接...' : '选择文章后扫描外链状态、跳转和超时。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Link2Off as Link2OffIcon,
  Loader2 as Loader2Icon
} from '@lucide/vue'
import type { LinkCheckResult, LinkCheckStatus, SummaryPost } from './lab.types'

defineProps<{
  posts: SummaryPost[]
  selectedPost?: SummaryPost | null
  selectedId: string
  loading: boolean
  error: string
  result: LinkCheckResult | null
  linkStatusLabel: (status: LinkCheckStatus) => string
}>()

defineEmits<{
  selectPost: [post: SummaryPost]
}>()

const selectOpen = defineModel<boolean>('selectOpen', { required: true })
const selectRef = defineModel<HTMLElement | null>('selectRef', { required: true })
</script>
