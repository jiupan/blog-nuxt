<template>
  <div class="home-page">
    <section class="home-shell pt-2">
      <div v-if="mobileHeroPosts.length" class="mobile-hero-carousel" aria-label="精选文章">
        <NuxtLink
          v-for="item in mobileHeroPosts"
          :key="`mobile-hero-${item.id}`"
          :to="item.to"
          class="mobile-hero-slide"
        >
          <img :src="item.cover || '/images/home-hero-ai.png'" :alt="item.title" class="mobile-hero-image">
          <span class="mobile-hero-shade" aria-hidden="true"></span>
          <span class="mobile-hero-title">{{ item.title }}</span>
        </NuxtLink>
      </div>

      <div class="hero-board" :class="{ 'has-no-posts': !latest }" :style="heroBoardStyle">
        <NuxtLink :to="activeHeroPost ? postPath(activeHeroPost.slug) : (latest ? postPath(latest.slug) : '/posts')" class="hero-main">
          <Transition name="hero-fade">
            <img :key="heroImage" :src="heroImage" :alt="heroImageAlt" class="hero-image">
          </Transition>
          <div class="hero-copy">
            <h1>{{ activeHeroPost?.title || latest?.title || siteName }}</h1>
            <p>{{ activeHeroPost ? '最新发布' : (latest ? '最新发布' : '暂无已发布文章') }}</p>
          </div>
        </NuxtLink>

        <div v-if="heroPosts.length" class="hero-list">
          <NuxtLink
            v-for="item in heroPosts"
            :key="item.id"
            :to="item.to"
            class="hero-link"
            :class="{ 'is-active': item.id === (activeHeroPost?.id || heroPosts[0]?.id) }"
            @mouseenter.prevent="activeHeroPost = item"
          >
            <span class="hero-link-icon">
              <component :is="homeIcon(item.icon, FileTextIcon)" aria-hidden="true" />
            </span>
            <span>{{ item.title }}</span>
          </NuxtLink>
        </div>
      </div>

      <nav v-if="topicTabs.length" class="topic-tabs" aria-label="文章分类">
        <button
          v-for="tab in topicTabs"
          :key="tab.label"
          type="button"
          class="topic-tab"
          :class="{ 'is-active': tab.active }"
          :aria-label="tab.label"
          @mouseenter="showTopicTooltip($event, tab.tooltip)"
          @mouseleave="hideTopicTooltip"
          @focus="showTopicTooltip($event, tab.tooltip)"
          @blur="hideTopicTooltip"
          @click="selectCategory(tab.slug)"
        >
          <component :is="homeIcon(tab.icon, FolderIcon)" aria-hidden="true" />
          {{ tab.label }}
        </button>
      </nav>
      <div
        v-if="topicTooltip.visible"
        class="topic-tooltip"
        :style="{ left: `${topicTooltip.x}px`, top: `${topicTooltip.y}px` }"
        role="tooltip"
      >
        {{ topicTooltip.label }}
      </div>

      <div class="content-layout">
        <main>
          <div v-if="displayPosts.length" class="post-grid">
            <article v-for="(post, index) in displayPosts" :key="post.key" class="post-card">
              <NuxtLink :to="post.to" class="post-cover" :class="!post.cover && post.coverClass">
                <img v-if="post.cover" :src="post.cover" :alt="post.title" class="cover-image" />
                <span v-if="post.cover" class="cover-overlay"></span>
                <span class="cover-word">{{ post.coverWord }}</span>
                <span class="cover-icon">
                  <component :is="homeIcon(post.icon, FileTextIcon)" aria-hidden="true" />
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
            <button class="page-dot" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              <ChevronLeftIcon aria-hidden="true" />
            </button>
            <button
              v-for="p in totalPages"
              :key="p"
              class="page-dot"
              :class="{ 'is-active': p === currentPage }"
              @click="goToPage(p)"
            >{{ p }}</button>
            <button class="page-dot" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
              <ChevronRightIcon aria-hidden="true" />
            </button>
          </div>
        </main>

        <PublicSidebar
          class="sidebar"
          :site-name="siteName"
          :description="siteSettings.sidebar_description"
          :categories="categories"
          :tags="cloudTags"
          :posts="heroAll"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  Archive as ArchiveIcon,
  BadgeCheck as BadgeCheckIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  BookOpen as BookOpenIcon,
  Bot as BotIcon,
  BrainCircuit as BrainCircuitIcon,
  Camera as CameraIcon,
  Code2 as Code2Icon,
  Coffee as CoffeeIcon,
  Command as CommandIcon,
  Cpu as CpuIcon,
  Database as DatabaseIcon,
  FileText as FileTextIcon,
  Flame as FlameIcon,
  Folder as FolderIcon,
  Gamepad2 as Gamepad2Icon,
  Globe2 as Globe2Icon,
  Heart as HeartIcon,
  History as HistoryIcon,
  House as HouseIcon,
  Image as ImageIcon,
  LayoutList as LayoutListIcon,
  Leaf as LeafIcon,
  Library as LibraryIcon,
  LockKeyhole as LockKeyholeIcon,
  Mail as MailIcon,
  Music as MusicIcon,
  Newspaper as NewspaperIcon,
  Palette as PaletteIcon,
  PenTool as PenToolIcon,
  Rocket as RocketIcon,
  SmilePlus as SmilePlusIcon,
  Sparkles as SparklesIcon,
  Terminal as TerminalIcon,
  UserRound as UserRoundIcon,
  Zap as ZapIcon
} from '@lucide/vue'

