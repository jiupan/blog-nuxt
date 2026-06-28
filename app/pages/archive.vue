<template>
  <div class="archive-page">
    <section class="archive-shell">
      <nav class="archive-tabs" aria-label="文章筛选">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          :class="{ 'is-active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <Icon :name="tab.icon" aria-hidden="true" />
          {{ tab.label }}
        </button>
      </nav>

      <div class="archive-layout">
        <main class="archive-main">
          <nav class="year-tabs" aria-label="年份筛选">
            <button
              v-for="year in yearTabs"
              :key="year.key"
              type="button"
              :class="{ 'is-active': activeYear === year.key }"
              @click="activeYear = year.key"
            >
              {{ year.label }}
            </button>
          </nav>

          <div class="archive-list">
            <NuxtLink v-for="post in filteredPosts" :key="post.id" :to="postPath(post.slug)" class="archive-item">
              <div class="archive-cover" :class="coverClass(post.id)">
                <span>{{ coverWord(post) }}</span>
              </div>
              <div class="archive-copy">
                <h2>{{ post.title }}</h2>
                <p>
                  <span>{{ post.category?.name || '未分类' }}</span>
                  <span>/</span>
                  <time>{{ formatDate(post.publishedAt) }}</time>
                </p>
              </div>
              <span class="archive-arrow" aria-hidden="true"></span>
            </NuxtLink>
          </div>

          <div v-if="!filteredPosts.length" class="archive-empty">
            暂无归档文章
          </div>
        </main>

        <aside class="archive-sidebar">
          <section class="archive-author">
            <div class="author-avatar">{{ siteInitial }}</div>
            <h2>{{ siteName }}</h2>
            <p>个人博客</p>
            <div>
              <NuxtLink to="/about">关于</NuxtLink>
              <NuxtLink to="/admin">后台</NuxtLink>
            </div>
          </section>

          <section class="stats-card">
            <h2>站点统计</h2>
            <p><span>文章总数</span><strong>{{ posts.length }}</strong></p>
            <p><span>分类总数</span><strong>{{ categories.length }}</strong></p>
            <p><span>标签总数</span><strong>{{ tags.length }}</strong></p>
          </section>

          <section class="hot-card">
            <div class="card-title">
              <h2>今日热门</h2>
              <NuxtLink to="/posts">更多</NuxtLink>
            </div>
            <NuxtLink v-for="(post, index) in hotPosts" :key="post.id" :to="postPath(post.slug)">
              <span>{{ index + 1 }}</span>
              <strong>{{ post.title }}</strong>
            </NuxtLink>
          </section>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
type ArchivePost = {
  id: number
  title: string
  slug: string
  publishedAt?: string | Date | null
  viewCount?: number
  category?: {
    name: string
    slug: string
  } | null
}

const config = useRuntimeConfig()
const activeTab = ref('all')
const activeYear = ref('all')

const [{ data }, { data: categoryData }, { data: tagData }] = await Promise.all([
  useFetch<{ data: { items: ArchivePost[] } }>('/api/posts', { query: { pageSize: 100 } }),
  useFetch('/api/categories'),
  useFetch('/api/tags')
])

const siteName = computed(() => config.public.siteName || 'Jiupan Blog')
const siteInitial = computed(() => siteName.value.slice(0, 1).toUpperCase())
const posts = computed(() => data.value?.data.items || [])
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

const tabs = computed(() => [
  { key: 'all', label: '全部文章', icon: 'i-lucide-library' },
  { key: 'featured', label: '精选', icon: 'i-lucide-archive' },
  { key: 'hot', label: '热门', icon: 'i-lucide-search' },
  ...categories.value.slice(0, 6).map((category: any) => ({
    key: `category:${category.slug}`,
    label: category.name,
    icon: 'i-lucide-folder'
  }))
])

const years = computed(() => {
  const list = posts.value
    .map((post) => post.publishedAt ? new Date(post.publishedAt).getFullYear() : null)
    .filter((year): year is number => typeof year === 'number')
  return [...new Set(list)].sort((a, b) => b - a)
})

