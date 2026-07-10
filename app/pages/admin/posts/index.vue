<template>
  <div class="post-admin-page">
    <div class="post-admin-header">
      <div class="post-admin-title">
        <span class="post-admin-icon">
          <UIcon name="i-lucide-file-text" class="size-5" />
        </span>
        <span>
          <h1>文章管理</h1>
          <p>创建、编辑和管理所有博客文章内容。</p>
        </span>
      </div>
      <UButton icon="i-lucide-plus" to="/admin/posts/create">发布新文章</UButton>
    </div>

    <section class="post-board">
      <div class="post-tabs">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          class="post-tab"
          :class="{ 'is-active': filterStatus === tab.value }"
          @click="setStatus(tab.value)"
        >
          {{ tab.label }}
          <span>{{ tab.count }}</span>
        </button>
      </div>

      <div class="post-toolbar">
        <div v-if="selectedIds.length" class="post-bulkbar">
          <div class="post-selected-count">
            已选择 {{ selectedIds.length }} 项
          </div>
          <button type="button" class="post-muted-button" @click="clearSelection">取消选择</button>
          <div class="post-bulk-actions">
            <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-check-circle-2" :loading="batching" @click="batchSetStatus('PUBLISHED')">
              批量发布
            </UButton>
            <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-clock" :loading="batching" @click="batchSetStatus('DRAFT')">
              设为草稿
            </UButton>
            <UButton size="sm" color="error" variant="outline" icon="i-lucide-trash-2" :loading="batching" @click="batchSetStatus('ARCHIVED')">
              移入回收站
            </UButton>
          </div>
        </div>

        <div v-else class="post-filterbar">
          <UInput
            v-model="searchText"
            icon="i-lucide-search"
            placeholder="搜索文章标题或别名..."
            class="post-search"
            @keyup.enter="applyFilters"
          />
          <USelect
            v-model="categoryFilter"
            :items="categoryOptions"
            class="post-select"
            @update:model-value="applyFilters"
          />
          <USelect
            v-model="tagFilter"
            :items="tagOptions"
            class="post-select"
            @update:model-value="applyFilters"
          />
          <USelect
            v-model="sortValue"
            :items="sortOptions"
            class="post-sort"
            @update:model-value="applyFilters"
          />
          <UButton color="neutral" variant="outline" icon="i-lucide-rotate-ccw" @click="resetFilters">重置</UButton>
        </div>
      </div>

      <div class="post-list-wrap">
        <div class="post-list">
          <div class="post-list-head">
            <div class="post-check-cell">
              <button type="button" class="post-check-button" @click="toggleSelectAll">
                <UIcon :name="isAllSelected ? 'i-lucide-check-square' : 'i-lucide-square'" class="size-5" />
              </button>
            </div>
            <div class="post-info-col">文章信息</div>
            <div class="post-status-col">状态</div>
            <div class="post-knowledge-col">AI 知识库</div>
            <div class="post-metrics-col">数据</div>
            <div class="post-date-col">更新时间</div>
            <div class="post-actions-col">操作</div>
          </div>

          <div v-if="posts.length" class="post-list-body">
            <article
              v-for="post in posts"
              :key="post.id"
              class="post-row"
              :class="{ 'is-selected': selectedIds.includes(post.id) }"
            >
              <div class="post-row-accent" />
              <div class="post-check-cell">
                <button type="button" class="post-check-button" @click="toggleSelect(post.id)">
                  <UIcon :name="selectedIds.includes(post.id) ? 'i-lucide-check-square' : 'i-lucide-square'" class="size-5" />
                </button>
              </div>

              <div class="post-info-col post-main-info">
                <div class="post-cover" :class="post.cover ? 'has-image' : gradientClass(post.id)">
                  <img v-if="post.cover" :src="post.cover" :alt="post.title" loading="lazy">
                  <span v-else>{{ post.title.slice(0, 1) }}</span>
                </div>
                <div class="post-copy">
                  <NuxtLink :to="`/admin/posts/${post.id}`" class="post-title-link">
                    {{ post.title }}
                  </NuxtLink>
                  <span v-if="post.isPinned" class="post-pin-badge">
                    <UIcon name="i-lucide-pin" class="size-3" />
                    置顶
                  </span>
                  <p>{{ post.summary || postPath(post.slug) }}</p>
                  <div class="post-taxonomy">
                    <span class="post-category">
                      <UIcon name="i-lucide-folder" class="size-3" />
                      {{ post.category?.name || '未分类' }}
                    </span>
                    <span v-for="tag in post.tags.slice(0, 3)" :key="tag.id" class="post-tag">
                      <UIcon name="i-lucide-hash" class="size-3" />
                      {{ tag.name }}
                    </span>
                    <span v-if="post.tags.length > 3" class="post-tag">+{{ post.tags.length - 3 }}</span>
                  </div>
                </div>
              </div>

              <div class="post-status-col">
                <span class="post-status" :class="statusClass(post.status)">
                  <UIcon :name="statusIcon(post.status)" class="size-3.5" />
                  {{ statusText(post.status) }}
                </span>
              </div>

              <div class="post-knowledge-col">
                <span class="post-knowledge-status" :class="knowledgeStatusClass(post.knowledgeDocument?.status)">
                  {{ knowledgeStatusText(post.knowledgeDocument?.status) }}
                </span>
                <button
                  v-if="post.status === 'PUBLISHED'"
                  type="button"
                  class="post-knowledge-action"
                  :disabled="knowledgeLoadingId === post.id"
                  @click="handleKnowledgeAction(post)"
                >
                  {{ post.knowledgeDocument?.enabled ? '同步' : '加入' }}
                </button>
              </div>

              <div class="post-metrics-col">
                <span class="post-metric" title="浏览量">
                  <UIcon name="i-lucide-eye" class="post-metric-icon" />
                  {{ post.viewCount || 0 }}
                </span>
                <span class="post-metric" title="标签数">
                  <UIcon name="i-lucide-tags" class="post-metric-icon" />
                  {{ post.tags.length }}
                </span>
                <span class="post-metric" title="字数">
                  <UIcon name="i-lucide-file-text" class="post-metric-icon" />
                  {{ contentSize(post.content) }}
                </span>
              </div>

              <div class="post-date-col">
                <strong>{{ formatDate(post.updatedAt) }}</strong>
                <small>最后更新</small>
              </div>

              <div class="post-actions-col">
                <div class="post-row-actions">
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-eye" :to="postPath(post.slug)" target="_blank" />
                  <UButton
                    size="xs"
                    :color="post.isPinned ? 'warning' : 'neutral'"
                    variant="ghost"
                    icon="i-lucide-pin"
                    :title="post.isPinned ? '取消置顶' : '置顶文章'"
                    :loading="pinningId === post.id"
                    @click="togglePinned(post)"
                  />
                  <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-square-pen" :to="`/admin/posts/${post.id}`" />
                  <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :loading="deletingId === post.id" @click="deletePost(post)" />
                </div>
              </div>
            </article>
          </div>

          <div v-else class="post-empty">
            <UIcon name="i-lucide-file-text" class="size-12 text-slate-300" />
            <p>没有找到匹配的文章</p>
            <span>请尝试调整搜索关键词或过滤器</span>
          </div>
        </div>
      </div>

      <div class="post-pagination">
        <span>
          共 <strong>{{ total }}</strong> 篇文章
        </span>
        <div class="post-pages">
          <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-chevron-left" :disabled="page <= 1" @click="goPage(page - 1)" />
          <UButton
            v-for="p in visiblePages"
            :key="p"
            size="xs"
            color="neutral"
            :variant="p === page ? 'solid' : 'outline'"
            @click="goPage(p)"
          >
            {{ p }}
          </UButton>
          <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-chevron-right" :disabled="page >= totalPages" @click="goPage(page + 1)" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult, CountPayload } from '~~/types/api'
