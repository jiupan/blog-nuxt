<template>
  <div class="comments-admin">
    <header class="workspace-heading">
      <div>
        <h1>评论管理</h1>
        <p>审核访客评论，隐藏或删除不合适的留言。操作会记入审计日志。</p>
      </div>
      <div class="workspace-heading-actions">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-cw"
          :loading="pending"
          @click="refreshAll"
        >
          刷新
        </UButton>
      </div>
    </header>

    <section class="comment-queues" aria-label="评论队列">
      <button
        v-for="queue in queueFilters"
        :key="queue.value"
        type="button"
        class="comment-queue"
        :class="{ 'is-active': statusFilter === queue.value }"
        :aria-pressed="statusFilter === queue.value"
        @click="statusFilter = queue.value"
      >
        <span>{{ queue.label }}</span>
        <strong>{{ queue.count }}</strong>
      </button>
    </section>

    <section class="workspace-panel">
      <div class="comments-toolbar">
        <UInput
          v-model="postSearchInput"
          icon="i-lucide-search"
          placeholder="搜索文章标题或别名"
          class="comments-search"
          aria-label="搜索文章"
        />
        <USelect
          v-model="postIdFilter"
          :items="postItems"
          class="comments-filter"
          aria-label="按文章筛选"
        />
        <UInput
          v-model="keywordInput"
          icon="i-lucide-user"
          placeholder="按作者昵称搜索"
          class="comments-search"
          aria-label="按作者昵称搜索"
        />
        <USelect
          v-model="sort"
          :items="sortOptions"
          class="comments-filter"
          aria-label="评论排序"
        />
      </div>

      <div v-if="error" class="workspace-empty" role="alert">
        <UIcon name="i-lucide-wifi-off" />
        <h3>评论加载失败</h3>
        <UButton color="neutral" variant="outline" @click="refresh()">重新加载</UButton>
      </div>
      <div v-else-if="pending" class="comments-state">
        <UIcon name="i-lucide-loader-2" class="comments-spin" />
        正在加载评论
      </div>
      <div v-else-if="!comments.length" class="comments-state">
        <UIcon name="i-lucide-message-square-off" class="size-10" />
        <strong>没有匹配的评论</strong>
        <span>可以换个筛选条件，或者清空筛选看看全部。</span>
        <UButton color="neutral" variant="outline" @click="resetFilters">清除筛选</UButton>
      </div>

      <template v-else>
        <div class="comments-table-wrap">
          <table class="comments-table">
            <thead>
              <tr>
                <th>评论</th>
                <th>文章</th>
                <th>状态</th>
                <th>时间</th>
                <th class="comment-actions-heading">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="comment in comments" :key="comment.id">
                <td>
                  <button type="button" class="comment-identity" @click="openDetail(comment)">
                    <span class="comment-avatar">{{ comment.authorName.slice(0, 1).toUpperCase() }}</span>
                    <span class="comment-identity-copy">
                      <strong>{{ comment.authorName }}</strong>
                      <small>{{ comment.body || '（正文已清空）' }}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <NuxtLink class="comment-post" :to="postPath(comment.postSlug)" target="_blank">
                    {{ comment.postTitle }}
                  </NuxtLink>
                  <small v-if="comment.threadRootId" class="comment-thread-hint">
                    回复 #{{ comment.threadRootId }}
                  </small>
                </td>
                <td>
                  <span class="comment-badge" :class="`is-${comment.status.toLowerCase()}`">
                    {{ statusLabel(comment.status) }}
                  </span>
                </td>
                <td :title="formatDateTime(comment.createdAt)">{{ formatDate(comment.createdAt) }}</td>
                <td class="comment-actions-cell">
                  <div class="comment-actions">
                    <UButton
                      v-if="comment.status === 'PENDING'"
                      size="sm"
                      :loading="actionId === comment.id"
                      @click="moderate(comment, 'approve')"
                    >
                      批准
                    </UButton>
                    <UButton
                      v-if="comment.status === 'HIDDEN'"
                      size="sm"
                      color="neutral"
                      variant="outline"
                      :loading="actionId === comment.id"
                      @click="moderate(comment, 'restore')"
                    >
                      恢复
                    </UButton>
                    <UButton
                      v-if="comment.status === 'PENDING' || comment.status === 'VISIBLE'"
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      :loading="actionId === comment.id"
                      @click="moderate(comment, 'hide')"
                    >
                      隐藏
                    </UButton>
                    <UButton
                      v-if="comment.status !== 'DELETED'"
                      size="sm"
                      color="error"
                      variant="ghost"
                      :loading="actionId === comment.id"
                      @click="moderate(comment, 'delete')"
                    >
                      删除
                    </UButton>
                    <span v-if="comment.status === 'DELETED'" class="comment-actions-empty">已删除</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <footer class="comments-pagination">
        <span>共 {{ total }} 条评论，第 {{ page }} / {{ totalPages }} 页</span>
        <div class="comments-pagination-actions" aria-label="评论列表分页">
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            icon="i-lucide-chevron-left"
            :disabled="page <= 1"
            @click="page--"
          >
            上一页
          </UButton>
          <UButton
            size="sm"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-right"
            :disabled="page >= totalPages"
            @click="page++"
          >
            下一页
          </UButton>
        </div>
      </footer>
    </section>

    <UModal
      v-model:open="detailOpen"
      title="评论详情"
      :description="detail ? `${detail.authorName} · ${statusLabel(detail.status)}` : ''"
    >
      <template #body>
        <div v-if="detail" class="comment-detail">
          <dl>
            <div>
              <dt>文章</dt>
              <dd>
                <NuxtLink :to="postPath(detail.postSlug)" target="_blank">{{ detail.postTitle }}</NuxtLink>
              </dd>
            </div>
            <div>
              <dt>身份</dt>
              <dd>{{ kindLabel(detail.authorKind) }}</dd>
            </div>
            <div>
              <dt>提交时间</dt>
              <dd>{{ formatDateTime(detail.createdAt) }}</dd>
            </div>
            <div>
              <dt>可见回复</dt>
              <dd>{{ detail.replyCount }} 条</dd>
            </div>
          </dl>
          <div class="comment-detail-body">
            <!-- 后台要看用户到底写了什么，正文按服务端给出的白名单 HTML 渲染。 -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-html="detail.bodyHtml" />
          </div>
          <p v-if="!detail.body" class="comment-detail-empty">这条评论的正文已被清空。</p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type {
  AdminCommentListItem,
  AdminCommentStatsPayload,
  CommentStatusPayload,
  PostSummary
} from '~~/types/api'
import { getApiErrorMessage, getApiErrorStatus } from '~/utils/api-error'
import { postPath } from '~/utils/post-path'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const toast = useToast()
const pageSize = 20
const page = ref(1)
const statusFilter = ref<'ALL' | CommentStatusPayload>('PENDING')
const postIdFilter = ref<number | 'ALL'>('ALL')
const keywordInput = ref('')
const keyword = ref('')
const sort = ref<'newest' | 'oldest'>('newest')
const postSearchInput = ref('')
const postSearch = ref('')

