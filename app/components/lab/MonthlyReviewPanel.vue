<template>
  <div class="summary-tool">
    <div class="summary-field">
      <span>选择月份</span>
      <input
        v-model="month"
        class="semantic-input month-input"
        type="month"
        :disabled="loading"
      />
    </div>

    <div v-if="error" class="summary-alert">
      {{ error }}
    </div>

    <div v-if="result" class="monthly-result">
      <section class="monthly-summary">
        <article>
          <span>文章</span>
          <strong>{{ result.summary.postCount }}</strong>
        </article>
        <article>
          <span>浏览</span>
          <strong>{{ result.summary.totalViews }}</strong>
        </article>
        <article>
          <span>主分类</span>
          <strong>{{ result.summary.topCategory || '-' }}</strong>
        </article>
      </section>

      <section v-if="result.summary.topTags.length" class="site-panel">
        <h3>本月标签</h3>
        <div class="insight-tags">
          <span v-for="tag in result.summary.topTags" :key="tag">{{ tag }}</span>
        </div>
      </section>

      <section class="site-panel">
        <h3>本月亮点</h3>
        <ul>
          <li v-for="item in result.highlights" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section v-if="result.posts.length" class="monthly-posts">
        <NuxtLink v-for="item in result.posts" :key="item.id" :to="postPath(item.slug)">
          <span>{{ formatMonthDate(item.publishedAt) }} · {{ item.viewCount }} views</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.summary || item.category || '未填写摘要' }}</p>
        </NuxtLink>
      </section>

      <section class="site-panel monthly-markdown">
        <div>
          <h3>月报 Markdown</h3>
          <button type="button" @click="$emit('copyMarkdown')">
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>
        <p v-if="copyError" class="inline-error">{{ copyError }}</p>
        <pre>{{ result.markdown }}</pre>
      </section>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <CalendarDaysIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在生成月度回顾...' : '选择月份后生成文章月报和 Markdown 草稿。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CalendarDays as CalendarDaysIcon,
  Loader2 as Loader2Icon
} from '@lucide/vue'
import { postPath } from '~/utils/post-path'
import type { MonthlyReviewResult } from './lab.types'

defineProps<{
  loading: boolean
  error: string
  result: MonthlyReviewResult | null
  copied: boolean
  copyError: string
  formatMonthDate: (value: string) => string
}>()

defineEmits<{
  copyMarkdown: []
}>()

const month = defineModel<string>('month', { required: true })
</script>