import type { AdminPostListItem, AdminPostListPayload, PostStatus } from '~~/types/dto/post'
import type { TaxonomyItem } from '~~/types/dto/taxonomy'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

const toast = useToast()
const route = useRoute()

const sortOptions = [
  { label: '排序：置顶优先', value: 'pinned_desc' },
  { label: '排序：最近更新', value: 'updatedAt_desc' },
  { label: '排序：最早更新', value: 'updatedAt_asc' },
  { label: '排序：最近创建', value: 'createdAt_desc' },
  { label: '排序：标题 A-Z', value: 'title_asc' },
  { label: '排序：标题 Z-A', value: 'title_desc' }
]

const page = ref(1)
const pageSize = 8
const filterStatus = ref('')
const searchText = ref(typeof route.query.search === 'string' ? route.query.search : '')
const categoryFilter = ref('__all__')
const tagFilter = ref('__all__')
const sortValue = ref('pinned_desc')
const selectedIds = ref<number[]>([])
const batching = ref(false)
const deletingId = ref<number | null>(null)
const pinningId = ref<number | null>(null)
const knowledgeLoadingId = ref<number | null>(null)

const { data: categoryData } = await useFetch<ApiResult<TaxonomyItem[]>>('/api/admin/categories')
const { data: tagData } = await useFetch<ApiResult<TaxonomyItem[]>>('/api/admin/tags')

