<template>
  <div class="archive-page">
    <section class="archive-shell">
      <div class="archive-layout">
        <main class="archive-main">
          <section class="archive-filters" aria-labelledby="archive-heading" data-page-enter style="--page-enter-order: 0">
            <header class="archive-filter-heading">
              <h1 id="archive-heading">文章归档</h1>
              <span v-if="!listError" class="archive-result-count" role="status">
                {{ listPending ? '正在更新…' : `共 ${data?.data.total || 0} 篇文章` }}
                <span v-if="listPending" class="archive-loading-indicator" aria-hidden="true" />
              </span>
            </header>
            <div class="category-filters" role="group" aria-label="按主题筛选">
              <button
                v-for="filter in categoryFilters"
                :key="filter.key"
                type="button"
                :aria-pressed="activeCategory === filter.key"
                @click="selectCategory(filter.key)"
              >
                {{ filter.label }}
              </button>
            </div>
            <USelect
              class="archive-year-picker"
              aria-label="按年份筛选"
              :model-value="activeYear"
              :items="yearFilters"
              :content="{ position: 'popper', align: 'end', sideOffset: 6 }"
              :ui="yearPickerUi"
              icon="i-lucide-calendar-days"
              color="neutral"
              variant="ghost"
              @update:model-value="selectYear"
            />
            <button v-if="activeKeyword" type="button" class="archive-search-filter" :aria-label="`移除搜索关键词 ${activeKeyword}`" @click="clearKeyword">
              <span>搜索关键词「{{ activeKeyword }}」</span>
              <UIcon name="i-lucide-x" aria-hidden="true" />
            </button>
          </section>

          <div class="archive-results" :aria-busy="listPending" data-page-enter style="--page-enter-order: 1">
            <div class="archive-results-content" :class="{ 'is-covered': showListSkeleton, 'is-settled': !listPending }" :inert="listPending">
              <div v-if="listError" class="archive-empty is-error" role="alert">
                <strong>文章加载失败</strong>
                <span>网络似乎开了个小差，请稍后重试。</span>
                <button type="button" @click="refreshArchive()">重新加载</button>
              </div>
              <div v-else-if="posts.length" class="archive-list">
                <ArchivePostCard v-for="post in posts" :key="post.id" :post="post" />
              </div>
              <div v-else class="archive-empty">暂无归档文章</div>
            </div>
            <div v-if="showListSkeleton" class="archive-list archive-loading-overlay" aria-hidden="true">
              <PostCardSkeleton variant="archive" :count="Math.max(posts.length, 1)" />
            </div>
          </div>

          <div :inert="listPending" :class="{ 'archive-pagination-loading': showListSkeleton }">
            <SeoPagination v-if="!listError" :page="currentPage" :total="totalPages" :page-to="pageTo" />
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
import { categoryNavigation } from '~/utils/category-navigation'

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const route = useRoute()
const activeCategory = computed(() => typeof route.query.category === 'string' ? `category:${route.query.category}` : 'all')
const activeYear = computed(() => typeof route.query.year === 'string' ? route.query.year : 'all')
const activeKeyword = computed(() => typeof route.query.keyword === 'string' ? route.query.keyword.trim() : '')
const pageSize = 10
const { currentPage, pageTo } = usePublicPagination()

const archiveQuery = computed(() => ({
  page: currentPage.value,
  pageSize,
  keyword: activeKeyword.value || undefined,
  category: activeCategory.value.startsWith('category:') ? activeCategory.value.slice('category:'.length) : undefined,
  year: activeYear.value === 'all' ? undefined : activeYear.value
}))

const [{ data, status: listStatus, error: listError, refresh: refreshArchive }, { data: categoryData }, { data: tagData }, { data: sidebarPostData }] = await Promise.all([
  useFetch<ApiResult<PublicArchivePayload>>('/api/archive', { query: archiveQuery, dedupe: 'cancel' }),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/tags'),
  useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query: { page: 1, pageSize: 4 } })
])

assertPublicPageExists(data.value?.data)

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const posts = computed(() => data.value?.data.items || [])
const listPending = computed(() => listStatus.value === 'pending')
const showListSkeleton = useDelayedPending(listPending, 280)
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

const categoryFilters = computed(() => [
  { key: 'all', label: '全部文章' },
  ...categoryNavigation(categories.value, 6).map(category => ({
    key: `category:${category.slug}`,
    label: category.name
  }))
])

const yearFilters = computed(() => {
  const years = new Set((data.value?.data.years || []).map(String))
  if (activeYear.value !== 'all') years.add(activeYear.value)
  return [
    { label: '全部年份', value: 'all' },
    ...Array.from(years, year => ({ label: `${year} 年`, value: year }))
  ]
})

const yearPickerUi = {
  leadingIcon: 'size-4 text-[var(--theme-text-muted)]',
  trailingIcon: 'size-3.5 text-[var(--theme-text-muted)] group-data-[state=open]:rotate-180 motion-safe:transition-transform',
  content: 'min-w-36 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface-raised)] shadow-lg ring-0',
  viewport: 'p-1',
  item: 'min-h-9 px-2.5 text-[var(--theme-text-soft)] data-highlighted:before:bg-[var(--theme-surface-hover)] data-[state=checked]:text-[var(--theme-accent)]',
  itemTrailingIcon: 'size-4 text-[var(--theme-accent)]'
}

