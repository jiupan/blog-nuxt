<template>
  <div class="post-page">
    <section class="post-hero" :style="{ background: `radial-gradient(circle at 79% 22%, rgb(255 255 255 / 18%), transparent 25%), ${heroGradient}` }">
      <div class="post-hero-inner">
        <div class="post-hero-grid">
          <div class="post-hero-copy">
            <div v-if="post.category || post.tags.length" class="post-kicker">
              <NuxtLink v-if="post.category" :to="`/categories/${post.category.slug}`">{{ post.category.name }}</NuxtLink>
              <NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`"># {{ tag.name }}</NuxtLink>
            </div>
            <h1>{{ post.title }}</h1>
            <div class="post-meta">
              <span>
                <CalendarDaysIcon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ formatDate(post.publishedAt) }}
              </span>
              <span>
                <Clock3Icon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ post.rendered.readingTime }} 分钟阅读
              </span>
              <span>
                <FileTextIcon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ post.rendered.wordCount }} 字
              </span>
              <span>
                <EyeIcon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ post.viewCount }} 阅读
              </span>
            </div>
          </div>

          <div class="post-cover-card" :style="{ background: heroGradient }">
            <img v-if="post.cover" :src="post.cover" :alt="post.title" class="post-cover-img" />
            <div v-else class="cover-fallback">
              <span>{{ coverWord }}</span>
              <strong>{{ post.category?.name || '文章' }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="post-shell">
      <main class="post-main">
        <section v-if="post.summary" class="summary-card">
          <div class="summary-heading">
            <div class="summary-title" tabindex="0" aria-describedby="summary-tooltip">
              <Icon name="i-lucide-bot" class="summary-title-icon" />
              <span>文章摘要</span>
              <Icon name="i-lucide-chevron-right" class="summary-title-arrow" />
              <span id="summary-tooltip" class="summary-tooltip" role="tooltip">通过AI生成文章摘要</span>
            </div>
            <small>DyuGPT</small>
          </div>
          <div class="summary-body">
            <div class="summary-thumb">
              <img v-if="post.cover" :src="post.cover" :alt="post.title" class="summary-thumb-img" />
              <span v-else>{{ coverWord }}</span>
            </div>
            <p>{{ post.summary }}</p>
          </div>
          <form class="summary-chat-form" @submit.prevent>
            <input type="text" placeholder="针对这个文章有什么想问的？" aria-label="针对这篇文章提问" />
            <button type="submit">
              <span>发送</span>
              <Icon name="i-lucide-corner-down-left" />
            </button>
          </form>
        </section>

        <div class="content-card">
          <div class="prose-blog" v-html="post.rendered.html" />
        </div>

        <section v-if="continueItems.length" class="continue-card">
          <div class="continue-heading">
            <span>继续阅读</span>
            <small>{{ hasSavedRelations ? 'AI 辅助推荐' : '更多文章' }}</small>
          </div>
          <div class="continue-list">
            <NuxtLink v-for="item in continueItems" :key="item.post.slug" :to="postPath(item.post.slug)" class="continue-item">
              <span v-if="item.type" class="continue-type">{{ relationTypeLabel(item.type) }}</span>
              <strong>{{ item.post.title }}</strong>
              <p>{{ item.reason || item.post.summary || '这篇文章也许值得继续阅读。' }}</p>
            </NuxtLink>
          </div>
        </section>

        <nav v-if="post.previous || post.next" class="post-pager">
          <NuxtLink v-if="post.previous" :to="postPath(post.previous.slug)" class="post-pager-prev">
            <span>上一篇</span>
            <strong>{{ post.previous.title }}</strong>
          </NuxtLink>
          <NuxtLink v-if="post.next" :to="postPath(post.next.slug)" class="post-pager-next">
            <span>下一篇</span>
            <strong>{{ post.next.title }}</strong>
          </NuxtLink>
        </nav>
      </main>

      <PublicSidebar
        class="post-sidebar"
        :style="{ '--post-sidebar-sticky-top': postSidebarStickyTop }"
        :site-name="siteName"
        :description="siteSettings.sidebar_description"
        :categories="sidebarCategories"
        :tags="sidebarTags"
        :posts="sidebarPosts"
      >
        <template #after-author>
          <section class="toc-card toc-card-elegant">
            <div class="toc-card-inner">
              <div class="toc-card-heading">
                <span class="toc-icon" aria-hidden="true">
                  <Icon name="i-lucide-list" />
                </span>
                <h2>文章目录</h2>
              </div>

              <div v-if="post.rendered.toc.length" class="toc-list-wrap">
                <span class="toc-guide" aria-hidden="true"></span>
                <span
                  v-if="activeTocId"
                  class="toc-active-line"
                  :style="{ transform: `translateY(${activeTocOffset}px)` }"
                  aria-hidden="true"
                ></span>
                <nav class="toc-list" aria-label="文章目录">
                  <a
                    v-for="item in post.rendered.toc"
                    :key="item.id"
                    :href="`#${item.id}`"
                    :data-toc-id="item.id"
                    :class="{ 'is-child': item.level === 3, 'is-active': item.id === activeTocId }"
                    @click="activeTocId = item.id"
                  >
                    {{ item.text }}
                  </a>
                </nav>
              </div>
              <p v-else>暂无目录</p>
            </div>
          </section>
        </template>

        <template #after-tags>
          <section class="info-card">
            <h2>文章信息</h2>
            <p><span>发布于</span><strong>{{ formatDate(post.publishedAt) }}</strong></p>
            <p><span>阅读量</span><strong>{{ post.viewCount }}</strong></p>
            <p><span>分类</span><strong>{{ post.category?.name || '未分类' }}</strong></p>
          </section>
        </template>
      </PublicSidebar>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  CalendarDays as CalendarDaysIcon,
  Clock3 as Clock3Icon,
  Eye as EyeIcon,
  FileText as FileTextIcon
} from '@lucide/vue'

