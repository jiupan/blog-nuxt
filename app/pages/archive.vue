<template>
  <div class="archive-page">
    <section class="archive-shell">
      <div class="archive-layout">
        <main class="archive-main">
          <section class="archive-filters" aria-label="文章筛选">
            <div class="filter-row category-filters">
              <button
                v-for="filter in categoryFilters"
                :key="filter.key"
                type="button"
                :class="{ 'is-active': activeCategory === filter.key }"
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
                @click="selectYear(year)"
              >
                {{ year === 'all' ? '全部' : year }}
              </button>
            </div>
          </section>

          <div class="archive-list">
            <NuxtLink v-for="post in pagedPosts" :key="post.id" :to="postPath(post.slug)" class="archive-item">
              <span class="archive-thumb" :class="!post.cover && coverFallbackClass(post.id)">
                <img v-if="post.cover" :src="post.cover" :alt="post.title">
                <span v-else>{{ coverWord(post) }}</span>
              </span>
              <div class="archive-copy">
                <h2>{{ post.title }}</h2>
                <p><strong>{{ post.category?.name || '未分类' }}</strong><span>/</span>{{ post.summary || '这篇文章暂时没有摘要，点击阅读全文。' }}</p>
                <div class="archive-meta">
                  <span>
                    <CalendarIcon aria-hidden="true" />
                    {{ formatArchiveDate(post.publishedAt) }}
                  </span>
                  <span>
                    <EyeIcon aria-hidden="true" />
                    {{ formatViews(post.viewCount) }}
                  </span>
                </div>
              </div>
              <span class="archive-arrow" aria-hidden="true">
                <ChevronRightIcon />
              </span>
            </NuxtLink>
          </div>

          <div v-if="totalPages > 1" class="pager">
            <button class="page-dot" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <template v-for="item in visiblePageItems" :key="item.key">
              <span v-if="item.page === null" class="page-ellipsis" aria-hidden="true">…</span>
              <button
                v-else
                class="page-dot"
                :class="{ 'is-active': item.page === currentPage }"
                :aria-current="item.page === currentPage ? 'page' : undefined"
                @click="goToPage(item.page)"
              >{{ item.page }}</button>
            </template>
            <button class="page-dot" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>

          <div v-if="!posts.length" class="archive-empty">
            暂无归档文章
          </div>
        </main>

        <PublicSidebar
          class="archive-sidebar"
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
import {
  Calendar as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Eye as EyeIcon
} from '@lucide/vue'

type ArchivePost = {
  id: number
  title: string
  slug: string
  summary?: string | null
  cover?: string | null
  publishedAt?: string | Date | null
  viewCount?: number | null
  category?: {
    name: string
    slug: string
  } | null
}

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

const [{ data }, { data: categoryData }, { data: tagData }, { data: sidebarPostData }] = await Promise.all([
  useFetch<ApiResult<PublicArchivePayload>>('/api/archive', { query: archiveQuery }),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/tags'),
  useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query: { page: 1, pageSize: 4 } })
])

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const posts = computed(() => data.value?.data.items || [])
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

function formatArchiveDate(value?: string | Date | null) {
  if (!value) {
    return '未设置'
  }

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

function formatViews(value?: number | null) {
  const views = value || 0
  return views >= 1000 ? `${(views / 1000).toFixed(1).replace('.0', '')}k` : String(views)
}

const coverFallbackClasses = ['cover-pink', 'cover-blue', 'cover-green', 'cover-orange', 'cover-gray', 'cover-coral']

function coverFallbackClass(id: number) {
  return coverFallbackClasses[id % coverFallbackClasses.length]
}

function coverWord(post: ArchivePost) {
  return (post.category?.name || post.title).slice(0, 4)
}
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
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 36px;
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
  min-width: 0;
  padding-right: 8px;
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
  gap: 14px;
}

