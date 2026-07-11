<template>
  <div class="archive-page">
    <section class="archive-shell">
      <div class="archive-layout">
        <main class="archive-main">
          <header class="archive-heading">
            <h1>文字档案</h1>
            <p>记录思考的轨迹，分享代码与生活的温度。</p>
          </header>

          <nav class="archive-tabs" aria-label="文章筛选">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              type="button"
              :class="{ 'is-active': activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </nav>

          <div class="archive-list">
            <NuxtLink v-for="post in pagedPosts" :key="post.id" :to="postPath(post.slug)" class="archive-item">
              <div class="archive-date-col">
                <time>{{ formatArchiveDate(post.publishedAt) }}</time>
                <span class="archive-thumb" :class="!post.cover && coverFallbackClass(post.id)">
                  <img v-if="post.cover" :src="post.cover" :alt="post.title">
                  <span v-else>{{ coverWord(post) }}</span>
                </span>
              </div>
              <div class="archive-copy">
                <h2>{{ post.title }}</h2>
                <p>{{ post.summary || '这篇文章暂时没有摘要，点击阅读全文。' }}</p>
                <div class="archive-meta">
                  <span class="meta-left">
                    <span>{{ post.category?.name || '未分类' }}</span>
                    <span class="read-time">
                      <BookOpenIcon aria-hidden="true" />
                      {{ readMinutes(post) }} min read
                    </span>
                  </span>
                  <span class="read-more">
                    阅读全文
                    <ArrowRightIcon aria-hidden="true" />
                  </span>
                </div>
              </div>
            </NuxtLink>
          </div>

          <div v-if="totalPages > 1" class="pager">
            <button :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">← 上一页</button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一页 →</button>
          </div>

          <div v-if="!filteredPosts.length" class="archive-empty">
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
import {
  ArrowRight as ArrowRightIcon,
  BookOpen as BookOpenIcon
} from '@lucide/vue'

type ArchivePost = {
  id: number
  title: string
  slug: string
  summary?: string | null
  cover?: string | null
  publishedAt?: string | Date | null
  viewCount?: number
  category?: {
    name: string
    slug: string
  } | null
}

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const activeTab = ref('all')
const pageSize = 6
const currentPage = ref(1)

const [{ data }, { data: categoryData }, { data: tagData }] = await Promise.all([
  useFetch<{ data: { items: ArchivePost[] } }>('/api/posts', { query: { pageSize: 100 } }),
  useFetch('/api/categories'),
  useFetch('/api/tags')
])

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const siteInitial = computed(() => siteName.value.slice(0, 1).toUpperCase())
const posts = computed(() => data.value?.data.items || [])
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

const tabs = computed(() => [
  { key: 'all', label: '全部文章' },
  { key: 'featured', label: '精选' },
  { key: 'hot', label: '热门' },
  ...categories.value.slice(0, 6).map((category: any) => ({
    key: `category:${category.slug}`,
    label: category.name
  }))
])

const tabFilteredPosts = computed(() => {
  if (activeTab.value.startsWith('category:')) {
    const slug = activeTab.value.replace('category:', '')
    return posts.value.filter((post) => post.category?.slug === slug)
  }

  if (activeTab.value === 'hot') {
    return [...posts.value].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
  }

  return posts.value
})

const filteredPosts = computed(() => {
  return tabFilteredPosts.value
})

const totalPages = computed(() => Math.ceil(filteredPosts.value.length / pageSize))
const pagedPosts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredPosts.value.slice(start, start + pageSize)
})

function goToPage(p: number) {
  currentPage.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(activeTab, () => {
  currentPage.value = 1
})

const hotPosts = computed(() => {
  return [...posts.value]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5)
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
  return `${year}.${month}.${day}`
}

function readMinutes(post: ArchivePost) {
  const base = post.summary?.length || post.title.length
  return Math.max(3, Math.ceil(base / 18))
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
  color: #303137;
}

.archive-shell {
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
  padding: 56px 0 88px;
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
  background: white;
}

.archive-main {
  min-width: 0;
  padding-right: 8px;
}

.archive-heading {
  margin-bottom: 52px;
}

.archive-heading h1 {
  margin: 0;
  color: #24313d;
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: clamp(42px, 7vw, 56px);
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.1;
}

.archive-heading p {
  margin: 16px 0 0;
  color: #697583;
  font-size: 17px;
  line-height: 1.75;
}

.archive-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0 34px;
  margin-bottom: 54px;
  border-bottom: 1px solid #dbe2ea;
  padding-bottom: 0;
}

.archive-tabs button {
  position: relative;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  padding: 0 0 18px;
  color: #9aa4ae;
  font: inherit;
  font-size: 15px;
  font-weight: 750;
  cursor: pointer;
  transition: color 160ms ease;
}

.archive-tabs button::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
  border-radius: 999px;
  background: transparent;
  content: "";
}

.archive-tabs button:hover,
.archive-tabs button.is-active {
  color: #24313d;
}