let keywordTimer: ReturnType<typeof setTimeout> | undefined
let postSearchTimer: ReturnType<typeof setTimeout> | undefined

watch(keywordInput, (value) => {
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    keyword.value = value.trim()
    page.value = 1
  }, 300)
})

watch(postSearchInput, (value) => {
  clearTimeout(postSearchTimer)
  postSearchTimer = setTimeout(() => {
    postSearch.value = value.trim()
  }, 300)
})

watch([statusFilter, postIdFilter, sort], () => {
  page.value = 1
})

onBeforeUnmount(() => {
  clearTimeout(keywordTimer)
  clearTimeout(postSearchTimer)
})

const query = computed(() => ({
  page: page.value,
  pageSize,
  status: statusFilter.value === 'ALL' ? undefined : statusFilter.value,
  postId: postIdFilter.value === 'ALL' ? undefined : postIdFilter.value,
  keyword: keyword.value || undefined,
  sort: sort.value
}))

const { data, pending, refresh, error } = await useFetch<{ data: { items: AdminCommentListItem[], total: number } }>(
  '/api/admin/comments',
  { query }
)

const { data: statsData, refresh: refreshStats } = await useFetch<{ data: AdminCommentStatsPayload }>(
  '/api/admin/comments/stats',
  {
    query: computed(() => ({ postId: postIdFilter.value === 'ALL' ? undefined : postIdFilter.value }))
  }
)

const { data: postOptionsData } = await useFetch<{ data: { items: PostSummary[] } }>('/api/admin/posts', {
  query: computed(() => ({ page: 1, pageSize: 50, search: postSearch.value || undefined }))
})

