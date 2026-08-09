<template>
  <div class="archive-page">
    <section class="archive-shell">
      <div class="archive-layout">
        <main class="archive-main">
          <section class="archive-filters" aria-label="文章筛选" data-page-enter style="--page-enter-order: 0">
            <div class="filter-row category-filters">
              <button
                v-for="filter in categoryFilters"
                :key="filter.key"
                type="button"
                :class="{ 'is-active': activeCategory === filter.key }"
                :disabled="listPending"
                @click="selectCategory(filter.key)"
              >
                <UIcon :name="filter.icon" class="filter-icon" aria-hidden="true" />
                {{ filter.label }}
              </button>
            </div>
            <div class="filter-row year-filters">
              <button
                v-for="year in yearFilters"
                :key="year"
                type="button"
                :class="{ 'is-active': activeYear === year }"
                :disabled="listPending"
                @click="selectYear(year)"
              >
                {{ year === 'all' ? '全部' : year }}
              </button>
            </div>
          </section>

          <div
            v-if="showListSkeleton"
            class="archive-list"
            role="status"
            aria-label="正在加载文章"
            data-page-enter
            style="--page-enter-order: 1"
          >
            <PostCardSkeleton variant="archive" :count="pageSize" />
          </div>

          <div v-else-if="listError" class="archive-empty is-error" role="alert" data-page-enter style="--page-enter-order: 1">
            <strong>文章加载失败</strong>
            <span>网络似乎开了个小差，请稍后重试。</span>
            <button type="button" @click="refreshArchive()">重新加载</button>
          </div>

          <div v-else class="archive-list" :aria-busy="listPending" data-page-enter style="--page-enter-order: 1">
            <CardReveal v-for="post in pagedPosts" :key="post.id" variant="archive">
              <ArchivePostCard :post="post" />
            </CardReveal>
          </div>

          <div v-if="totalPages > 1 && !listError" class="pager" data-page-enter style="--page-enter-order: 2">
            <button class="page-dot" :disabled="currentPage <= 1 || listPending" @click="goToPage(currentPage - 1)">
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <template v-for="item in visiblePageItems" :key="item.key">
              <span v-if="item.page === null" class="page-ellipsis" aria-hidden="true">…</span>
              <button
                v-else
                class="page-dot"
                :class="{ 'is-active': item.page === currentPage }"
                :disabled="listPending"
                :aria-current="item.page === currentPage ? 'page' : undefined"
                @click="goToPage(item.page)"
              >{{ item.page }}</button>
            </template>
            <button class="page-dot" :disabled="currentPage >= totalPages || listPending" @click="goToPage(currentPage + 1)">
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>

          <div v-if="!listPending && !listError && !posts.length" class="archive-empty" data-page-enter style="--page-enter-order: 1">
            暂无归档文章
          </div>
        </main>

        <PublicSidebar
          class="archive-sidebar"
          data-page-enter
          style="--page-enter-order: 1"
          :site-name="siteName"
          :description="siteSettings.sidebar_description"
          :categories="categories"
          :tags="tags"
          :posts="hotPosts"
        />

      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import type { PublicArchivePayload, PublicPostListPayload } from '~~/types/dto/post'
import type { TaxonomyItem } from '~~/types/dto/taxonomy'
import CardReveal from '~/components/CardReveal.vue'
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@lucide/vue'

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const activeCategory = ref('all')
const activeYear = ref<string | number>('all')
const pageSize = 10
const currentPage = ref(1)

const archiveQuery = computed(() => ({
  page: currentPage.value,
  pageSize,
  category: activeCategory.value.startsWith('category:') ? activeCategory.value.slice('category:'.length) : undefined,
  year: activeYear.value === 'all' ? undefined : activeYear.value
}))

const [{ data, status: listStatus, error: listError, refresh: refreshArchive }, { data: categoryData }, { data: tagData }, { data: sidebarPostData }] = await Promise.all([
  useFetch<ApiResult<PublicArchivePayload>>('/api/archive', { query: archiveQuery }),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/tags'),
  useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query: { page: 1, pageSize: 4 } })
])

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const posts = computed(() => data.value?.data.items || [])
const listPending = computed(() => listStatus.value === 'pending')
const showListSkeleton = useDelayedPending(listPending)
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

const categoryFilters = computed(() => [
  { key: 'all', label: '全部内容', icon: 'i-lucide-layout-list' },
  ...categories.value.slice(0, 6).map(category => ({
    key: `category:${category.slug}`,
    label: category.name,
    icon: category.icon || 'i-lucide-folder'
  }))
])

const yearFilters = computed(() => [
  'all',
  ...(data.value?.data.years || [])
])

const totalPages = computed(() => Math.ceil((data.value?.data.total || 0) / pageSize))
const visiblePageItems = computed(() => {
  const total = totalPages.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => ({ key: `page-${index + 1}`, page: index + 1 }))
  const pages = new Set([1, total, currentPage.value - 1, currentPage.value, currentPage.value + 1])
  const sorted = [...pages].filter(page => page >= 1 && page <= total).sort((a, b) => a - b)
  const items: Array<{ key: string, page: number | null }> = []
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && page - previous > 1) items.push({ key: `ellipsis-${previous}-${page}`, page: null })
    items.push({ key: `page-${page}`, page })
  })
  return items
})
const pagedPosts = computed(() => posts.value)

function selectCategory(key: string) {
  activeCategory.value = key
  currentPage.value = 1
}