const query = computed(() => ({
  page: page.value,
  pageSize,
  status: filterStatus.value || undefined,
  search: searchText.value || undefined,
  categoryId: categoryFilter.value !== '__all__' ? categoryFilter.value : undefined,
  tagId: tagFilter.value !== '__all__' ? tagFilter.value : undefined,
  sort: sortValue.value
}))

const { data, refresh } = await useFetch<ApiResult<AdminPostListPayload>>('/api/admin/posts', { query })
const { data: allCountData, refresh: refreshAllCount } = await useFetch<ApiResult<CountPayload>>('/api/admin/posts', { query: { page: 1, pageSize: 1 } })
const { data: publishedCountData, refresh: refreshPublishedCount } = await useFetch<ApiResult<CountPayload>>('/api/admin/posts', { query: { page: 1, pageSize: 1, status: 'PUBLISHED' } })
const { data: draftCountData, refresh: refreshDraftCount } = await useFetch<ApiResult<CountPayload>>('/api/admin/posts', { query: { page: 1, pageSize: 1, status: 'DRAFT' } })
const { data: archivedCountData, refresh: refreshArchivedCount } = await useFetch<ApiResult<CountPayload>>('/api/admin/posts', { query: { page: 1, pageSize: 1, status: 'ARCHIVED' } })

