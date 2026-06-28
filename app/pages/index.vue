<template>
  <div class="home-page">
    <section class="home-shell pt-2">
      <div class="hero-board" :class="{ 'has-no-posts': !latest }">
        <NuxtLink :to="activeHeroPost ? postPath(activeHeroPost.slug) : (latest ? postPath(latest.slug) : '/posts')" class="hero-main">
          <img src="/images/home-hero-ai.png" alt="" class="hero-image">
          <div class="hero-copy">
            <h1>{{ activeHeroPost?.title || latest?.title || siteName }}</h1>
            <p>{{ activeHeroPost ? '最新发布' : (latest ? '最新发布' : '暂无已发布文章') }}</p>
          </div>
        </NuxtLink>

        <div v-if="heroPosts.length" class="hero-list" @mouseleave="resetHeroPost">
          <NuxtLink
            v-for="item in heroPosts"
            :key="item.id"
            :to="item.to"
            class="hero-link"
            :class="{ 'is-active': item.id === activeHeroPost?.id }"
            @mouseenter.prevent="activeHeroPost = item"
          >
            <span class="hero-link-icon">
              <Icon :name="item.icon" aria-hidden="true" />
            </span>
            <span>{{ item.title }}</span>
          </NuxtLink>
        </div>
      </div>

      <nav v-if="topicTabs.length" class="topic-tabs" aria-label="文章分类">
        <NuxtLink
          v-for="tab in topicTabs"
          :key="tab.label"
          :to="tab.to"
          class="topic-tab"
          :class="{ 'is-active': tab.active }"
        >
          <Icon v-if="tab.icon" :name="tab.icon" aria-hidden="true" />
          {{ tab.label }}
        </NuxtLink>
      </nav>

      <div class="content-layout">
        <main>
          <div v-if="displayPosts.length" class="post-grid">
            <article v-for="(post, index) in displayPosts" :key="post.key" class="post-card">
              <NuxtLink :to="post.to" class="post-cover" :class="!post.cover && post.coverClass">
                <img v-if="post.cover" :src="post.cover" :alt="post.title" class="cover-image" />
                <span v-if="post.cover" class="cover-overlay"></span>
                <span class="cover-word">{{ post.coverWord }}</span>
                <span class="cover-icon">
                  <Icon :name="post.icon" aria-hidden="true" />
                </span>
              </NuxtLink>
              <div class="post-body">
                <div class="post-meta">
                  <span>{{ post.category }}</span>
                  <span v-if="index < 2">最新</span>
                </div>
                <NuxtLink :to="post.to" class="post-title">{{ post.title }}</NuxtLink>
                <div class="post-tags">
                  <span v-for="tag in post.tags" :key="tag"># {{ tag }}</span>
                  <time>{{ post.date }}</time>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="empty-card">
            <h2>暂无文章</h2>
            <p>后台发布文章后，这里会自动显示最新内容。</p>
          </div>

          <div v-if="totalPages > 1" class="pager">
            <button class="page-dot" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">‹</button>
            <button
              v-for="p in totalPages"
              :key="p"
              class="page-dot"
              :class="{ 'is-active': p === currentPage }"
              @click="goToPage(p)"
            >{{ p }}</button>
            <button class="page-dot" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">›</button>
          </div>
        </main>

        <aside class="sidebar">
          <section class="profile-card">
            <div class="profile-avatar">
              <Icon name="i-simple-icons-nuxtdotjs" aria-hidden="true" />
            </div>
            <div class="profile-bottom">
              <NuxtLink to="/about" class="profile-info">
                <div class="profile-name">{{ siteName }}</div>
                <div class="profile-desc">{{ siteSettings.site_subtitle }}</div>
              </NuxtLink>
              <div class="profile-socials">
                <a href="https://github.com" target="_blank" rel="noopener" title="GitHub" class="social-icon">
                  <Icon name="i-simple-icons-github" aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>

          <NuxtLink to="/posts" class="wechat-card">
            <strong>文章</strong>
            <span>查看全部已发布内容 ▶</span>
          </NuxtLink>

          <NuxtLink to="/admin" class="tool-card">
            <span>进入</span>
            <strong>后台管理</strong>
          </NuxtLink>

          <section v-if="cloudTags.length" class="tag-cloud">
            <h3>热门标签</h3>
            <div>
              <NuxtLink v-for="tag in cloudTags" :key="tag.name" :to="`/tags/${tag.slug}`">{{ tag.name }}</NuxtLink>
            </div>
            <NuxtLink class="all-tags" to="/posts">查看全部文章</NuxtLink>
          </section>

          <section class="site-stats">
            <p><span>文章总数：</span><strong>{{ totalPosts }}</strong></p>
            <p><span>分类总数：</span><strong>{{ categories.length }}</strong></p>
            <p><span>标签总数：</span><strong>{{ tags.length }}</strong></p>
          </section>
        </aside>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