type CategoryLite = {
  name: string
  slug: string
  icon?: string | null
}

type TagLite = {
  name: string
  slug: string
}

type TaxonomyItem = {
  id: number
  name: string
  slug: string
  icon?: string | null
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

const homeIconMap: Record<string, Component> = {
  'i-lucide-archive': ArchiveIcon,
  'i-lucide-badge-check': BadgeCheckIcon,
  'i-lucide-book-open': BookOpenIcon,
  'i-lucide-bot': BotIcon,
  'i-lucide-brain-circuit': BrainCircuitIcon,
  'i-lucide-camera': CameraIcon,
  'i-lucide-code-2': Code2Icon,
  'i-lucide-coffee': CoffeeIcon,
  'i-lucide-command': CommandIcon,
  'i-lucide-cpu': CpuIcon,
  'i-lucide-database': DatabaseIcon,
  'i-lucide-file-text': FileTextIcon,
  'i-lucide-flame': FlameIcon,
  'i-lucide-folder': FolderIcon,
  'i-lucide-gamepad-2': Gamepad2Icon,
  'i-lucide-globe-2': Globe2Icon,
  'i-lucide-heart': HeartIcon,
  'i-lucide-history': HistoryIcon,
  'i-lucide-home': HouseIcon,
  'i-lucide-image': ImageIcon,
  'i-lucide-layout-list': LayoutListIcon,
  'i-lucide-leaf': LeafIcon,
  'i-lucide-library': LibraryIcon,
  'i-lucide-lock-keyhole': LockKeyholeIcon,
  'i-lucide-mail': MailIcon,
  'i-lucide-music': MusicIcon,
  'i-lucide-newspaper': NewspaperIcon,
  'i-lucide-palette': PaletteIcon,
  'i-lucide-pen-tool': PenToolIcon,
  'i-lucide-rocket': RocketIcon,
  'i-lucide-smile-plus': SmilePlusIcon,
  'i-lucide-sparkles': SparklesIcon,
  'i-lucide-terminal': TerminalIcon,
  'i-lucide-user-round': UserRoundIcon,
  'i-lucide-zap': ZapIcon
}

function homeIcon(icon: string | null | undefined, fallback: Component) {
  return homeIconMap[icon || ''] || fallback
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
const categorySlug = ref('')
const [{ data }, { data: heroData }, { data: categoryData }, { data: tagData }] = await Promise.all([
  useFetch<{ data: PostsPayload }>('/api/posts', { query: computed(() => ({ page: currentPage.value, pageSize, category: categorySlug.value || undefined })) }),
  useFetch<{ data: PostsPayload }>('/api/posts', { query: { page: 1, pageSize: 6 } }),
  useFetch<{ data: TaxonomyItem[] }>('/api/categories'),
  useFetch<{ data: TaxonomyItem[] }>('/api/tags')
])

const posts = computed(() => data.value?.data.items || [])
const heroAll = computed(() => heroData.value?.data.items || [])
const totalPosts = computed(() => data.value?.data.total || posts.value.length)
const totalPages = computed(() => Math.ceil(totalPosts.value / pageSize))
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const latest = computed(() => heroAll.value[0])
const currentHeroPost = computed(() => activeHeroPost.value || latest.value)
const heroImage = computed(() => currentHeroPost.value?.cover || '/images/home-hero-ai.png')
const heroImageAlt = computed(() => currentHeroPost.value?.title || '')
const heroBoardStyle = computed(() => ({
  backgroundImage: `url("${heroImage.value}")`
}))
const homeSeoTitle = computed(() => {
  const subtitle = siteSettings.value.site_subtitle?.trim()
  return subtitle ? `${siteName.value} - ${subtitle}` : siteName.value
})
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
  return heroAll.value.slice(0, 5).map((post, index) => {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      cover: post.cover,
      to: postPath(post.slug),
      icon: heroIconLabels[index] || 'i-lucide-file-text'
    }
  })
})
const mobileHeroPosts = computed(() => {
  if (heroPosts.value.length) return heroPosts.value
  if (!latest.value) return []
  return [{
    id: latest.value.id,
    title: latest.value.title,
    slug: latest.value.slug,
    cover: latest.value.cover,
    to: postPath(latest.value.slug),
    icon: 'i-lucide-file-text'
  }]
})