const posts = computed(() => data.value?.data.items || [])
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const visiblePages = computed(() => {
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const statusTabs = computed(() => [
  { label: '全部文章', value: '', count: allCountData.value?.data.total || 0 },
  { label: '已发布', value: 'PUBLISHED', count: publishedCountData.value?.data.total || 0 },
  { label: '草稿箱', value: 'DRAFT', count: draftCountData.value?.data.total || 0 },
  { label: '回收站', value: 'ARCHIVED', count: archivedCountData.value?.data.total || 0 }
])

const categoryOptions = computed(() => {
  const options = [{ label: '全部分类', value: '__all__' }]
  for (const cat of categoryData.value?.data || []) {
    options.push({ label: cat.name, value: String(cat.id) })
  }
  return options
})

const tagOptions = computed(() => {
  const options = [{ label: '全部标签', value: '__all__' }]
  for (const tag of tagData.value?.data || []) {
    options.push({ label: tag.name, value: String(tag.id) })
  }
  return options
})

const isAllSelected = computed(() => posts.value.length > 0 && posts.value.every((post) => selectedIds.value.includes(post.id)))

watch(posts, () => {
  selectedIds.value = selectedIds.value.filter((id) => posts.value.some((post) => post.id === id))
})

function setStatus(val: string) {
  filterStatus.value = val
  applyFilters()
}

function applyFilters() {
  page.value = 1
  clearSelection()
}

function resetFilters() {
  filterStatus.value = ''
  searchText.value = ''
  categoryFilter.value = '__all__'
  tagFilter.value = '__all__'
  sortValue.value = 'pinned_desc'
  applyFilters()
}

function goPage(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    clearSelection()
  }
}

function toggleSelect(id: number) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll() {
  selectedIds.value = isAllSelected.value ? [] : posts.value.map((post) => post.id)
}

function clearSelection() {
  selectedIds.value = []
}

async function batchSetStatus(status: PostStatus) {
  const selectedPosts = posts.value.filter((post) => selectedIds.value.includes(post.id))
  if (!selectedPosts.length) return
  batching.value = true
  try {
    await Promise.all(selectedPosts.map((post) => updatePostStatus(post, status)))
    toast.add({ title: '批量操作完成', color: 'success' })
    clearSelection()
    await refreshAll()
  } catch (error: any) {
    toast.add({ title: '批量操作失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    batching.value = false
  }
}

async function deletePost(post: AdminPostListItem) {
  if (!window.confirm(`确定永久删除“${post.title}”吗？`)) return
  deletingId.value = post.id
  try {
    await $fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' })
    toast.add({ title: '文章已删除', color: 'success' })
    await refreshAll()
  } catch (error: any) {
    toast.add({ title: '删除失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    deletingId.value = null
  }
}

async function updatePostStatus(post: AdminPostListItem, status: PostStatus) {
  await $fetch(`/api/admin/posts/${post.id}`, {
    method: 'PUT',
    body: {
      title: post.title,
      slug: post.slug,
      summary: post.summary || '',
      content: post.content,
      cover: post.cover || '',
      categoryId: post.categoryId || null,
      tagIds: post.tags.map((tag) => tag.id),
      status,
      isPinned: post.isPinned || false,
      seoTitle: post.seoTitle || '',
      seoDescription: post.seoDescription || ''
    }
  })
}

async function togglePinned(post: AdminPostListItem) {
  pinningId.value = post.id
  try {
    await $fetch(`/api/admin/posts/${post.id}`, {
      method: 'PUT',
      body: {
        title: post.title,
        slug: post.slug,
        summary: post.summary || '',
        content: post.content,
        cover: post.cover || '',
        categoryId: post.categoryId || null,
        tagIds: post.tags.map((tag) => tag.id),
        status: post.status,
        isPinned: !post.isPinned,
        seoTitle: post.seoTitle || '',
        seoDescription: post.seoDescription || ''
      }
    })
    toast.add({ title: post.isPinned ? '已取消置顶' : '文章已置顶', color: 'success' })
    await refreshAll()
  } catch (error: any) {
    toast.add({ title: '置顶操作失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    pinningId.value = null
  }
}

async function handleKnowledgeAction(post: AdminPostListItem) {
  knowledgeLoadingId.value = post.id
  try {
    if (!post.knowledgeDocument?.enabled) {
      await $fetch(`/api/admin/knowledge/documents/${post.id}/enabled`, { method: 'PUT', body: { enabled: true } })
      toast.add({ title: '已加入 AI 知识库', description: '点击“同步”生成知识向量。', color: 'success' })
    } else {
      await $fetch(`/api/admin/knowledge/documents/${post.id}/sync`, { method: 'POST' })
      toast.add({ title: '知识向量同步完成', color: 'success' })
    }
    await refresh()
  } catch (error: unknown) {
    toast.add({ title: '知识库操作失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    knowledgeLoadingId.value = null
  }
}

async function refreshAll() {
  await Promise.all([
    refresh(),
    refreshAllCount(),
    refreshPublishedCount(),
    refreshDraftCount(),
    refreshArchivedCount()
  ])
}

function formatDate(value?: string | Date | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function statusText(status?: string) {
  if (status === 'PUBLISHED') return '已发布'
  if (status === 'ARCHIVED') return '回收站'
  return '草稿箱'
}

function statusIcon(status?: string) {
  if (status === 'PUBLISHED') return 'i-lucide-check-circle-2'
  if (status === 'ARCHIVED') return 'i-lucide-x-circle'
  return 'i-lucide-clock'
}

function statusClass(status?: string) {
  if (status === 'PUBLISHED') return 'is-published'
  if (status === 'ARCHIVED') return 'is-archived'
  return 'is-draft'
}

function knowledgeStatusText(status?: string) {
  return ({ PENDING: '待同步', SYNCING: '同步中', SYNCED: '已同步', STALE: '需要更新', FAILED: '同步失败', DISABLED: '未启用' } as Record<string, string>)[status || ''] || '未启用'
}

function knowledgeStatusClass(status?: string) {
  return `is-${(status || 'disabled').toLowerCase()}`
}

function contentSize(content?: string | null) {
  const length = (content || '').replace(/\s/g, '').length
  return length > 999 ? `${Math.round(length / 100) / 10}k` : length
}

function gradientClass(id: number) {
  const classes = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']
  return classes[id % classes.length]
}

function postPath(slug: string) {
  return `/${slug}`
}
</script>

<style scoped>
.post-admin-page {
  display: grid;
  min-height: calc(100vh - 1.75rem);
  gap: 0.875rem;
}

.post-admin-header,
.post-admin-title,
.post-toolbar,
.post-filterbar,
.post-bulkbar,
.post-bulk-actions,
.post-list-head,
.post-row,
.post-main-info,
.post-taxonomy,
.post-metrics-col,
.post-pagination,
.post-pages {
  display: flex;
  align-items: center;
}

.post-admin-header {
  min-height: 3.75rem;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #ffffff;
  padding: 0.75rem 1rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.post-admin-title {
  gap: 0.75rem;
  min-width: 0;
}

.post-admin-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.6rem;
  background: #eef2ff;
  color: #4f46e5;
}

.post-admin-title h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.1rem;
  font-weight: 850;
  line-height: 1.2;
}

.post-admin-title p {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.post-board {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 48px rgba(15, 23, 42, 0.08);
}

.post-tabs {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  border-bottom: 1px solid #f1f5f9;
  padding: 0.5rem 1.25rem 0;
}

.post-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 700;
  padding: 0.75rem 0 0.875rem;
  white-space: nowrap;
}

.post-tab:hover,
.post-tab.is-active {
  border-color: #4f46e5;
  color: #4f46e5;
}

.post-tab span {
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1;
  padding: 0.25rem 0.5rem;
}

.post-tab.is-active span {
  background: #eef2ff;
  color: #4f46e5;
}

.post-toolbar {
  min-height: 4rem;
  border-bottom: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.75rem 1rem;
}

.post-filterbar {
  display: grid;
  width: 100%;
  gap: 0.75rem;
  grid-template-columns: minmax(18rem, 1fr) 10.5rem 10.5rem 12rem auto;
  align-items: center;
}

.post-search {
  width: 100%;
}

.post-select {
  width: 100%;
}

.post-sort {
  width: 100%;
}

.post-bulkbar {
  width: 100%;
  justify-content: space-between;
  gap: 1rem;
}

.post-selected-count {
  border-radius: 0.55rem;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.875rem;
  font-weight: 800;
  padding: 0.45rem 0.75rem;
}

.post-muted-button {
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 0.875rem;
}

.post-bulk-actions {
  gap: 0.5rem;
  margin-left: auto;
}

.post-list-wrap {
  overflow-x: auto;
}

.post-list {
  min-width: 58rem;
}

.post-list-head {
  border-bottom: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.86);
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  padding: 0.65rem 1rem;
  text-transform: uppercase;
}

.post-check-cell {
  width: 3rem;
  flex: 0 0 3rem;
}

.post-info-col {
  min-width: 0;
  flex: 1 1 auto;
}

.post-status-col {
  width: 7.5rem;
  flex: 0 0 7.5rem;
}

.post-knowledge-col {
  display: grid;
  width: 8rem;
  flex: 0 0 8rem;
  justify-items: start;
  gap: 0.28rem;
}

.post-knowledge-status {
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 850;
  padding: 0.28rem 0.5rem;
}

.post-knowledge-status.is-synced { background: #d1fae5; color: #047857; }
.post-knowledge-status.is-syncing { background: #dbeafe; color: #2563eb; }
.post-knowledge-status.is-pending,
.post-knowledge-status.is-stale { background: #fef3c7; color: #b45309; }
.post-knowledge-status.is-failed { background: #fee2e2; color: #dc2626; }

.post-knowledge-action {
  color: #4f46e5;
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 800;
}

.post-knowledge-action:disabled {
  cursor: wait;
  opacity: 0.55;
}

.post-metrics-col {
  width: 12.5rem;
  flex: 0 0 12.5rem;
}

.post-date-col {
  width: 8.5rem;
  flex: 0 0 8.5rem;
}

.post-actions-col {
  width: 7rem;
  flex: 0 0 7rem;
  text-align: right;
}

.post-check-button {
  display: grid;
  border: 0;
  background: transparent;
  color: #94a3b8;
  place-items: center;
}

.post-check-button:hover,
.post-row.is-selected .post-check-button {
  color: #4f46e5;
}

.post-list-body {
  background: #fff;
}

.post-row {
  position: relative;
  border-bottom: 1px solid #f1f5f9;
  padding: 0.9rem 1rem;
  transition: background-color 160ms ease;
}

.post-row:hover {
  background: rgba(248, 250, 252, 0.7);
}

.post-row.is-selected {
  background: rgba(238, 242, 255, 0.62);
}

.post-row-accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: transparent;
  transition: background-color 160ms ease;
}

.post-row:hover .post-row-accent {
  background: #cbd5e1;
}

.post-row.is-selected .post-row-accent {
  background: #4f46e5;
}

.post-main-info {
  gap: 0.875rem;
  padding-right: 1rem;
}

.post-cover {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.85rem;
  color: #fff;
  overflow: hidden;
  box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.18);
}

.post-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-cover span {
  font-size: 1.2rem;
  font-weight: 900;
  opacity: 0.9;
}

.post-cover.g1 { background: linear-gradient(135deg, #60a5fa, #4f46e5); }
.post-cover.g2 { background: linear-gradient(135deg, #34d399, #14b8a6); }
.post-cover.g3 { background: linear-gradient(135deg, #f59e0b, #f97316); }
.post-cover.g4 { background: linear-gradient(135deg, #a78bfa, #ec4899); }
.post-cover.g5 { background: linear-gradient(135deg, #fb7185, #ef4444); }
.post-cover.g6 { background: linear-gradient(135deg, #22d3ee, #3b82f6); }

.post-copy {
  min-width: 0;
}

.post-title-link {
  display: block;
  overflow: hidden;
  color: #1e293b;
  font-size: 1rem;
  font-weight: 850;
  text-overflow: ellipsis;
  transition: color 160ms ease;
  white-space: nowrap;
}

.post-pin-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.32rem;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  color: #b45309;
  font-size: 0.72rem;
  font-weight: 850;
  line-height: 1;
  padding: 0.28rem 0.48rem;
}

.post-row:hover .post-title-link {
  color: #4f46e5;
}

.post-copy p {
  overflow: hidden;
  margin: 0.2rem 0 0.55rem;
  color: #64748b;
  font-size: 0.84rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-taxonomy {
  gap: 0.4rem;
  flex-wrap: wrap;
}

.post-category,
.post-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  border: 1px solid rgba(203, 213, 225, 0.65);
  border-radius: 0.4rem;
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1;
  padding: 0.22rem 0.45rem;
}

.post-category {
  border-color: rgba(199, 210, 254, 0.7);
  background: #eef2ff;
  color: #4f46e5;
}

.post-tag {
  background: #f1f5f9;
  color: #64748b;
}

.post-status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.35rem 0.6rem;
}

.post-status.is-published {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #16a34a;
}

.post-status.is-draft {
  border-color: #fde68a;
  background: #fffbeb;
  color: #d97706;
}

.post-status.is-archived {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.post-metrics-col {
  gap: 0.45rem;
}

.post-metric {
  display: inline-flex;
  width: 3.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border: 1px solid #f1f5f9;
  border-radius: 0.45rem;
  background: #f8fafc;
  color: #475569;
  font-size: 0.82rem;
  font-weight: 750;
  padding: 0.42rem 0.32rem;
}

.post-metric-icon {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
  color: #94a3b8;
}

.post-date-col strong,
.post-date-col small {
  display: block;
}

.post-date-col strong {
  color: #334155;
  font-size: 0.86rem;
}

.post-date-col small {
  margin-top: 0.15rem;
  color: #94a3b8;
  font-size: 0.74rem;
}

.post-row-actions {
  display: inline-flex;
  gap: 0.1rem;
  opacity: 0;
  transition: opacity 160ms ease;
}

.post-row:hover .post-row-actions,
.post-row.is-selected .post-row-actions {
  opacity: 1;
}

.post-empty {
  display: grid;
  place-items: center;
  padding: 4rem 1rem;
  text-align: center;
}

.post-empty p {
  margin: 0.75rem 0 0;
  color: #334155;
  font-weight: 800;
}

.post-empty span {
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.85rem;
}

.post-pagination {
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.8rem 1rem;
}

.post-pagination span {
  color: #64748b;
  font-size: 0.86rem;
}

.post-pagination strong {
  color: #0f172a;
}

.post-pages {
  gap: 0.3rem;
}

@media (max-width: 900px) {
  .post-admin-header,
  .post-bulkbar,
  .post-pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .post-bulk-actions {
    margin-left: 0;
    flex-wrap: wrap;
  }

  .post-filterbar {
    grid-template-columns: 1fr;
  }

  .post-search,
  .post-select,
  .post-sort {
    width: 100%;
  }
}
</style>
