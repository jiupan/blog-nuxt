<template>
  <div class="workspace-page post-admin-page">
    <AdminPageActions><UButton icon="i-lucide-plus" to="/admin/posts/create" size="sm">新建文章</UButton></AdminPageActions>
    <section class="workspace-panel post-board">
      <div
        class="post-tabs"
        aria-label="文章状态"
      >
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          class="post-tab"
          :class="{ 'is-active': filterStatus === tab.value }"
          :aria-pressed="filterStatus === tab.value"
          @click="setStatus(tab.value)"
        >
          {{ tab.label }}
          <span>{{ tab.count }}</span>
        </button>
      </div>
      <div class="post-toolbar">
        <div
          v-if="selectedIds.length"
          class="post-bulkbar"
        >
          <span>
            已选当前页
            <strong>{{ selectedIds.length }}</strong>
            篇
          </span>
          <div class="post-bulk-actions">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              :loading="batching"
              @click="batchSetStatus('PUBLISHED')"
            >
              发布
            </UButton>
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              :loading="batching"
              @click="batchSetStatus('DRAFT')"
            >
              {{ filterStatus === 'ARCHIVED' ? '恢复为草稿' : '设为草稿' }}
            </UButton>
            <UButton
              v-if="filterStatus !== 'ARCHIVED'"
              size="sm"
              color="error"
              variant="ghost"
              :loading="batching"
              @click="batchSetStatus('ARCHIVED')"
            >
              移入回收站
            </UButton>
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              :disabled="batching"
              @click="clearSelection"
            >
              取消
            </UButton>
          </div>
        </div>
        <form
          v-else
          class="post-filterbar"
          @submit.prevent="applyFilters"
        >
          <UInput
            v-model="searchText"
            icon="i-lucide-search"
            placeholder="搜索标题或别名…"
            aria-label="搜索文章标题或别名"
            class="post-search"
          />
          <USelect
            v-model="categoryFilter"
            :items="categoryOptions"
            :ui="filterSelectUi"
            aria-label="按分类筛选"
            class="post-select"
            @update:model-value="applyFilters"
          />
          <USelect
            v-model="tagFilter"
            :items="tagOptions"
            :ui="filterSelectUi"
            aria-label="按标签筛选"
            class="post-select"
            @update:model-value="applyFilters"
          />
          <USelect
            v-model="sortValue"
            :items="sortOptions"
            :ui="filterSelectUi"
            aria-label="文章排序"
            class="post-sort"
            @update:model-value="applyFilters"
          />
          <UButton
            type="submit"
            color="neutral"
            variant="outline"
            size="sm"
          >
            搜索
          </UButton>
          <UButton
            v-if="hasFilters"
            type="button"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="resetFilters"
          >
            重置
          </UButton>
        </form>
      </div>
      <div
        v-if="error"
        class="workspace-empty"
        role="alert"
      >
        <UIcon name="i-lucide-wifi-off" />
        <h3>文章加载失败</h3>
        <p>请检查网络连接后重试。</p>
        <UButton
          color="neutral"
          variant="outline"
          @click="refresh()"
        >
          重新加载
        </UButton>
      </div>
      <div
        v-else-if="pending"
        class="workspace-loading"
        role="status"
        aria-label="正在加载文章"
      >
        <span
          v-for="i in 6"
          :key="i"
        />
      </div>
      <template v-else-if="posts.length">
        <div class="post-list-head">
          <label class="post-check-cell">
            <input
              type="checkbox"
              :checked="isAllSelected"
              :indeterminate="selectedIds.length > 0 && !isAllSelected"
              aria-label="选择当前页全部文章"
              @change="toggleSelectAll"
            >
          </label>
          <span>文章标题</span>
          <span class="post-status-col">状态</span>
          <span class="post-metrics-col">浏览</span>
          <span class="post-date-col">最近更新</span>
          <span class="post-actions-col">操作</span>
        </div>
        <article
          v-for="post in posts"
          :key="post.id"
          class="post-row"
          :class="{ 'is-selected': selectedIds.includes(post.id) }"
        >
          <label class="post-check-cell">
            <input
              type="checkbox"
              :checked="selectedIds.includes(post.id)"
              :aria-label="`选择 ${post.title}`"
              @change="toggleSelect(post.id)"
            >
          </label>
          <div class="post-main-info">
            <div class="post-cover">
              <img
                v-if="post.cover"
                :src="post.cover"
                alt=""
                loading="lazy"
              >
              <UIcon
                v-else
                name="i-lucide-file-text"
                class="size-5"
              />
            </div>
            <div class="post-copy">
              <div class="post-title-line">
                <NuxtLink
                  :to="`/admin/posts/${post.id}`"
                  class="post-title-link"
                >
                  {{ post.title }}
                </NuxtLink>
                <UIcon
                  v-if="post.isPinned"
                  name="i-lucide-pin"
                  class="post-pin-icon"
                  aria-label="置顶文章"
                />
              </div>
              <div class="post-taxonomy">
                <span>{{ post.category?.name || '未分类' }}</span>
                <span
                  v-for="tag in post.tags.slice(0, 2)"
                  :key="tag.id"
                  class="post-tag"
                >
                  # {{ tag.name }}
                </span>
                <span
                  v-if="post.tags.length > 2"
                  class="post-tag"
                >
                  +{{ post.tags.length - 2 }}
                </span>
                <span
                  v-if="post.knowledgeDocument?.enabled"
                  class="post-knowledge-indicator"
                  :class="{ 'is-error': post.knowledgeDocument.status === 'FAILED' }"
                  :title="knowledgeStatusText(post.knowledgeDocument.status)"
                >
                  <UIcon
                    name="i-lucide-orbit"
                    class="size-3"
                  />
                  <span>{{ knowledgeStatusText(post.knowledgeDocument.status) }}</span>
                </span>
              </div>
              <span class="post-mobile-meta">
                {{ statusText(post.status) }} · {{ formatDate(post.updatedAt) }}
              </span>
            </div>
          </div>
          <div class="post-status-col">
            <span
              class="workspace-status"
              :class="statusClass(post.status)"
            >
              {{ statusText(post.status) }}
            </span>
          </div>
          <span class="post-metrics-col">{{ (post.viewCount || 0).toLocaleString('zh-CN') }}</span>
          <time
            class="post-date-col"
            :datetime="new Date(post.updatedAt).toISOString()"
          >
            {{ formatDate(post.updatedAt) }}
          </time>
          <div class="post-actions-col">
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              :to="`/admin/posts/${post.id}`"
              :aria-label="`编辑 ${post.title}`"
            >
              编辑
            </UButton>
            <UDropdownMenu
              :items="postActions(post)"
              :content="{ align: 'end' }"
            >
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                icon="i-lucide-ellipsis"
                :loading="deletingId === post.id || pinningId === post.id || knowledgeLoadingId === post.id"
                :aria-label="`${post.title}的更多操作`"
              />
            </UDropdownMenu>
          </div>
        </article>
      </template>
      <div
        v-else
        class="workspace-empty"
      >
        <UIcon :name="hasFilters ? 'i-lucide-search-x' : 'i-lucide-notebook-pen'" />
        <h3>
          {{
            hasFilters
              ? '没有找到匹配的文章'
              : filterStatus === 'ARCHIVED'
                ? '回收站是空的'
                : filterStatus === 'DRAFT'
                  ? '还没有草稿'
                  : '还没有文章'
          }}
        </h3>
        <p>
          {{
            hasFilters ? '试试其他关键词，或清除筛选查看全部文章。' : '文章会在这里集中管理，随时编辑和整理。'
          }}
        </p>
        <UButton
          v-if="hasFilters"
          color="neutral"
          variant="outline"
          @click="resetFilters"
        >
          清除筛选
        </UButton>
        <UButton
          v-else-if="filterStatus !== 'ARCHIVED'"
          to="/admin/posts/create"
          variant="soft"
          icon="i-lucide-plus"
        >
          新建文章
        </UButton>
      </div>
      <div class="post-pagination">
        <span>
          {{ error ? '数据暂不可用' : `共 ${total} 篇文章` }}
          <span
            v-if="total"
            class="post-page-range"
          >
            · 当前 {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }}
          </span>
        </span>
        <div class="post-pages">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-left"
            :disabled="page <= 1 || pending"
            aria-label="上一页"
            @click="goPage(page - 1)"
          />
          <UButton
            v-for="p in visiblePages"
            :key="p"
            size="xs"
            :color="p === page ? 'primary' : 'neutral'"
            :variant="p === page ? 'soft' : 'ghost'"
            :aria-label="`第 ${p} 页`"
            :aria-current="p === page ? 'page' : undefined"
            :disabled="pending"
            @click="goPage(p)"
          >
            {{ p }}
          </UButton>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-right"
            :disabled="page >= totalPages || pending"
            aria-label="下一页"
            @click="goPage(page + 1)"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiResult } from '~~/types/api'