const activeHeroPost = ref<HomePost | null>(null)
const topicTooltip = reactive({
  visible: false,
  label: '',
  x: 0,
  y: 0
})

const topicTabs = computed(() => [
  { label: '全部文章', tooltip: '全部文章', icon: 'i-lucide-layout-list', slug: '', active: categorySlug.value === '' },
  ...categories.value.map((category) => ({
    label: category.name,
    tooltip: `查看 ${category.name} 分类的文章`,
    icon: category.icon || 'i-lucide-folder',
    slug: category.slug,
    active: categorySlug.value === category.slug
  }))
])

function selectCategory(slug: string) {
  categorySlug.value = slug
  currentPage.value = 1
  hideTopicTooltip()
}

function showTopicTooltip(event: MouseEvent | FocusEvent, label: string) {
  if (window.matchMedia('(max-width: 760px)').matches) {
    hideTopicTooltip()
    return
  }

  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) {
    return
  }

  const rect = target.getBoundingClientRect()
  topicTooltip.label = label
  topicTooltip.x = rect.left + rect.width / 2
  topicTooltip.y = rect.top - 10
  topicTooltip.visible = true
}

function hideTopicTooltip() {
  topicTooltip.visible = false
}

const cloudTags = computed(() => tags.value.slice(0, 12))