type CategoryLite = {
  name: string
  slug: string
}

type TagLite = {
  name: string
  slug: string
}

type TaxonomyItem = {
  id: number
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

type HomePost = {
  id: number
  title: string
  slug: string
  summary?: string | null
  cover?: string | null
  publishedAt?: string | Date | null
  category?: CategoryLite | null
  tags?: TagLite[]
}

type PostsPayload = {
  items: HomePost[]
  total: number
  pageSize: number
}

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName)
const pageSize = 8
const currentPage = ref(1)
const [{ data }, { data: categoryData }, { data: tagData }] = await Promise.all([
  useFetch<{ data: PostsPayload }>('/api/posts', { query: computed(() => ({ page: currentPage.value, pageSize })) }),
  useFetch<{ data: TaxonomyItem[] }>('/api/categories'),
  useFetch<{ data: TaxonomyItem[] }>('/api/tags')
])

const posts = computed(() => data.value?.data.items || [])
const totalPosts = computed(() => data.value?.data.total || posts.value.length)
const totalPages = computed(() => Math.ceil(totalPosts.value / pageSize))
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const latest = computed(() => posts.value[0])
function goToPage(p: number) {
  currentPage.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const coverStyles = [
  { coverClass: 'cover-pink', icon: 'i-lucide-sparkles' },
  { coverClass: 'cover-blue', icon: 'i-lucide-brain-circuit' },
  { coverClass: 'cover-green', icon: 'i-lucide-leaf' },
  { coverClass: 'cover-orange', icon: 'i-lucide-smile-plus' },
  { coverClass: 'cover-gray', icon: 'i-lucide-badge-check' },
  { coverClass: 'cover-coral', icon: 'i-lucide-flame' }
]

const displayPosts = computed(() => {
  return posts.value.map((post, index) => {
    const style = coverStyles[post.id % coverStyles.length]!
    const category = post.category?.name || '未分类'
    const postTags = post.tags?.slice(0, 3).map((tag) => tag.name) || []

    return {
      key: `post-${post.id}`,
      to: postPath(post.slug),
      title: post.title,
      category,
      tags: postTags,
      date: formatDate(post.publishedAt),
      cover: post.cover || '',
      coverWord: category === '未分类' ? post.title.slice(0, 4) : category,
      ...style
    }
  })
})

const heroIconLabels = ['i-lucide-command', 'i-lucide-mail', 'i-lucide-bot', 'i-lucide-newspaper', 'i-lucide-history', 'i-lucide-zap']

const heroPosts = computed(() => {
  return posts.value.slice(1, 6).map((post, index) => {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      to: postPath(post.slug),
      icon: heroIconLabels[index] || 'i-lucide-file-text'
    }
  })
})

const activeHeroPost = ref<HomePost | null>(null)

function resetHeroPost() {
  activeHeroPost.value = null
}

const topicTabs = computed(() => [
  { label: '全部文章', icon: 'i-lucide-layout-list', to: '/posts', active: true },
  ...categories.value.map((category) => ({
    label: category.name,
    icon: 'i-lucide-folder',
    to: `/categories/${category.slug}`,
    active: false
  }))
])

const cloudTags = computed(() => tags.value.slice(0, 12))

useSeoMeta({
  title: siteName,
  description: '一个基于 Nuxt 4 的全栈动态博客'
})

function formatDate(value?: string | Date | null) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  })
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #f3f6fc;
  color: #32333a;
}

.home-shell {
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
}

.hero-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 386px;
  min-height: 324px;
  overflow: hidden;
  border-radius: 8px;
  background: #1199ee;
  box-shadow: 0 16px 44px rgb(47 105 190 / 12%);
}

.hero-board.has-no-posts {
  grid-template-columns: 1fr;
}