const yearTabs = computed(() => [
  { key: 'all', label: '全部' },
  ...years.value.map((year) => ({ key: String(year), label: String(year) }))
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
  if (activeYear.value === 'all') {
    return tabFilteredPosts.value
  }

  return tabFilteredPosts.value.filter((post) => {
    if (!post.publishedAt) {
      return false
    }
    return String(new Date(post.publishedAt).getFullYear()) === activeYear.value
  })
})

const hotPosts = computed(() => {
  return [...posts.value]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5)
})

const coverClasses = ['cover-pink', 'cover-blue', 'cover-green', 'cover-yellow', 'cover-purple', 'cover-slate']

useSeoMeta({
  title: '归档',
  description: '博客文章归档'
})

function coverClass(id: number) {
  return coverClasses[id % coverClasses.length]
}

function coverWord(post: ArchivePost) {
  return post.category?.name || post.title.slice(0, 4)
}

function formatDate(value?: string | Date | null) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.archive-page {
  min-height: 100vh;
  background: #f3f6fc;
  color: #303137;
}

.archive-shell {
  width: min(100% - 32px, 1120px);
  margin: 0 auto;
  padding: 22px 0 72px;
}

.archive-tabs {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.archive-tabs button,
.year-tabs button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border: 1px solid #dfe6f3;
  border-radius: 999px;
  background: white;
  color: #303743;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.archive-tabs button.is-active,
.year-tabs button.is-active {
  border-color: #4964f4;
  background: #4964f4;
  color: white;
}

.archive-tabs button :deep(svg),
.archive-tabs button :deep(span) {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

.archive-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 10px;
  align-items: start;
  margin-top: 8px;
}

.archive-main,
.archive-author,
.stats-card,
.hot-card {
  border: 1px solid #dfe6f3;
  border-radius: 8px;
  background: white;
}

.year-tabs {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 14px 18px;
  border-bottom: 1px solid #e4eaf4;
}

.year-tabs button {
  height: 26px;
  padding: 0 18px;
  border: 0;
  background: #f2f4f8;
  font-size: 12px;
}

.archive-list {
  display: grid;
}

.archive-item {
  display: grid;
  grid-template-columns: 128px minmax(0, 1fr) 20px;
  gap: 22px;
  align-items: center;
  min-height: 104px;
  padding: 16px 20px;
  border-bottom: 1px solid #e4eaf4;
}

.archive-item:last-child {
  border-bottom: 0;
}

.archive-cover {
  display: grid;
  width: 128px;
  height: 68px;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  color: rgb(255 255 255 / 70%);
  font-size: 24px;
  font-weight: 900;
}

.cover-pink { background: linear-gradient(135deg, #f879c8, #d957ad); }
.cover-blue { background: linear-gradient(135deg, #7fcbff, #4aaef3); }
.cover-green { background: linear-gradient(135deg, #a9d94a, #7ec63a); }
.cover-yellow { background: linear-gradient(135deg, #ffe078, #ffb841); }
.cover-purple { background: linear-gradient(135deg, #d184ff, #a65cf0); }
.cover-slate { background: linear-gradient(135deg, #516a79, #263d4d); }

.archive-copy h2 {
  margin: 0;
  color: #34373f;
  font-size: 17px;
  font-weight: 900;
  line-height: 1.45;
}

.archive-copy p {
  display: flex;
  gap: 8px;
  margin: 10px 0 0;
  color: #737b87;
  font-size: 13px;
  font-weight: 700;
}

.archive-arrow {
  width: 9px;
  height: 9px;
  border-top: 2px solid #5f6670;
  border-right: 2px solid #5f6670;
  transform: rotate(45deg);
}

.archive-empty {
  padding: 40px;
  color: #7d8490;
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
    width: min(100% - 20px, 1120px);
  }

  .archive-item {
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 14px;
    padding: 14px;
  }

  .archive-cover {
    width: 96px;
    height: 58px;
    font-size: 18px;
  }

  .archive-arrow {
    display: none;
  }
}
</style>
