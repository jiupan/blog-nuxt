<template>
  <section id="comments" class="comment-section" aria-labelledby="comment-heading" :aria-busy="loading">
    <header class="comment-heading">
      <div class="comment-heading-title">
        <Icon name="i-lucide-message-circle" aria-hidden="true" />
        <h2 id="comment-heading">评论</h2>
        <span v-if="!loadError" class="comment-heading-count">{{ total }} 条讨论</span>
      </div>
    </header>

    <CommentComposer variant="root" />

    <div class="comment-toolbar">
      <div class="comment-sort" role="group" aria-label="评论排序">
        <button
          type="button"
          class="comment-sort-option"
          :class="{ 'is-active': sort === 'newest' }"
          :aria-pressed="sort === 'newest'"
          @click="setSort('newest')"
        >
          最新
        </button>
        <button
          type="button"
          class="comment-sort-option"
          :class="{ 'is-active': sort === 'oldest' }"
          :aria-pressed="sort === 'oldest'"
          @click="setSort('oldest')"
        >
          最早
        </button>
      </div>
    </div>

    <div v-if="loading" class="comment-state is-loading" role="status">
      <Icon name="i-lucide-loader-circle" aria-hidden="true" />
      <span>正在加载评论…</span>
    </div>
    <div v-else-if="loadError" class="comment-state" role="alert">
      <Icon name="i-lucide-circle-alert" aria-hidden="true" />
      <strong>评论区加载失败</strong>
      <button type="button" @click="reload">重新加载</button>
    </div>
    <div v-else-if="!threads.length" class="comment-state">
      <Icon name="i-lucide-message-square" aria-hidden="true" />
      <strong>还没有评论</strong>
      <span>来做第一个留言的人。</span>
    </div>

    <ol v-else class="comment-thread-list">
      <li v-for="thread in threads" :key="thread.id">
        <CommentThread :thread="thread" />
      </li>
    </ol>

    <button
      v-if="nextCursor && !loadError"
      type="button"
      class="comment-load-more"
      :disabled="loadingMore"
      @click="loadMore"
    >
      {{ loadingMore ? '加载中…' : '加载更多讨论' }}
    </button>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  postId: number
  postSlug: string
}>()

const context = usePostComments(() => props.postSlug, () => props.postId)

const threads = computed(() => context.threads.value)
const total = computed(() => context.total.value)
const nextCursor = computed(() => context.nextCursor.value)
const sort = computed(() => context.sort.value)
const loading = computed(() => context.loading.value)
const loadingMore = computed(() => context.loadingMore.value)
const loadError = computed(() => context.loadError.value)

function reload() {
  void context.reload()
}

function loadMore() {
  void context.loadMore()
}

function setSort(next: 'newest' | 'oldest') {
  void context.setSort(next)
}
</script>

<style scoped>
.comment-section {
  margin-top: 20px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-surface);
  padding: 24px;
  color: var(--theme-text);
}

.comment-heading {
  margin-bottom: 16px;
}

.comment-heading-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.comment-heading-title > :deep(svg) {
  width: 19px;
  height: 19px;
  color: var(--theme-accent);
}

.comment-heading h2 {
  margin: 0;
  color: var(--theme-text);
  font-size: 21px;
  font-weight: 800;
}

.comment-heading-count {
  color: var(--theme-text-muted);
  font-size: 13px;
}

.comment-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 18px 0 12px;
  border-top: 1px solid var(--theme-border-soft);
  padding-top: 14px;
}

.comment-sort {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.comment-sort-option {
  min-height: 32px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  padding: 0 12px;
  color: var(--theme-text-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.comment-sort-option:hover {
  color: var(--theme-accent);
}

.comment-sort-option.is-active {
  border-color: var(--theme-border);
  background: var(--theme-accent-soft);
  color: var(--theme-accent);
  font-weight: 700;
}

.comment-state {
  display: grid;
  min-height: 124px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed var(--theme-border-soft);
  border-radius: 10px;
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
  font-size: 14px;
}

.comment-state > :deep(svg) {
  color: var(--theme-accent);
  font-size: 23px;
}

.comment-state.is-loading > :deep(svg) {
  animation: comment-spin 1s linear infinite;
}

.comment-state strong {
  color: var(--theme-text);
}

.comment-state button {
  border: 1px solid var(--theme-border-soft);
  border-radius: 8px;
  background: var(--theme-surface);
  padding: 7px 13px;
  color: var(--theme-text);
  font: inherit;
  cursor: pointer;
}

.comment-thread-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment-load-more {
  display: block;
  width: 100%;
  min-height: 38px;
  margin-top: 12px;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-surface);
  color: var(--theme-text-muted);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.comment-load-more:hover:not(:disabled) {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.comment-load-more:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes comment-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .comment-state.is-loading > :deep(svg) {
    animation: none;
  }
}

@media (max-width: 640px) {
  .comment-section {
    padding: 17px 12px;
  }

  .comment-sort-option {
    min-height: 40px;
  }

  .comment-load-more {
    min-height: 44px;
  }
}
</style>