.hero-main {
  position: relative;
  isolation: isolate;
  min-height: 324px;
  overflow: hidden;
}

.hero-image {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-main::after {
  position: absolute;
  inset: auto 0 0;
  z-index: -1;
  height: 58%;
  content: "";
  background: linear-gradient(0deg, rgb(0 126 224 / 80%), transparent);
}

.hero-copy {
  position: absolute;
  left: 32px;
  bottom: 28px;
  max-width: 620px;
  color: white;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(28px, 3vw, 38px);
  font-weight: 800;
  line-height: 1.18;
}

.hero-copy p {
  margin: 10px 0 0;
  font-size: 13px;
  font-weight: 700;
  opacity: .9;
}

.hero-list {
  display: grid;
  background: linear-gradient(180deg, #0b77bf, #218fde);
}

.hero-link {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 0 18px;
  color: rgb(255 255 255 / 82%);
  font-size: 16px;
  font-weight: 700;
}

.hero-link.is-active {
  background: #109bf2;
  color: white;
}

.hero-link-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 9px;
  background: rgb(255 255 255 / 20%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 16%);
  font-size: 12px;
}

.hero-link-icon :deep(svg),
.hero-link-icon :deep(span) {
  width: 18px;
  height: 18px;
}

.topic-tabs {
  display: flex;
  gap: 10px;
  margin: 12px 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.topic-tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 18px;
  border: 1px solid #e1e7f2;
  border-radius: 999px;
  background: white;
  color: #3a3b44;
  font-size: 14px;
  font-weight: 800;
}

.topic-tab :deep(svg),
.topic-tab :deep(span) {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
}

.topic-tab.is-active {
  border-color: #4964f4;
  background: #4964f4;
  color: white;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 288px;
  gap: 12px;
  align-items: start;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.post-card {
  overflow: hidden;
  border: 1px solid #e4e9f3;
  border-radius: 8px;
  background: white;
  box-shadow: 0 14px 34px rgb(42 59 91 / 7%);
}

.post-cover {
  position: relative;
  display: grid;
  min-height: 202px;
  place-items: center;
  overflow: hidden;
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgb(0 0 0 / 45%), rgb(0 0 0 / 15%));
}

.cover-word {
  position: relative;
  z-index: 2;
  color: rgb(255 255 255 / 42%);
  font-size: clamp(48px, 5vw, 74px);
  font-weight: 900;
  line-height: 1;
}

.cover-icon {
  position: absolute;
  z-index: 2;
  display: grid;
  width: 104px;
  height: 104px;
  place-items: center;
  border: 8px solid rgb(255 255 255 / 72%);
  border-radius: 28px;
  background: rgb(255 255 255 / 75%);
  box-shadow: 0 18px 34px rgb(0 0 0 / 18%);
  color: #17181d;
  font-size: 58px;
  font-weight: 900;
}

.cover-icon :deep(svg),
.cover-icon :deep(span) {
  width: 54px;
  height: 54px;
}

.cover-pink { background: linear-gradient(135deg, #e06abc, #d73d9f); }
.cover-blue { background: linear-gradient(135deg, #80cfff, #35aaf6); }
.cover-green { background: linear-gradient(135deg, #a7d64a, #7dbf31); }
.cover-orange { background: linear-gradient(135deg, #ffe27b, #ff9c25); }
.cover-gray { background: linear-gradient(135deg, #d5d5d5, #bfc1c4); }
.cover-coral { background: linear-gradient(135deg, #ffb5ad, #ff827a); }

.post-body {
  padding: 20px 30px 22px;
}

.post-meta {
  display: flex;
  gap: 12px;
  color: #8a909d;
  font-size: 12px;
  font-weight: 700;
}

.post-title {
  display: block;
  min-height: 62px;
  margin-top: 10px;
  color: #33343b;
  font-size: 20px;
  font-weight: 900;
  line-height: 1.45;
}

.post-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  color: #777d89;
  font-size: 14px;
}

.post-tags time {
  margin-left: auto;
}

.sidebar {
  display: grid;
  gap: 10px;
  position: sticky;
  top: 82px;
  z-index: 5;
}

.profile-card,
.tag-cloud,
.site-stats {
  border: 1px solid #e4e9f3;
  border-radius: 8px;
  background: white;
  box-shadow: 0 14px 34px rgb(42 59 91 / 7%);
}

.profile-card {
  overflow: hidden;
  padding: 24px 22px 20px;
  background: linear-gradient(160deg, #5d6bf8, #4158f2);
  color: white;
}

.profile-avatar {
  display: grid;
  width: 98px;
  height: 98px;
  margin: 0 auto 28px;
  place-items: center;
  border: 7px solid white;
  border-radius: 999px;
  background: #f34d43;
  box-shadow: 0 16px 28px rgb(0 0 0 / 18%);
  font-size: 58px;
  font-weight: 900;
}

.profile-avatar :deep(svg),
.profile-avatar :deep(span) {
  width: 50px;
  height: 50px;
}

.profile-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.profile-name {
  font-size: 18px;
  font-weight: 900;
}

.profile-desc {
  font-size: 13px;
  font-weight: 700;
  opacity: 0.78;
}

.profile-socials {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.social-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  background: rgb(255 255 255 / 16%);
  color: white;
  font-size: 18px;
  transition: background 0.2s ease;
}

.social-icon:hover {
  background: rgb(255 255 255 / 28%);
}

.social-icon :deep(svg),
.social-icon :deep(span) {
  width: 18px;
  height: 18px;
}

.wechat-card,
.tool-card {
  display: grid;
  min-height: 96px;
  align-content: center;
  border-radius: 8px;
  padding: 18px 24px;
  color: white;
}

.wechat-card {
  background: linear-gradient(135deg, #99d451, #70bd39);
}

.tool-card {
  background: linear-gradient(135deg, #ef5e4d, #d94734);
}

.wechat-card strong,
.tool-card strong {
  font-size: 26px;
  font-weight: 900;
}

.wechat-card span,
.tool-card span {
  font-size: 13px;
  font-weight: 800;
}

.tag-cloud {
  padding: 22px;
}

.tag-cloud h3 {
  margin: 0 0 14px;
  font-size: 18px;
}

.tag-cloud div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.tag-cloud a {
  color: #8e949f;
  font-weight: 700;
}

.tag-cloud .all-tags {
  display: block;
  margin-top: 22px;
  padding: 11px 16px;
  border: 1px solid #e4e9f3;
  border-radius: 999px;
  text-align: center;
  color: #555b66;
}

.site-stats {
  padding: 20px 22px;
}

.site-stats p {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  color: #444b55;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 16px 0 0;
}

.page-dot,
.page-next {
  display: grid;
  place-items: center;
  border: 1px solid #e1e7f2;
  border-radius: 999px;
  background: white;
  box-shadow: 0 6px 18px rgb(40 58 90 / 7%);
  font-weight: 800;
}

.page-dot {
  width: 38px;
  height: 38px;
  color: #3a3b44;
  cursor: pointer;
}

.page-dot:disabled {
  opacity: 0.4;
  cursor: default;
}

.page-dot.is-active {
  background: #4964f4;
  color: white;
}

.page-next {
  min-width: 76px;
  height: 38px;
  padding: 0 24px;
  font-size: 24px;
}

.pager .page-next {
  width: auto;
  font-size: 14px;
}

.empty-card {
  border: 1px solid #e4e9f3;
  border-radius: 8px;
  background: white;
  padding: 48px 32px;
  box-shadow: 0 14px 34px rgb(42 59 91 / 7%);
}

.empty-card h2 {
  margin: 0;
  color: #33343b;
  font-size: 24px;
  font-weight: 900;
}

.empty-card p {
  margin: 12px 0 0;
  color: #777d89;
}

@media (max-width: 1100px) {
  .hero-board,
  .content-layout {
    grid-template-columns: 1fr;
  }

  .hero-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .home-shell {
    width: min(100% - 20px, 1290px);
  }

  .hero-board {
    min-height: auto;
  }

  .hero-main {
    min-height: 260px;
  }

  .hero-list,
  .post-grid,
  .sidebar {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }

  .hero-copy {
    left: 20px;
    right: 20px;
    bottom: 22px;
  }

  .post-cover {
    min-height: 170px;
  }

  .post-body {
    padding: 18px;
  }

  .post-title {
    min-height: auto;
    font-size: 18px;
  }

  .post-tags {
    flex-wrap: wrap;
  }

  .post-tags time {
    margin-left: 0;
  }
}
</style>