.archive-item {
  display: flex;
  gap: 22px;
  align-items: center;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--theme-border) 68%, transparent);
  border-radius: 24px;
  background: var(--theme-surface);
  box-shadow: 0 4px 20px rgb(var(--theme-shadow) / 4%);
  transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
}

.archive-item:hover {
  border-color: color-mix(in srgb, var(--theme-accent) 34%, var(--theme-border));
  box-shadow: 0 15px 34px rgb(var(--theme-shadow) / 13%);
  transform: translateY(-4px) scale(1.005);
}

.archive-thumb {
  display: grid;
  flex: 0 0 160px;
  width: 160px;
  height: 120px;
  place-items: center;
  overflow: hidden;
  border-radius: 16px;
  background: var(--theme-text);
  color: rgba(255, 255, 255, 0.72);
  font-size: 23px;
  font-weight: 900;
  box-shadow: 0 10px 24px rgb(var(--theme-shadow) / 8%);
}

.archive-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 420ms ease;
}

.archive-item:hover .archive-thumb img {
  transform: scale(1.05);
}

.cover-pink { background: linear-gradient(135deg, #5c2348, #8b2f6a); }
.cover-blue { background: linear-gradient(135deg, #18345f, #1f5d91); }
.cover-green { background: linear-gradient(135deg, #29462c, #4e7433); }
.cover-orange { background: linear-gradient(135deg, #5a3517, #9a5a1d); }
.cover-gray { background: linear-gradient(135deg, var(--theme-text), #5d6470); }
.cover-coral { background: linear-gradient(135deg, #68312e, #a9463e); }

.archive-copy h2 {
  margin: 0;
  color: var(--theme-text);
  font-size: 20px;
  font-weight: 850;
  line-height: 1.4;
  transition: color 180ms ease;
}

.archive-item:hover .archive-copy h2 { color: var(--theme-accent); }

.archive-copy p {
  overflow: hidden;
  margin: 10px 0 0;
  color: var(--theme-text-muted);
  font-size: 14px;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.archive-copy p strong { color: var(--theme-text-soft); }
.archive-copy p span { margin: 0 7px; color: var(--theme-text-faint); }

.archive-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-top: 12px;
  color: var(--theme-text-faint);
  font-size: 12px;
  font-weight: 750;
}

.archive-meta span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.archive-meta svg {
  width: 14px;
  height: 14px;
}

.archive-copy { flex: 1 1 auto; min-width: 0; }

.archive-arrow {
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  border-radius: 999px;
  background: var(--theme-surface-muted);
  color: var(--theme-text-faint);
  transition: color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.archive-arrow svg { width: 20px; height: 20px; }

.archive-item:hover .archive-arrow {
  background: color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface));
  color: var(--theme-accent);
  transform: translateX(3px);
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

.archive-sidebar {
  position: sticky;
  top: 84px;
  display: grid;
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

  .archive-sidebar {
    position: static;
  }
}

@media (max-width: 640px) {
  .archive-shell {
    width: min(100% - 20px, 1290px);
    padding-top: 20px;
  }

  .archive-main { padding-right: 0; }

  .archive-filters { border-radius: 20px; padding: 14px; }

  .archive-item {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    gap: 14px;
    border-radius: 18px;
    padding: 9px;
  }

  .archive-thumb {
    width: 104px;
    height: 88px;
    border-radius: 13px;
    font-size: 17px;
  }

  .archive-copy h2 { font-size: 16px; }
  .archive-copy p { margin-top: 6px; font-size: 12px; }
  .archive-meta { gap: 10px; margin-top: 7px; font-size: 10px; }
  .archive-meta svg { width: 12px; height: 12px; }

  .archive-arrow { display: none; }

  .pager {
    gap: 8px;
  }
}

@media (max-width: 420px) {
  .archive-item { grid-template-columns: 86px minmax(0, 1fr); gap: 11px; }
  .archive-thumb { width: 86px; height: 78px; }
  .archive-copy p { display: none; }
  .archive-copy h2 {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}
</style>