const route = useRoute()
const config = useRuntimeConfig()
const [{ data, error }, { data: categoryData }, { data: tagData }, { data: relatedData }] = await Promise.all([
  useFetch(`/api/posts/${route.params.slug}`),
  useFetch('/api/categories'),
  useFetch('/api/tags'),
  useFetch('/api/posts', { query: { page: 1, pageSize: 5 } })
])

if (error.value || !data.value?.data) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
}

const post = computed(() => data.value!.data)
const siteSettings = useSiteSettings()
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const layoutScrollTitle = useState<string>('layoutScrollTitle', () => '')
const postSidebarStickyTop = ref('84px')
const activeTocId = ref('')
const activeTocOffset = ref(0)
let sidebarResizeObserver: ResizeObserver | undefined
let tocObserver: IntersectionObserver | undefined
const sidebarCategories = computed(() => categoryData.value?.data || [])
const sidebarTags = computed(() => tagData.value?.data || [])
const sidebarPosts = computed(() => {
  return (relatedData.value?.data?.items || []).filter((item: any) => item.slug !== post.value.slug)
})
const savedRelations = computed(() => post.value.relations || [])
const hasSavedRelations = computed(() => savedRelations.value.length > 0)
const continueItems = computed(() => {
  if (hasSavedRelations.value) {
    return savedRelations.value
  }

  return sidebarPosts.value.slice(0, 3).map((item: any) => ({
    type: '',
    reason: '',
    post: item
  }))
})
const coverWord = computed(() => {
  return post.value.category?.name || post.value.title.slice(0, 4)
})

const heroGradients = [
  'linear-gradient(135deg, #5c2348, #8b2f6a)',
  'linear-gradient(135deg, #18345f, #1f5d91)',
  'linear-gradient(135deg, #29462c, #4e7433)',
  'linear-gradient(135deg, #5a3517, #9a5a1d)',
  'linear-gradient(135deg, #343941, #5d6470)',
  'linear-gradient(135deg, #68312e, #a9463e)'
]
const heroGradient = computed(() => heroGradients[post.value.id % heroGradients.length])

layoutScrollTitle.value = post.value.title

onBeforeUnmount(() => {
  layoutScrollTitle.value = ''
  window.removeEventListener('resize', updatePostSidebarStickyTop)
  sidebarResizeObserver?.disconnect()
  tocObserver?.disconnect()
})

onMounted(() => {
  updatePostSidebarStickyTop()
  setupTocObserver()
  window.addEventListener('resize', updatePostSidebarStickyTop)
  const sidebar = document.querySelector<HTMLElement>('.post-sidebar')

  if (sidebar && 'ResizeObserver' in window) {
    sidebarResizeObserver = new ResizeObserver(() => updatePostSidebarStickyTop())
    sidebarResizeObserver.observe(sidebar)
  }
})

watch(activeTocId, () => {
  nextTick(updateTocIndicatorPosition)
})