import type {
  AdminPostListItem,
  AdminPostListPayload,
  AdminPostOverview,
  PostStatus
} from '~~/types/dto/post'
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

const filterSelectUi = {
  content: 'w-max min-w-[min(var(--reka-select-trigger-width),var(--reka-select-content-available-width))] max-w-[min(26rem,var(--reka-select-content-available-width))]',
  value: 'whitespace-normal text-clip wrap-anywhere text-start',
  itemLabel: 'whitespace-normal text-clip wrap-anywhere'
}

const router = useRouter()
const listPath = useState('admin-post-list-path', () => '/admin/posts')
const page = ref(readPage(route.query.page))
const pageSize = 12
const filterStatus = ref(readStatus(route.query.status))
const searchText = ref(typeof route.query.search === 'string' ? route.query.search : '')
const appliedSearch = ref(searchText.value)
const categoryFilter = ref(readTaxonomy(route.query.categoryId))
const tagFilter = ref(readTaxonomy(route.query.tagId))
const sortValue = ref(readSort(route.query.sort))
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
  search: appliedSearch.value || undefined,
  categoryId: categoryFilter.value !== '__all__' ? categoryFilter.value : undefined,
  tagId: tagFilter.value !== '__all__' ? tagFilter.value : undefined,
  sort: sortValue.value
}))