function selectYear(year: string | number) {
  activeYear.value = year
  currentPage.value = 1
}

function goToPage(p: number) {
  currentPage.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const hotPosts = computed(() => {
  return sidebarPostData.value?.data.items || []
})

useSeoMeta({
  title: '归档',
  description: '博客文章归档'
})

</script>

<style scoped>
.archive-page {
  min-height: 100vh;
  color: var(--theme-text);
}

.archive-shell {
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
  padding: 20px 0 30px;
}

.archive-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.archive-author,
.stats-card,
.hot-card {
  border: 1px solid #dfe6f3;
  border-radius: 8px;
  background: var(--theme-surface);
}

.archive-main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  padding-left: 8px;
}

.archive-filters {
  margin-bottom: 24px;
  border: 1px solid color-mix(in srgb, var(--theme-border) 72%, transparent);
  border-radius: 24px;
  background: var(--theme-surface);
  padding: 18px 20px;
  box-shadow: 0 5px 24px rgb(var(--theme-shadow) / 5%);
}

.filter-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-row::-webkit-scrollbar { display: none; }

.filter-row button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--theme-text-muted);
  font: inherit;
  font-weight: 750;
  cursor: pointer;
  transition: color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.category-filters {
  padding-bottom: 15px;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-border) 68%, transparent);
}

.category-filters button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  font-size: 14px;
}

.filter-icon {
  width: 16px;
  height: 16px;
}

.category-filters button:hover { background: var(--theme-surface-hover); }

.category-filters button.is-active {
  background: var(--theme-accent);
  color: white;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--theme-accent) 32%, transparent);
}

.year-filters { padding-top: 15px; }

.year-filters button {
  padding: 6px 13px;
  font-size: 12px;
}

.year-filters button:hover { background: var(--theme-surface-hover); }

.year-filters button.is-active {
  background: var(--theme-text);
  color: var(--theme-surface);
}

.archive-list {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 16px 0 0;
}

.page-dot {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--theme-border-soft);
  border-radius: 999px;
  background: var(--theme-surface);
  color: var(--theme-text-soft);
  font-weight: 800;
  cursor: pointer;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.page-dot svg { width: 16px; height: 16px; }

.page-dot:hover:not(:disabled):not(.is-active) {
  border-color: #4964f4;
}

.page-dot:disabled {
  opacity: 0.4;
  cursor: default;
}

.page-dot.is-active {
  background: #4964f4;
  color: white;
}

.page-ellipsis {
  display: grid;
  width: 22px;
  height: 38px;
  place-items: center;
  color: #9097a5;
  font-size: 15px;
  font-weight: 800;
  user-select: none;
}

.archive-empty {
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--theme-surface) 76%, transparent);
  padding: 44px;
  color: var(--theme-text-muted);
  text-align: center;
}

.archive-empty.is-error {
  display: grid;
  justify-items: center;
  gap: 8px;
}

.archive-empty.is-error strong { color: var(--theme-text); font-size: 17px; }
.archive-empty.is-error span { font-size: 13px; }
.archive-empty.is-error button {
  margin-top: 8px;
  border: 0;
  border-radius: 999px;
  background: var(--theme-text);
  color: var(--theme-surface);
  padding: 9px 16px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.filter-row button:disabled { cursor: wait; }

.archive-sidebar {
  position: sticky;
  top: 84px;
  display: grid;
  grid-column: 1;
  grid-row: 1;
  gap: 10px;
}

.archive-author {
  padding: 26px 18px 20px;
  background: linear-gradient(135deg, #6378ff, #3852f2);
  color: white;
}

.author-avatar {
  display: grid;
  width: 92px;
  height: 92px;
  place-items: center;
  margin: 18px auto 24px;
  border: 4px solid rgb(255 255 255 / 72%);
  border-radius: 999px;
  background: #16181e;
  font-size: 38px;
  font-weight: 900;
}

.archive-author h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
}

.archive-author p {
  margin: 6px 0 16px;
  color: rgb(255 255 255 / 82%);
  font-size: 13px;
}

.archive-author div {
  display: flex;
  gap: 8px;
}

.archive-author a {
  flex: 1;
  padding: 8px 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-surface) 18%, transparent);
  text-align: center;
  font-size: 13px;
  font-weight: 900;
}

.stats-card,
.hot-card {
  padding: 16px;
}

.stats-card h2,
.hot-card h2 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 900;
}

.stats-card p {
  display: flex;
  justify-content: space-between;
  margin: 10px 0 0;
  color: var(--theme-text-muted);
}

.stats-card strong {
  color: var(--theme-text);
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title a {
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.hot-card > a {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  margin-top: 12px;
}

.hot-card > a span {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: var(--theme-surface-hover);
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 900;
}

.hot-card > a:first-of-type span {
  background: #4964f4;
  color: white;
}

.hot-card strong {
  color: var(--theme-text-soft);
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .archive-layout {
    grid-template-columns: 1fr;
  }

  .archive-main,
  .archive-sidebar {
    grid-column: auto;
    grid-row: auto;
  }

  .archive-main {
    padding-left: 0;
  }

  .archive-sidebar {
    position: static;
  }
}

@media (max-width: 640px) {
  .archive-shell {
    width: min(100% - 20px, 1290px);
    padding-top: 20px;
  }

  .archive-filters { border-radius: 20px; padding: 14px; }

  .pager {
    gap: 8px;
  }
}

</style>