useSeoMeta({
  title: homeSeoTitle,
  description: () => siteSettings.value.seo_description || '一个基于 Nuxt 4 的全栈动态博客'
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
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 386px;
  min-height: 324px;
  overflow: hidden;
  border-radius: 8px;
  background-color: #20252d;
  background-position: center;
  background-size: cover;
  box-shadow: 0 16px 44px rgb(28 35 48 / 16%);
}

.mobile-hero-carousel {
  display: none;
}

.hero-board::before {
  position: absolute;
  inset: 0;
  content: "";
  background: rgb(0 0 0 / 12%);
  pointer-events: none;
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

.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity .32s ease;
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

.hero-fade-enter-to,
.hero-fade-leave-from {
  opacity: 1;
}

.hero-main::after {
  position: absolute;
  inset: auto 0 0;
  z-index: -1;
  height: 58%;
  content: "";
  background: linear-gradient(0deg, rgb(0 0 0 / 68%), rgb(0 0 0 / 6%), transparent);
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
  font-size: 28px;
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
  position: relative;
  z-index: 1;
  display: grid;
  background: rgb(12 16 22 / 38%);
  backdrop-filter: blur(18px) saturate(1.2);
  box-shadow: inset 1px 0 0 rgb(255 255 255 / 14%);
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
  font-weight: 500;
}

.hero-link.is-active {
  background: rgb(255 255 255 / 18%);
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
  appearance: none;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 18px;
  border: 1px solid #e1e7f2;
  border-radius: 18px;
  background: white;
  color: #3a3b44;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color .16s ease, border-color .16s ease, box-shadow .16s ease, color .16s ease;
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

.topic-tab:hover {
  border-color: #d8deea;
  background: #f8fafc;
  box-shadow: 0 10px 24px rgb(31 43 68 / 8%);
  outline: none;
}

.topic-tab:focus-visible {
  border-color: #8da0ff;
  background: white;
  box-shadow: 0 0 0 3px rgb(73 100 244 / 14%);
  outline: none;
}

.topic-tab.is-active:hover {
  border-color: #435be3;
  background: #435be3;
  color: white;
}

.topic-tab.is-active:focus-visible {
  border-color: #435be3;
  background: #4964f4;
  color: white;
  box-shadow: 0 0 0 3px rgb(73 100 244 / 18%);
}

.topic-tooltip {
  position: fixed;
  z-index: 80;
  min-width: max-content;
  padding: 10px 14px;
  border: 1px solid #dfe5f2;
  border-radius: 14px;
  background: rgb(255 255 255 / 88%);
  backdrop-filter: blur(12px) saturate(1.15);
  box-shadow: 0 16px 34px rgb(31 43 68 / 14%);
  color: #303137;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  pointer-events: none;
  transform: translate(-50%, -100%);
  white-space: nowrap;
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

.cover-pink { background: linear-gradient(135deg, #5c2348, #8b2f6a); }
.cover-blue { background: linear-gradient(135deg, #18345f, #1f5d91); }
.cover-green { background: linear-gradient(135deg, #29462c, #4e7433); }
.cover-orange { background: linear-gradient(135deg, #5a3517, #9a5a1d); }
.cover-gray { background: linear-gradient(135deg, #343941, #5d6470); }
.cover-coral { background: linear-gradient(135deg, #68312e, #a9463e); }

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
  font-weight: 800;
}

.page-dot {
  width: 38px;
  height: 38px;
  color: #3a3b44;
  cursor: pointer;
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

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
    width: min(100% - 24px, 1290px);
  }

  .mobile-hero-carousel {
    display: flex;
    gap: 12px;
    margin: 0 -12px 12px;
    overflow-x: auto;
    padding: 0 12px 2px;
    scroll-padding-inline: 12px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .mobile-hero-carousel::-webkit-scrollbar {
    display: none;
  }

  .mobile-hero-slide {
    position: relative;
    display: block;
    width: calc(100vw - 56px);
    min-width: calc(100vw - 56px);
    height: 188px;
    overflow: hidden;
    border-radius: 14px;
    background: #20252d;
    box-shadow: 0 12px 30px rgb(28 35 48 / 14%);
    scroll-snap-align: center;
  }

  .mobile-hero-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .mobile-hero-shade {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgb(91 103 255 / 32%), rgb(91 103 255 / 10%)),
      linear-gradient(0deg, rgb(38 45 65 / 68%), rgb(38 45 65 / 4%) 62%, transparent);
  }

  .mobile-hero-title {
    position: absolute;
    left: 22px;
    right: 20px;
    bottom: 28px;
    display: -webkit-box;
    overflow: hidden;
    color: #fff;
    font-size: 23px;
    font-weight: 900;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-height: 1.22;
    text-shadow: 0 2px 10px rgb(0 0 0 / 20%);
  }

  .hero-board {
    display: none;
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
    display: none;
  }

  .topic-tooltip {
    display: none;
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