const { data, refresh, pending, error } = await useFetch<ApiResult<AdminPostListPayload>>(
  '/api/admin/posts',
  { query }
)
const { data: overviewData, refresh: refreshOverview } =
  await useFetch<ApiResult<AdminPostOverview>>('/api/admin/posts/overview')

const posts = computed(() => data.value?.data.items || [])
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const visiblePages = computed(() => {
  const start = Math.max(1, page.value - 2)
  const end = Math.min(totalPages.value, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

const statusTabs = computed(() => [
  { label: '全部文章', value: '', count: overviewData.value?.data.total ?? '—' },
  { label: '已发布', value: 'PUBLISHED', count: overviewData.value?.data.published ?? '—' },
  { label: '草稿箱', value: 'DRAFT', count: overviewData.value?.data.drafts ?? '—' },
  { label: '回收站', value: 'ARCHIVED', count: overviewData.value?.data.archived ?? '—' }
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

const hasFilters = computed(() =>
  Boolean(
    appliedSearch.value ||
    categoryFilter.value !== '__all__' ||
    tagFilter.value !== '__all__' ||
    sortValue.value !== 'pinned_desc'
  )
)

const isAllSelected = computed(
  () => posts.value.length > 0 && posts.value.every((post) => selectedIds.value.includes(post.id))
)

watch(posts, () => {
  selectedIds.value = selectedIds.value.filter((id) => posts.value.some((post) => post.id === id))
})
watch(
  [data, pending],
  () => {
    if (data.value && !pending.value && !error.value && page.value > totalPages.value)
      goPage(totalPages.value)
  },
  { immediate: true }
)

function readPage(value: unknown) {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : 1
}
function readStatus(value: unknown) {
  return typeof value === 'string' && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(value) ? value : ''
}
function readTaxonomy(value: unknown) {
  return typeof value === 'string' && /^\d+$/.test(value) && Number(value) > 0 ? value : '__all__'
}
function readSort(value: unknown) {
  return sortOptions.some((item) => item.value === value) ? String(value) : 'pinned_desc'
}

watch(
  query,
  async (value) => {
    const nextQuery = Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key, item]) =>
            item !== undefined &&
            key !== 'pageSize' &&
            !(key === 'page' && item === 1) &&
            !(key === 'sort' && item === 'pinned_desc')
        )
        .map(([key, item]) => [key, String(item)])
    )
    if (JSON.stringify(nextQuery) !== JSON.stringify(route.query)) await router.replace({ query: nextQuery })
  },
  { immediate: true }
)
watch(
  () => route.query,
  (value) => {
    page.value = readPage(value.page)
    filterStatus.value = readStatus(value.status)
    appliedSearch.value = typeof value.search === 'string' ? value.search : ''
    searchText.value = appliedSearch.value
    categoryFilter.value = readTaxonomy(value.categoryId)
    tagFilter.value = readTaxonomy(value.tagId)
    sortValue.value = readSort(value.sort)
  }
)
watch(
  () => route.fullPath,
  (value) => {
    if (route.path === '/admin/posts') listPath.value = value
  },
  { immediate: true }
)

function postActions(post: AdminPostListItem): DropdownMenuItem[][] {
  const busy =
    batching.value ||
    deletingId.value === post.id ||
    pinningId.value === post.id ||
    knowledgeLoadingId.value === post.id
  const items: DropdownMenuItem[] = [
    ...(post.status === 'PUBLISHED'
      ? [{ label: '查看文章', icon: 'i-lucide-external-link', to: postPath(post.slug), target: '_blank' }]
      : []),
    {
      label: post.isPinned ? '取消置顶' : '置顶文章',
      icon: 'i-lucide-pin',
      disabled: busy,
      onSelect: () => {
        void togglePinned(post)
      }
    }
  ]
  if (post.status === 'PUBLISHED')
    items.push(
      {
        label: post.knowledgeDocument?.enabled ? '同步知识库' : '加入知识库',
        icon: 'i-lucide-orbit',
        disabled: busy,
        onSelect: () => {
          void handleKnowledgeAction(post)
        }
      },
      {
        label: '设为草稿',
        icon: 'i-lucide-file-pen-line',
        disabled: busy,
        onSelect: () => {
          void changeStatus(post, 'DRAFT')
        }
      }
    )
  const actions: DropdownMenuItem[] =
    post.status === 'ARCHIVED'
      ? [
          {
            label: '恢复为草稿',
            icon: 'i-lucide-undo-2',
            disabled: busy,
            onSelect: () => {
              void changeStatus(post, 'DRAFT')
            }
          },
          {
            label: '永久删除',
            icon: 'i-lucide-trash-2',
            color: 'error',
            disabled: busy,
            onSelect: () => {
              void deletePost(post)
            }
          }
        ]
      : [
          {
            label: '移入回收站',
            icon: 'i-lucide-trash-2',
            disabled: busy,
            onSelect: () => {
              void changeStatus(post, 'ARCHIVED')
            }
          }
        ]
  return [items, actions]
}
async function changeStatus(post: AdminPostListItem, status: PostStatus) {
  deletingId.value = post.id
  try {
    await updatePostStatus(post, status)
    toast.add({ title: status === 'ARCHIVED' ? '已移入回收站' : '已设为草稿', color: 'success' })
    await refreshAll()
  } catch (error: unknown) {
    toast.add({ title: '操作失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    deletingId.value = null
  }
}

function setStatus(val: string) {
  filterStatus.value = val
  applyFilters()
}

function applyFilters() {
  appliedSearch.value = searchText.value.trim()
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
      await $fetch(`/api/admin/knowledge/documents/${post.id}/enabled`, {
        method: 'PUT',
        body: { enabled: true }
      })
      toast.add({ title: '已加入 AI 知识库', description: '点击“同步”生成知识向量。', color: 'success' })
    } else {
      await $fetch(`/api/admin/knowledge/documents/${post.id}/sync`, { method: 'POST' })
      toast.add({ title: '知识同步任务已提交', color: 'success' })
    }
    await refresh()
  } catch (error: unknown) {
    toast.add({ title: '知识库操作失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    knowledgeLoadingId.value = null
  }
}

async function refreshAll() {
  await Promise.all([refresh(), refreshOverview()])
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

function statusClass(status?: string) {
  if (status === 'PUBLISHED') return 'is-published'
  if (status === 'ARCHIVED') return 'is-archived'
  return 'is-draft'
}

function knowledgeStatusText(status?: string) {
  return (
    (
      {
        PENDING: '待同步',
        SYNCING: '同步中',
        SYNCED: '已同步',
        STALE: '需要更新',
        FAILED: '同步失败',
        DISABLED: '未启用'
      } as Record<string, string>
    )[status || ''] || '未启用'
  )
}

function postPath(slug: string) {
  return `/${slug}`
}
</script>

<style scoped>
.post-tabs {
  display: flex;
  gap: 26px;
  overflow-x: auto;
  padding: 0 24px;
  border-bottom: 1px solid var(--admin-line);
}
.post-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 57px;
  border-bottom: 2px solid transparent;
  color: var(--admin-muted);
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}
.post-tab.is-active {
  border-color: var(--admin-accent);
  color: var(--admin-accent);
  font-weight: 550;
}
.post-tab span {
  min-width: 20px;
  border-radius: 4px;
  padding: 2px 5px;
  background: #f3f4f6;
  color: #697386;
  text-align: center;
  font-size: 11px;
}
.post-tab.is-active span {
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}
.post-toolbar {
  padding: 18px 24px;
  border-bottom: 1px solid var(--admin-line);
}
.post-filterbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.post-search {
  flex: 1;
  min-width: 170px;
}
.post-select {
  width: 164px;
}
.post-sort {
  width: 174px;
}
.post-bulkbar,
.post-bulk-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.post-bulkbar {
  justify-content: space-between;
  min-height: 32px;
  color: var(--admin-muted);
  font-size: 12px;
}
.post-bulkbar strong {
  color: var(--admin-accent);
}
.post-list-head,
.post-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 76px 65px 95px 85px;
  align-items: center;
  gap: 18px;
  padding-inline: 24px;
}
.post-list-head {
  min-height: 38px;
  background: #fafbfc;
  border-bottom: 1px solid #eef0f3;
  color: #697386;
  font-size: 11px;
}
.post-row {
  min-height: 91px;
  border-bottom: 1px solid #eef0f3;
}
.post-row:hover {
  background: #faf9fc;
}
.post-row.is-selected {
  background: #f7f5fc;
}
.post-check-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}
.post-check-cell input {
  width: 14px;
  height: 14px;
  accent-color: var(--admin-accent);
  cursor: pointer;
}
.post-main-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding-block: 16px;
}
.post-cover {
  display: grid;
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  overflow: hidden;
  place-items: center;
  border: 1px solid #eceaf2;
  border-radius: 6px;
  background: #f7f6fa;
  color: #a39bb6;
}
.post-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.post-copy {
  flex: 1;
  min-width: 0;
}
.post-title-line {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.post-title-link {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.65;
}
.post-title-link:hover {
  color: var(--admin-accent);
}
.post-pin-icon {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  color: #a18857;
}
.post-taxonomy {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 7px;
  color: #6f7887;
  font-size: 11px;
}
.post-tag {
  color: #697386;
}
.post-knowledge-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8c82a8;
}
.post-knowledge-indicator.is-error {
  color: #b16a6a;
}
.post-status-col {
  min-width: 0;
}
.post-metrics-col,
.post-date-col {
  color: #697386;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.post-metrics-col {
  text-align: right;
}
.post-actions-col {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
}
.post-mobile-meta {
  display: none;
}
.post-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  color: #697386;
  font-size: 11px;
}
.post-pages {
  display: flex;
  gap: 3px;
}
@media (max-width: 1200px) {
  .post-list-head,
  .post-row {
    grid-template-columns: 18px minmax(0, 1fr) 70px 83px 78px;
    gap: 12px;
  }
  .post-metrics-col {
    display: none;
  }
  .post-cover {
    width: 38px;
    height: 42px;
  }
  .post-main-info {
    gap: 10px;
  }
  .post-knowledge-indicator > span {
    display: none;
  }
}
@media (max-width: 950px) {
  .post-list-head,
  .post-row {
    grid-template-columns: 18px minmax(0, 1fr) 70px 78px;
  }
  .post-date-col {
    display: none;
  }
  .post-select {
    flex: 1 1 130px;
  }
  .post-search {
    flex-basis: 100%;
  }
  .post-sort {
    flex: 1;
    min-width: 140px;
  }
}
@media (max-width: 640px) {
  .post-tabs {
    gap: 20px;
    padding-inline: 16px;
  }
  .post-tab {
    min-height: 52px;
    font-size: 11px;
    gap: 5px;
  }
  .post-toolbar {
    padding: 15px 16px;
  }
  .post-list-head,
  .post-row {
    grid-template-columns: 16px minmax(0, 1fr) 70px;
    gap: 10px;
    padding-inline: 16px;
  }
  .post-status-col {
    display: none;
  }
  .post-cover {
    display: none;
  }
  .post-title-link {
    font-size: 13px;
  }
  .post-taxonomy {
    gap: 6px;
  }
  .post-tag {
    display: none;
  }
  .post-mobile-meta {
    display: block;
    margin-top: 5px;
    color: #697386;
    font-size: 11px;
  }
  .post-actions-col {
    gap: 0;
  }
  .post-actions-col > a {
    padding-inline: 5px;
  }
  .post-pagination {
    padding: 16px;
  }
  .post-page-range {
    display: none;
  }
  .post-bulk-actions {
    gap: 4px;
  }
}
</style>