const totalPages = computed(() => Math.ceil((data.value?.data.total || 0) / pageSize))

function selectCategory(key: string) {
  if (key === activeCategory.value) return
  void navigateTo({ path: route.path, query: { ...route.query, category: key.startsWith('category:') ? key.slice(9) : undefined, page: undefined } })
}

function selectYear(year: string) {
  if (year === activeYear.value) return
  void navigateTo({ path: route.path, query: { ...route.query, year: year === 'all' ? undefined : year, page: undefined } })
}

function clearKeyword() {
  void navigateTo({ path: route.path, query: { ...route.query, keyword: undefined, page: undefined } })
}

const hotPosts = computed(() => {
  return sidebarPostData.value?.data.items || []
})

useSeoMeta({
  title: () => `文章归档${currentPage.value > 1 ? ` · 第 ${currentPage.value} 页` : ''} - ${siteName.value}`,
  description: () => `按时间和分类浏览 ${siteName.value} 的文章。`
})

</script>

<style scoped>
.archive-page {
  min-height: 100vh;
  color: var(--theme-text);
}

.archive-shell {
  width: var(--site-content-width);
  margin: 0 auto;
  padding: 20px 0 30px;
}

.archive-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.archive-main {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
  padding-left: 8px;
}

.archive-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px 16px;
  margin-bottom: 20px;
  padding-top: 8px;
}

.archive-filters::before {
  grid-area: 2 / 1 / 3 / -1;
  align-self: end;
  border-bottom: 1px solid var(--theme-border);
  content: "";
}

.archive-filter-heading {
  display: flex;
  grid-area: 1 / 1 / 2 / -1;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 5px 14px;
}

.archive-filter-heading h1 {
  margin: 0;
  color: var(--theme-text-strong);
  font-family: Georgia, "Noto Serif SC", "Source Han Serif SC", serif;
  font-size: clamp(27px, 4vw, 38px);
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: .025em;
}

.archive-result-count {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--theme-text-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.archive-loading-indicator {
  width: 12px;
  height: 12px;
  border: 1.5px solid color-mix(in srgb, var(--theme-accent) 18%, transparent);
  border-top-color: var(--theme-accent);
  border-radius: 50%;
  animation: archive-loading-spin 800ms linear infinite;
}

.category-filters {
  display: flex;
  grid-area: 2 / 1;
  align-self: end;
  flex-wrap: wrap;
  gap: 0 clamp(8px, 1.8vw, 20px);
  min-width: 0;
}

.category-filters button {
  position: relative;
  min-height: 42px;
  max-width: 100%;
  padding: 7px 3px;
  color: var(--theme-text-soft);
  font-size: 13px;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.category-filters button:hover,
.category-filters button[aria-pressed="true"] {
  color: color-mix(in srgb, var(--theme-accent) 86%, var(--theme-text-strong));
}

.category-filters button[aria-pressed="true"] { font-weight: 650; }

.category-filters button[aria-pressed="true"]::after {
  position: absolute;
  inset: auto 0 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--theme-accent);
  content: "";
}

.archive-filters :deep(.archive-year-picker) {
  grid-area: 2 / 2;
  justify-self: end;
  min-height: 42px;
  color: var(--theme-text-soft);
  white-space: nowrap;
  cursor: pointer;
}

.archive-filters :deep(.archive-year-picker:hover),
.archive-filters :deep(.archive-year-picker[data-state="open"]) {
  background: var(--theme-surface-hover);
  color: var(--theme-text-strong);
}

.archive-search-filter {
  display: inline-flex;
  grid-column: 1 / -1;
  justify-self: start;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  color: var(--theme-text-muted);
  font-size: 13px;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
}

.archive-search-filter:hover { color: var(--theme-accent); }
.archive-search-filter .iconify { flex: none; }

.category-filters button:focus-visible,
.archive-search-filter:focus-visible,
.archive-filters :deep(.archive-year-picker:focus-visible) {
  outline: 2px solid var(--theme-accent);
  outline-offset: -2px;
}

.archive-results { position: relative; }
.archive-results-content.is-covered { visibility: hidden; }
.archive-results-content.is-settled { animation: archive-results-in 140ms ease-out; }
.archive-results-content > .archive-empty { display: grid; min-height: 156px; place-content: center; }
.archive-loading-overlay { position: absolute; inset: 0; overflow: hidden; align-content: start; animation: archive-results-in 120ms ease-out; }
.archive-pagination-loading { visibility: hidden; }

@keyframes archive-loading-spin { to { transform: rotate(360deg); } }
@keyframes archive-results-in { from { opacity: .6; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .archive-loading-indicator,
  .archive-results-content.is-settled,
  .archive-loading-overlay { animation: none; }
}

.archive-list {
  display: grid;
  min-width: 0;
  gap: 14px;
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


.archive-sidebar {
  position: sticky;
  top: 84px;
  display: grid;
  grid-column: 1;
  grid-row: 1;
  gap: 10px;
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
    padding-top: 20px;
  }

  .archive-filters { gap: 8px 4px; margin-bottom: 16px; padding: 0; }
  .archive-filter-heading { grid-column: 1; }
  .archive-filters :deep(.archive-year-picker) { grid-area: 1 / 2; }
  .category-filters { grid-column: 1 / -1; gap: 0 9px; }
  .archive-results-content > .archive-empty { min-height: 106px; }
}

</style>