useSeoMeta({
  title: () => post.value.seoTitle || post.value.title,
  description: () => post.value.seoDescription || post.value.summary || '',
  ogTitle: () => post.value.title,
  ogDescription: () => post.value.summary || '',
  ogImage: () => post.value.cover || ''
})

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : ''
}

function relationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    PREREQUISITE: '前置阅读',
    EXTENSION: '延伸阅读',
    SAME_TOPIC: '同主题',
    PRACTICE: '实战补充',
    BACKGROUND: '背景知识'
  }

  return labels[type] || '推荐'
}

function updatePostSidebarStickyTop() {
  const baseTop = 84

  if (window.matchMedia('(max-width: 900px)').matches) {
    postSidebarStickyTop.value = `${baseTop}px`
    return
  }

  const sidebar = document.querySelector<HTMLElement>('.post-sidebar')
  const toc = sidebar?.querySelector<HTMLElement>('.toc-card')

  if (!sidebar || !toc) {
    postSidebarStickyTop.value = `${baseTop}px`
    return
  }

  postSidebarStickyTop.value = `${baseTop - toc.offsetTop}px`
}

function setupTocObserver() {
  const tocItems = post.value.rendered.toc || []
  if (!tocItems.length || !('IntersectionObserver' in window)) {
    activeTocId.value = tocItems[0]?.id || ''
    return
  }

  const visibleHeadingIds = new Set<string>()
  const headingMap = new Map<string, Element>()

  tocObserver?.disconnect()
  activeTocId.value = tocItems[0]?.id || ''

  for (const item of tocItems) {
    const heading = document.getElementById(item.id)
    if (!heading) continue
    headingMap.set(item.id, heading)
  }

  tocObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = entry.target.id
      if (!id) continue

      if (entry.isIntersecting) {
        visibleHeadingIds.add(id)
      } else {
        visibleHeadingIds.delete(id)
      }
    }

    const activeId = [...visibleHeadingIds].sort((a, b) => {
      const headingA = headingMap.get(a)
      const headingB = headingMap.get(b)
      if (!headingA || !headingB) return 0
      return headingA.compareDocumentPosition(headingB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })[0]

    if (activeId) {
      activeTocId.value = activeId
      return
    }

    const passedHeading = [...headingMap.entries()]
      .filter(([, heading]) => heading.getBoundingClientRect().top <= 120)
      .pop()
    activeTocId.value = passedHeading?.[0] || tocItems[0]?.id || ''
  }, {
    rootMargin: '-12% 0px -58% 0px',
    threshold: [0, 1]
  })

  for (const heading of headingMap.values()) {
    tocObserver.observe(heading)
  }

  nextTick(updateTocIndicatorPosition)
}

function updateTocIndicatorPosition() {
  if (!activeTocId.value) return

  const links = document.querySelectorAll<HTMLElement>('.toc-card-elegant .toc-list a')
  const activeLink = Array.from(links).find((link) => link.dataset.tocId === activeTocId.value)
  if (!activeLink) return

  const indicatorHeight = 20
  activeTocOffset.value = activeLink.offsetTop + (activeLink.offsetHeight - indicatorHeight) / 2
}
</script>

<style scoped>
.post-page {
  min-height: 100vh;
  background: #f3f6fc;
  color: #303137;
}

.post-hero {
  min-height: 400px;
  margin-top: -70px;
  padding: 108px 0 58px;
  color: white;
}

.post-hero-inner {
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
}

.post-kicker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  color: rgb(255 255 255 / 86%);
  font-size: 15px;
  font-weight: 500;
}

.post-kicker a:first-child {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgb(255 255 255 / 18%);
  color: white;
  font-weight: 800;
}

.post-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 72px;
  align-items: center;
}

.post-hero-copy h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(34px, 3.6vw, 52px);
  font-weight: 900;
  line-height: 1.2;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 36px;
  font-size: 15px;
  font-weight: 500;
}

.post-meta span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgb(255 255 255 / 18%);
}

.post-meta-icon {
  flex: 0 0 auto;
}

.post-cover-card {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 26px 56px rgb(91 11 65 / 22%);
}

.post-cover-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  display: grid;
  place-items: center;
  color: rgb(255 255 255 / 72%);
  text-align: center;
}

.cover-fallback span {
  font-size: 48px;
  font-weight: 900;
}

.cover-fallback strong {
  margin-top: 8px;
  color: white;
  font-size: 18px;
}

.post-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  width: min(100% - 32px, 1290px);
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;
  margin: -24px auto 72px;
  padding-top: 42px;
}