const comments = computed(() => data.value?.data.items || [])
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const stats = computed(() => statsData.value?.data || { total: 0, pending: 0, visible: 0, hidden: 0, deleted: 0 })

const queueFilters = computed(() => [
  { label: '待审', value: 'PENDING' as const, count: stats.value.pending },
  { label: '已发布', value: 'VISIBLE' as const, count: stats.value.visible },
  { label: '已隐藏', value: 'HIDDEN' as const, count: stats.value.hidden },
  { label: '已删除', value: 'DELETED' as const, count: stats.value.deleted },
  { label: '全部', value: 'ALL' as const, count: stats.value.total }
])

const sortOptions = [
  { label: '最新优先', value: 'newest' },
  { label: '最早优先', value: 'oldest' }
]

const postItems = computed(() => [
  { label: '全部文章', value: 'ALL' as const },
  ...(postOptionsData.value?.data.items || []).map(post => ({
    label: post.title,
    value: post.id
  }))
])

const detailOpen = ref(false)
const detail = ref<AdminCommentListItem | null>(null)
const actionId = ref<number | null>(null)

function openDetail(comment: AdminCommentListItem) {
  detail.value = comment
  detailOpen.value = true
}

function resetFilters() {
  statusFilter.value = 'PENDING'
  postIdFilter.value = 'ALL'
  keywordInput.value = ''
  keyword.value = ''
  sort.value = 'newest'
  page.value = 1
}

async function refreshAll() {
  await Promise.all([refresh(), refreshStats()])
}

/**
 * 执行审核动作。
 *
 * expectedStatus 用当前看到的态，别的管理员先一步改过时服务端会返回 409，
 * 这时要提示刷新而不是硬改。
 */
async function moderate(comment: AdminCommentListItem, action: 'approve' | 'hide' | 'restore' | 'delete') {
  if (actionId.value !== null) return

  if (action === 'delete' && !confirm('确认删除这条评论吗？删除后正文会被清空。')) return

  actionId.value = comment.id
  try {
    const result = await $fetch<{ data: { id: number, status: CommentStatusPayload, unchanged: boolean } }>(
      `/api/admin/comments/${comment.id}`,
      {
        method: 'PUT',
        body: {
          action,
          expectedStatus: comment.status
        }
      }
    )

    // 先把这一行改掉，再刷新列表和队列计数。
    comment.status = result.data.status
    if (detail.value?.id === comment.id) detail.value.status = result.data.status

    toast.add({
      title: result.data.unchanged ? '评论状态未变化' : '评论状态已更新',
      color: 'success'
    })
    await refreshAll()
  } catch (error) {
    if (getApiErrorStatus(error) === 409) {
      toast.add({ title: '评论状态已变化，请刷新后重试', color: 'error' })
      await refreshAll()
      return
    }
    toast.add({ title: getApiErrorMessage(error, { fallback: '操作失败' }), color: 'error' })
  } finally {
    actionId.value = null
  }
}

function statusLabel(status: CommentStatusPayload) {
  return ({
    PENDING: '待审',
    VISIBLE: '已发布',
    HIDDEN: '已隐藏',
    DELETED: '已删除'
  } as Record<CommentStatusPayload, string>)[status]
}

function kindLabel(kind: string) {
  return ({
    ACCOUNT: '博客账号',
    GUEST: '访客',
    LEGACY: '历史评论'
  } as Record<string, string>)[kind] || kind
}

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '—'
}

function formatDateTime(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—'
}
</script>

<style scoped>
.comments-admin {
  display: grid;
  align-content: start;
  gap: 24px;
}

.comment-queues {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  border: 1px solid var(--admin-line);
  border-radius: 10px;
  background: #fff;
}

.comment-queue {
  display: grid;
  gap: 8px;
  border-right: 1px solid var(--admin-line);
  padding: 18px 20px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.comment-queue:last-child {
  border-right: 0;
}

.comment-queue:hover {
  background: #faf9fc;
}

.comment-queue.is-active {
  background: var(--admin-accent-soft);
}

.comment-queue span {
  color: var(--admin-muted);
  font-size: 12px;
}

.comment-queue strong {
  color: var(--admin-ink);
  font-size: 24px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}

.comment-queue.is-active strong {
  color: var(--admin-accent);
}

.comments-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  border-bottom: 1px solid var(--admin-line);
  padding: 18px 24px;
}

