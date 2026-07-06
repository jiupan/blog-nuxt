<template>
  <div class="summary-tool">
    <div v-if="error" class="summary-alert">
      {{ error }}
    </div>

    <div v-if="result" class="draft-result">
      <section class="draft-summary">
        <article>
          <span>草稿</span>
          <strong>{{ result.summary.total }}</strong>
        </article>
        <article>
          <span>快完成</span>
          <strong>{{ result.summary.ready }}</strong>
        </article>
        <article>
          <span>补信息</span>
          <strong>{{ result.summary.needsMetadata }}</strong>
        </article>
        <article>
          <span>补结构</span>
          <strong>{{ result.summary.needsStructure + result.summary.earlyIdea }}</strong>
        </article>
      </section>

      <section v-if="result.items.length" class="draft-list">
        <article v-for="item in result.items" :key="item.id">
          <div class="draft-item-head">
            <span :class="`priority-${item.priority.toLowerCase().replaceAll('_', '-')}`">{{ draftPriorityLabel(item.priority) }}</span>
            <strong>{{ item.completionScore }}</strong>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.wordCount }} 字 · {{ item.category || '未分类' }} · {{ item.tags.length ? item.tags.join(' / ') : '无标签' }}</p>
          <ul v-if="item.missing.length">
            <li v-for="missing in item.missing" :key="missing">{{ missing }}</li>
          </ul>
          <div v-if="item.suggestions.length" class="draft-suggestions">
            <span v-for="suggestion in item.suggestions" :key="suggestion">{{ suggestion }}</span>
          </div>
          <NuxtLink :to="`/admin/posts/${item.id}`" class="recommend-admin-link">
            继续编辑
            <ChevronRightIcon aria-hidden="true" />
          </NuxtLink>
        </article>
      </section>

      <div v-else class="summary-empty">
        <ArchiveIcon aria-hidden="true" />
        <span>当前没有草稿。</span>
      </div>
    </div>

    <div v-else class="summary-empty">
      <Loader2Icon v-if="loading" class="summary-spinner" aria-hidden="true" />
      <ArchiveIcon v-else aria-hidden="true" />
      <span>{{ loading ? '正在整理草稿...' : '扫描后台草稿，判断完成度和下一步处理顺序。' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Archive as ArchiveIcon,
  ChevronRight as ChevronRightIcon,
  Loader2 as Loader2Icon
} from '@lucide/vue'
import type { DraftOrganizerResult, DraftPriority } from './lab.types'

defineProps<{
  loading: boolean
  error: string
  result: DraftOrganizerResult | null
  draftPriorityLabel: (priority: DraftPriority) => string
}>()
</script>