.post-shell::before {
  position: absolute;
  inset: 0 auto -72px 50%;
  z-index: -1;
  width: 100vw;
  border-radius: 24px 24px 0 0;
  background: #f3f6fc;
  content: "";
  transform: translateX(-50%);
}

.post-main {
  min-width: 0;
}

.summary-card,
.content-card,
.continue-card,
.toc-card,
.info-card,
.post-pager a {
  border: 1px solid #dfe6f2;
  border-radius: 10px;
  background: white;
}

.summary-card {
  padding: 12px 16px;
  background: #f8f9fc;
}

.summary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-heading small {
  color: #6a6f7a;
  font-size: 14px;
  font-weight: 500;
}

.summary-title {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #a14b40;
  cursor: pointer;
  font-size: 15px;
  font-weight: 900;
  outline: none;
}

.summary-title :deep(svg) {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
}

.summary-title-icon {
  width: 20px;
  height: 20px;
  font-size: 20px;
}

.summary-title-arrow {
  color: #d1aaa5;
}

.summary-title :deep(.summary-title-icon svg) {
  width: 20px;
  height: 20px;
}

.summary-tooltip {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  z-index: 4;
  width: max-content;
  max-width: 220px;
  padding: 10px 18px;
  border: 1px solid #dfe6f2;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 14px 32px rgb(15 23 42 / 10%);
  color: #30333a;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.summary-tooltip::after {
  position: absolute;
  top: 100%;
  left: 50%;
  width: 12px;
  height: 12px;
  border-right: 1px solid #dfe6f2;
  border-bottom: 1px solid #dfe6f2;
  background: #fff;
  content: "";
  transform: translate(-50%, -6px) rotate(45deg);
}

.summary-title:hover .summary-tooltip,
.summary-title:focus-visible .summary-tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.summary-body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  margin-top: 10px;
  padding: 0 8px;
}

.summary-thumb {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #e2e8f4;
  background: #f2f5fa;
  color: #a14b40;
  font-size: 16px;
  font-weight: 900;
}

.summary-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.summary-body p {
  margin: 0;
  color: #3f424a;
  font-size: 18px;
  line-height: 1.45;
}

.summary-chat-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 8px;
}