.comments-search {
  flex: 1 1 200px;
  min-width: 180px;
}

.comments-filter {
  width: 170px;
}

.comments-state {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px;
  color: var(--admin-muted);
  font-size: 12px;
}

.comments-state strong {
  color: var(--admin-ink);
  font-size: 14px;
  font-weight: 500;
}

.comments-spin {
  width: 22px;
  height: 22px;
  animation: comment-spin 1s linear infinite;
}

@keyframes comment-spin {
  to {
    transform: rotate(360deg);
  }
}

.comments-table-wrap {
  overflow-x: auto;
}

.comments-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.comments-table thead {
  background: #fafbfc;
  color: var(--admin-muted);
  font-size: 11px;
}

.comments-table th {
  height: 38px;
  padding: 10px 18px;
  font-weight: 450;
}

.comments-table td {
  border-bottom: 1px solid #eef0f3;
  padding: 14px 18px;
  color: #667085;
  font-size: 12px;
  vertical-align: top;
}

.comments-table th:first-child,
.comments-table td:first-child {
  padding-left: 24px;
}

.comments-table tbody tr:hover {
  background: #faf9fc;
}

.comment-identity {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  text-align: left;
  cursor: pointer;
}

.comment-avatar {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 13px;
  font-weight: 600;
}

.comment-identity-copy {
  display: block;
  min-width: 0;
  max-width: 460px;
}

.comment-identity-copy strong {
  display: block;
  color: var(--admin-ink);
  font-size: 13px;
  font-weight: 500;
}

.comment-identity-copy small {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 4px;
  color: var(--admin-muted);
  font-size: 12px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.comment-post {
  display: inline-block;
  max-width: 220px;
  overflow: hidden;
  color: var(--admin-accent);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-thread-hint {
  display: block;
  margin-top: 4px;
  color: var(--admin-muted);
  font-size: 11px;
}

.comment-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 5px;
  background: #f3f4f6;
  padding: 4px 7px;
  color: #667085;
  font-size: 11px;
  white-space: nowrap;
}

.comment-badge.is-pending {
  background: #fdf3e7;
  color: #a96060;
}

.comment-badge.is-visible {
  background: #edf6f0;
  color: #327750;
}

.comment-badge.is-hidden {
  background: #f3f4f6;
  color: #667085;
}

.comment-badge.is-deleted {
  background: #f6f6f7;
  color: #98a2b3;
}

.comment-actions-heading {
  text-align: right;
}

.comment-actions-cell {
  text-align: right;
}

.comment-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.comment-actions-empty {
  color: var(--admin-muted);
  font-size: 11px;
}

.comments-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 24px;
  color: var(--admin-muted);
  font-size: 11px;
}

.comments-pagination-actions {
  display: flex;
  gap: 8px;
}

.comment-detail {
  display: grid;
  gap: 18px;
}

.comment-detail dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 0;
}

.comment-detail dt {
  color: var(--admin-muted);
  font-size: 11px;
}

.comment-detail dd {
  margin: 6px 0 0;
  color: var(--admin-ink);
  font-size: 12px;
}

.comment-detail-body {
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  padding: 14px 16px;
  color: var(--admin-ink);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.comment-detail-body :deep(p) {
  margin: 0 0 8px;
}

.comment-detail-body :deep(p:last-child) {
  margin-bottom: 0;
}

.comment-detail-body :deep(pre) {
  overflow-x: auto;
  border-radius: 6px;
  background: #f7f8fa;
  padding: 10px 12px;
  font-size: 12px;
}

.comment-detail-body :deep(a) {
  color: var(--admin-accent);
}

.comment-detail-empty {
  margin: 0;
  color: var(--admin-muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .comment-queues {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .comment-queue {
    border-bottom: 1px solid var(--admin-line);
  }

  .comment-queue:nth-child(3n) {
    border-right: 0;
  }

  .comments-filter {
    flex: 1 1 160px;
    width: auto;
  }
}

@media (max-width: 640px) {
  .comment-queues {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .comment-queue:nth-child(3n) {
    border-right: 1px solid var(--admin-line);
  }

  .comment-queue:nth-child(2n) {
    border-right: 0;
  }

  .comments-toolbar {
    padding: 16px;
  }

  .comments-pagination {
    flex-wrap: wrap;
    padding: 16px;
  }

  .comment-detail dl {
    grid-template-columns: 1fr;
  }
}
</style>