.archive-tabs button.is-active::after {
  background: #24313d;
}

.archive-list {
  display: grid;
  gap: 0;
}

.archive-item {
  display: grid;
  position: relative;
  grid-template-columns: 128px minmax(0, 1fr);
  gap: 36px;
  align-items: start;
  padding: 30px 30px 34px;
  border: 1px solid transparent;
  border-radius: 28px;
  transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
}

.archive-item::after {
  position: absolute;
  right: 30px;
  bottom: -1px;
  left: 158px;
  height: 1px;
  background: rgba(219, 226, 234, 0.75);
  content: "";
  pointer-events: none;
}

.archive-item:last-child::after {
  display: none;
}

.archive-item:hover {
  border-color: rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 22px 44px rgba(38, 50, 56, 0.06);
  transform: translateY(-3px);
}

.archive-item:hover::after {
  opacity: 0;
}

.archive-date-col {
  display: grid;
  gap: 16px;
  align-content: start;
  min-width: 0;
}

.archive-date-col time {
  padding-top: 7px;
  color: #9aa4ae;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  font-weight: 750;
  letter-spacing: 0.04em;
  transition: color 180ms ease;
}

.archive-item:hover .archive-date-col time {
  color: #738392;
}

.archive-thumb {
  display: grid;
  width: 128px;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #343941;
  color: rgba(255, 255, 255, 0.72);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0;
  box-shadow: 0 10px 24px rgba(38, 50, 56, 0.08);
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
.cover-gray { background: linear-gradient(135deg, #343941, #5d6470); }
.cover-coral { background: linear-gradient(135deg, #68312e, #a9463e); }

.archive-copy h2 {
  margin: 0;
  color: #24313d;
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.45;
  transition: color 180ms ease;
}

.archive-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin: 16px 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #697583;
  font-size: 15px;
  line-height: 1.9;
  transition: color 180ms ease;
}

.archive-item:hover .archive-copy p {
  color: #53606d;
}

.archive-meta {
  display: flex;
  position: relative;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-top: 20px;
  color: #9aa4ae;
  font-size: 12px;
  font-weight: 750;
}

.meta-left {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  min-width: 0;
  padding-right: 112px;
}

.meta-left > span:first-child {
  border-radius: 999px;
  background: rgba(244, 246, 248, 0.9);
  padding: 6px 10px;
  transition: background-color 180ms ease, color 180ms ease;
}

.archive-item:hover .meta-left > span:first-child {
  background: #eef4f0;
  color: #647e73;
}

.read-time {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.read-time svg {
  width: 14px;
  height: 14px;
}

.read-more {
  position: absolute;
  right: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #738392;
  font-size: 13px;
  font-weight: 850;
  opacity: 0;
  transform: translateX(-12px);
  transition: opacity 220ms ease, transform 220ms ease, color 160ms ease;
}

.read-more svg {
  width: 16px;
  height: 16px;
}

.archive-item:hover .read-more {
  opacity: 1;
  transform: translateX(0);
}

.read-more:hover {
  color: #24313d;
}

.pager {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  margin-top: 62px;
  border-top: 1px solid #dbe2ea;
  padding-top: 28px;
  color: #9aa4ae;
  font-size: 14px;
  font-weight: 750;
}

.pager button {
  border: 0;
  background: transparent;
  color: #5f6874;
  font: inherit;
  cursor: pointer;
  transition: color 160ms ease, transform 160ms ease;
}

.pager button:first-child {
  justify-self: start;
}

.pager button:last-child {
  justify-self: end;
}

.pager button:hover:not(:disabled) {
  color: #24313d;
  transform: translateY(-1px);
}

.pager button:disabled {
  opacity: 0.42;
  cursor: default;
}

.archive-empty {
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  padding: 44px;
  color: #7d8792;
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
  background: rgb(255 255 255 / 18%);
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
  color: #747b87;
}

.stats-card strong {
  color: #303137;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title a {
  color: #747b87;
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
  background: #eef1f8;
  color: #697280;
  font-size: 12px;
  font-weight: 900;
}

.hot-card > a:first-of-type span {
  background: #4964f4;
  color: white;
}

.hot-card strong {
  color: #40454f;
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
    padding-top: 42px;
  }

  .archive-heading {
    margin-bottom: 36px;
  }

  .archive-tabs {
    gap: 0 22px;
    margin-bottom: 34px;
  }

  .archive-item {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 22px 18px 26px;
    border-radius: 18px;
  }

  .archive-item::after {
    right: 18px;
    left: 18px;
  }

  .archive-date-col {
    grid-template-columns: auto minmax(96px, 128px);
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .archive-date-col time {
    padding-top: 0;
  }

  .archive-thumb {
    width: min(128px, 36vw);
  }

  .archive-meta {
    gap: 10px;
  }

  .meta-left {
    padding-right: 0;
  }

  .read-more {
    position: static;
    opacity: 1;
    transform: none;
  }

  .pager {
    margin-top: 42px;
  }
}
</style>