.summary-chat-form input {
  width: 100%;
  min-width: 0;
  height: 34px;
  border: 1px solid #dce5f4;
  border-radius: 999px;
  background: #fff;
  color: #30333a;
  font: inherit;
  font-size: 14px;
  outline: none;
  padding: 0 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.summary-chat-form input::placeholder {
  color: #7d838d;
}

.summary-chat-form input:focus {
  border-color: #b9c8dd;
  box-shadow: 0 0 0 3px rgb(92 118 153 / 12%);
}

.summary-chat-form button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  border: 1px solid #dce5f4;
  border-radius: 999px;
  background: #fff;
  color: #30333a;
  font: inherit;
  font-size: 14px;
  padding: 0 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.summary-chat-form button:hover,
.summary-chat-form button:focus-visible {
  border-color: #b9c8dd;
  box-shadow: 0 0 0 3px rgb(92 118 153 / 12%);
}

.summary-chat-form button:active {
  transform: translateY(1px);
}

.summary-chat-form button :deep(svg) {
  width: 15px;
  height: 15px;
}

.content-card {
  margin-top: 14px;
  padding: 40px 24px;
}

.content-card :deep(.prose-blog) {
  max-width: 89ch;
}

.post-main > .content-card:first-child {
  margin-top: 0;
}

.continue-card {
  margin-top: 14px;
  padding: 18px;
}

.continue-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.continue-heading span {
  color: #303137;
  font-size: 18px;
  font-weight: 900;
}

.continue-heading small {
  color: #858b96;
  font-size: 12px;
  font-weight: 800;
}

.continue-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.continue-item {
  display: grid;
  gap: 7px;
  border: 1px solid #e6edf7;
  border-radius: 8px;
  background: #f8fafd;
  padding: 14px;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.continue-item:hover {
  border-color: #c9d7ea;
  background: white;
  transform: translateY(-1px);
}

.continue-type {
  width: fit-content;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 850;
}

.continue-item strong {
  color: #20242c;
  font-size: 16px;
}

.continue-item p {
  margin: 0;
  color: #5f6673;
  font-size: 14px;
  line-height: 1.65;
}

.post-pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.post-pager a {
  display: block;
  padding: 18px;
}

.post-pager-prev {
  grid-column: 1;
}

.post-pager-next {
  grid-column: 2;
  text-align: right;
}

.post-pager span {
  color: #858b96;
  font-size: 12px;
  font-weight: 800;
}

.post-pager strong {
  display: block;
  margin-top: 6px;
  color: #303137;
}

.post-sidebar {
  position: sticky;
  top: var(--post-sidebar-sticky-top, 84px);
  align-self: start;
  display: grid;
  gap: 10px;
}

.author-card {
  display: grid;
  height: 154px;
  grid-template-columns: 72px minmax(0, 1fr);
  grid-template-rows: 1fr auto auto;
  column-gap: 14px;
  align-items: center;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(135deg, #c7439e, #a51f76);
  color: white;
  padding: 16px 18px;
  box-shadow: 0 18px 40px rgb(96 18 70 / 16%);
}

.author-avatar {
  display: grid;
  width: 72px;
  height: 72px;
  grid-row: 1 / 4;
  place-items: center;
  margin: 0;
  border: 4px solid rgb(255 255 255 / 72%);
  border-radius: 999px;
  background: #121318;
  box-shadow: 0 12px 26px rgb(74 10 54 / 18%);
  font-size: 32px;
  font-weight: 900;
}

.author-card h2 {
  margin: 0;
  align-self: end;
  font-size: 18px;
  font-weight: 900;
}

.author-card p {
  margin: 4px 0 12px;
  color: rgb(255 255 255 / 82%);
  font-size: 13px;
}

.author-actions {
  display: flex;
  gap: 8px;
  align-self: end;
}

.author-actions a {
  flex: 1;
  padding: 8px 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 18%);
  text-align: center;
  font-size: 13px;
  font-weight: 800;
}

.info-card {
  padding: 16px;
}

.info-card h2 {
  margin: 0 0 12px;
  color: #303137;
  font-size: 15px;
  font-weight: 900;
}

.toc-card.toc-card-elegant {
  position: relative;
  overflow: hidden;
  padding: 0;
  border-color: #eef1f5;
  border-radius: 8px;
  background: rgb(255 255 255 / 82%);
  box-shadow: 0 8px 30px rgb(15 23 42 / 5%);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.toc-card-elegant .toc-card-inner {
  padding: 22px;
}

.toc-card-elegant .toc-card-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgb(226 232 240 / 80%);
}

.toc-card-elegant .toc-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: #fdf8f6;
  color: #826561;
}

.toc-card-elegant .toc-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.toc-card-elegant .toc-card-heading h2 {
  margin: 0;
  color: #172033;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0;
}

.toc-card-elegant .toc-list-wrap {
  position: relative;
}

.toc-card-elegant .toc-guide {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 7px;
  width: 2px;
  border-radius: 999px;
  background: #edf1f6;
}

.toc-card-elegant .toc-active-line {
  position: absolute;
  top: 0;
  left: 7px;
  z-index: 2;
  width: 2px;
  height: 20px;
  border-radius: 999px;
  background: #9b7e7a;
  transition: transform .24s cubic-bezier(.4, 0, .2, 1);
}

.toc-card-elegant .toc-list {
  position: relative;
  z-index: 3;
  display: grid;
  gap: 7px;
}

.toc-card-elegant .toc-list a {
  position: relative;
  display: block;
  overflow: hidden;
  padding: 6px 12px 6px 26px;
  border-radius: 0 10px 10px 0;
  color: #667385;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  transition: background .18s ease, color .18s ease;
  white-space: nowrap;
}

.toc-card-elegant .toc-list a::before {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 8px;
  height: 8px;
  border: 2px solid #d8e0eb;
  border-radius: 999px;
  background: white;
  content: "";
  transform: translateY(-50%);
  transition: border-color .18s ease, background .18s ease;
}

.toc-card-elegant .toc-list a:hover,
.toc-card-elegant .toc-list a:focus-visible,
.toc-card-elegant .toc-list a.is-active {
  background: #f8fafc;
  color: #826561;
  outline: none;
}

.toc-card-elegant .toc-list a:hover::before,
.toc-card-elegant .toc-list a:focus-visible::before,
.toc-card-elegant .toc-list a.is-active::before {
  border-color: #9b7e7a;
  background: #9b7e7a;
}

.toc-card-elegant .toc-list a.is-active {
  font-weight: 900;
}

.toc-card-elegant .toc-list a.is-child {
  margin-left: 16px;
  padding-left: 24px;
  color: #7b8797;
  font-size: 12.5px;
  font-weight: 600;
}

.toc-card-elegant .toc-list a.is-child.is-active {
  color: #826561;
  font-weight: 800;
}

.toc-card-elegant p {
  margin: 0;
  color: #747b87;
  font-size: 13px;
  font-weight: 700;
}

.info-card p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0 0;
  color: #747b87;
  font-size: 13px;
}

