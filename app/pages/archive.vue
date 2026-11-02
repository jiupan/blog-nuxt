<template>
  <div class="archive-page">
    <section class="archive-shell">
      <div class="archive-layout">
        <main class="archive-main">
          <section class="archive-filters" aria-labelledby="archive-heading" data-page-enter style="--page-enter-order: 0">
            <header class="archive-filter-heading">
              <div class="archive-filter-title">
                <h1 id="archive-heading">文章归档</h1>
                <span v-if="!listError" class="archive-result-count" role="status" aria-live="polite">
                  {{ listPending ? '正在查找…' : `共 ${data?.data.total || 0} 篇文章` }}
                </span>
              </div>
              <div class="archive-filter-tools">
                <button v-if="hasFilters" type="button" class="archive-filter-reset" aria-label="清除所有筛选" @click="resetFilters">
                  <UIcon name="i-lucide-rotate-ccw" aria-hidden="true" />
                  <span>清除筛选</span>
                </button>
                <label class="archive-year-picker">
                  <span class="sr-only">按年份筛选</span>
                  <select :value="activeYear" :disabled="listPending" aria-label="按年份筛选" @change="onYearChange">
                    <option v-for="year in yearFilters" :key="year" :value="year" :selected="activeYear === year">{{ year === 'all' ? '全部年份' : `${year} 年` }}</option>
                  </select>
                  <UIcon name="i-lucide-chevron-down" class="year-picker-chevron" aria-hidden="true" />
                </label>
              </div>
            </header>
            <nav class="category-filters" aria-label="按主题筛选">
              <button
                v-for="filter in categoryFilters"
                :key="filter.key"
                type="button"
                :class="{ 'is-active': activeCategory === filter.key }"
                :aria-pressed="activeCategory === filter.key"
                :disabled="listPending"
                @click="selectCategory(filter.key)"
              >
                {{ filter.label }}
              </button>
            </nav>
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

          <SeoPagination v-if="!listError" :page="currentPage" :total="totalPages" :page-to="pageTo" />

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
import { categoryNavigation } from '~/utils/category-navigation'
import CardReveal from '~/components/CardReveal.vue'

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const route = useRoute()
const activeCategory = computed(() => typeof route.query.category === 'string' ? `category:${route.query.category}` : 'all')
const activeYear = computed(() => typeof route.query.year === 'string' ? route.query.year : 'all')
const pageSize = 10
const { currentPage, pageTo } = usePublicPagination()

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
  { key: 'all', label: '全部文章' },
  ...categoryNavigation(categories.value, 6).map(category => ({
    key: `category:${category.slug}`,
    label: category.name
  }))
])

const yearFilters = computed(() => [
  'all',
  ...(data.value?.data.years || []).map(String)
])

const hasFilters = computed(() => activeCategory.value !== 'all' || activeYear.value !== 'all')

const totalPages = computed(() => Math.ceil((data.value?.data.total || 0) / pageSize))

const pagedPosts = computed(() => posts.value)

function selectCategory(key: string) {
  void navigateTo({ path: route.path, query: { ...route.query, category: key.startsWith('category:') ? key.slice(9) : undefined, page: undefined } })
}

function selectYear(year: string | number) {
  void navigateTo({ path: route.path, query: { ...route.query, year: year === 'all' ? undefined : String(year), page: undefined } })
}


function onYearChange(event: Event) {
  selectYear((event.target as HTMLSelectElement).value)
}

function resetFilters() {
  void navigateTo({ path: route.path, query: { ...route.query, category: undefined, year: undefined, page: undefined } })
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
  padding: 6px 4px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-border) 80%, transparent);
}
.archive-filter-heading,
.archive-filter-title,
.archive-filter-tools { display: flex; align-items: center; }
.archive-filter-heading { justify-content: space-between; gap: 20px; }
.archive-filter-title { align-items: baseline; gap: 16px; min-width: 0; }
.archive-filter-title h1 { margin: 0; color: var(--theme-text-strong); font-family: Georgia, "Noto Serif SC", "Source Han Serif SC", serif; font-size: 32px; font-weight: 600; line-height: 1.5; letter-spacing: 1px; }
.archive-result-count { min-width: 78px; color: var(--theme-text-faint); font-size: 12px; font-variant-numeric: tabular-nums; }
.archive-filter-tools { flex-shrink: 0; gap: 18px; }
.archive-year-picker { position: relative; display: block; width: 104px; border-radius: 6px; }
.archive-year-picker select { display: block; width: 100%; appearance: none; border: 0; border-radius: inherit; background: transparent; padding: 8px 22px 8px 0; color: var(--theme-text-muted); font: inherit; font-size: 13px; line-height: 20px; text-align: right; cursor: pointer; }
.archive-year-picker select:hover { color: var(--theme-accent); }
.year-picker-chevron { position: absolute; top: 50%; right: 2px; width: 13px; height: 13px; transform: translateY(-50%); color: var(--theme-text-muted); pointer-events: none; }
.archive-filter-reset { display: inline-flex; align-items: center; gap: 5px; padding: 6px 0; border: 0; background: transparent; color: var(--theme-text-muted); font-size: 12px; cursor: pointer; }
.archive-filter-reset .iconify { width: 14px; height: 14px; }
.archive-filter-reset:hover { color: var(--theme-accent); }
.category-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 16px; }
.category-filters button { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; padding: 7px 15px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--theme-text-muted); font: inherit; font-size: 13px; font-weight: 500; line-height: 20px; white-space: nowrap; cursor: pointer; transition: color 160ms ease, background-color 160ms ease; }
.category-filters button:hover { background: color-mix(in srgb, var(--theme-surface) 65%, transparent); color: var(--theme-text); }
.category-filters button.is-active { border-color: var(--theme-border); background: var(--theme-surface); color: var(--theme-accent); font-weight: 650; box-shadow: 0 2px 6px rgb(var(--theme-shadow) / 3%); }
.category-filters button:focus-visible,
.archive-filter-reset:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: -2px; }
.archive-year-picker:focus-within { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.archive-year-picker select:focus { outline: none; }
.archive-year-picker select:disabled,
.category-filters button:disabled { cursor: wait; opacity: .65; }

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

  .archive-filters { padding: 0 6px 16px; margin-bottom: 18px; }
  .archive-filter-heading { gap: 10px; align-items: center; }
  .archive-filter-title { flex-direction: column; align-items: flex-start; gap: 1px; }
  .archive-filter-title h1 { font-size: 28px; }
  .archive-filter-tools { gap: 10px; }
  .archive-year-picker { width: 96px; }
  .archive-filter-reset { width: 22px; height: 38px; justify-content: center; }
  .archive-filter-reset span { display: none; }
  .archive-filter-reset .iconify { display: block; }
  .category-filters { gap: 4px; margin-top: 14px; }
  .category-filters button { padding-inline: 13px; }


  .pager {
    gap: 8px;
  }
}

</style>