.info-card strong {
  color: #303137;
}

.return-card {
  display: block;
  padding: 14px 16px;
  border-radius: 10px;
  background: #b32683;
  color: white;
  text-align: center;
  font-weight: 900;
}

@media (max-width: 900px) {
  .post-hero-grid {
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 36px;
  }

  .post-shell {
    grid-template-columns: 1fr;
  }

  .summary-body {
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .post-cover-card {
    max-width: 320px;
  }

  .post-sidebar {
    position: static;
  }

  .author-card {
    height: auto;
    min-height: 154px;
  }
}

@media (max-width: 640px) {
  .post-hero {
    margin-top: -70px;
    min-height: 0;
    padding: 92px 0 48px;
  }

  .post-hero-inner {
    width: min(100% - 28px, 560px);
  }

  .post-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    text-align: center;
  }

  .post-hero-copy {
    display: contents;
  }

  .post-cover-card {
    order: 1;
    width: min(46vw, 190px);
    max-width: none;
    aspect-ratio: 1;
    justify-self: center;
    border-radius: 28px;
    box-shadow:
      inset 0 0 0 10px rgb(255 255 255 / 12%),
      0 28px 60px rgb(24 25 33 / 18%);
  }

  .post-cover-card img {
    border: 10px solid rgb(255 255 255 / 18%);
    border-radius: inherit;
  }

  .cover-fallback {
    width: 100%;
    height: 100%;
    border: 10px solid rgb(255 255 255 / 18%);
    border-radius: inherit;
    background: rgb(255 255 255 / 18%);
  }

  .cover-fallback span {
    max-width: 82%;
    font-size: clamp(28px, 9vw, 42px);
    line-height: 1.08;
  }

  .cover-fallback strong {
    font-size: 14px;
  }

  .post-kicker {
    order: 2;
    justify-content: center;
    gap: 10px;
    margin: 4px auto 0;
    font-size: 14px;
  }

  .post-kicker a {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 13px;
    border-radius: 999px;
    background: rgb(255 255 255 / 16%);
    color: white;
  }

  .post-kicker a:first-child {
    padding: 0 13px;
  }

  .post-hero-copy h1 {
    order: 3;
    max-width: 12em;
    justify-self: center;
    font-size: clamp(24px, 7.4vw, 34px);
    line-height: 1.22;
    text-wrap: balance;
  }

  .post-meta {
    order: 4;
    justify-content: center;
    gap: 10px;
    margin-top: 0;
    font-size: 13px;
  }

  .post-meta span {
    min-height: 36px;
    padding: 0 13px;
    background: rgb(255 255 255 / 18%);
    color: rgb(255 255 255 / 94%);
    white-space: nowrap;
  }

  .post-shell {
    width: min(100% - 20px, 560px);
    margin-top: -18px;
    padding-top: 30px;
  }

  .post-shell::before {
    border-radius: 22px 22px 0 0;
  }

  .post-sidebar {
    gap: 0;
  }

  .post-sidebar :deep(.sidebar-search),
  .post-sidebar :deep(.toc-card),
  .post-sidebar :deep(.sidebar-section),
  .post-sidebar :deep(.info-card) {
    display: none;
  }

  .summary-body,
  .summary-chat-form,
  .post-pager {
    grid-template-columns: 1fr;
  }

  .summary-card {
    padding: 12px;
  }

  .summary-heading small {
    font-size: 13px;
  }

  .summary-title {
    gap: 5px;
    font-size: 14px;
  }

  .summary-title :deep(svg) {
    width: 17px;
    height: 17px;
  }

  .summary-title-icon,
  .summary-title :deep(.summary-title-icon svg) {
    width: 19px;
    height: 19px;
    font-size: 19px;
  }

  .summary-body {
    gap: 12px;
    align-items: start;
    padding: 0;
  }

  .summary-thumb {
    display: none;
  }

  .summary-body p {
    font-size: 16px;
  }

  .summary-chat-form {
    gap: 8px;
  }

  .summary-chat-form input,
  .summary-chat-form button {
    height: 34px;
    font-size: 13px;
  }

  .post-pager-prev,
  .post-pager-next {
    grid-column: auto;
    text-align: left;
  }

  .content-card {
    padding: 22px 14px;
  }
}
</style>
