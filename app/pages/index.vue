<template>
  <div class="home-page" :class="{ 'has-single-hero': singleHero }" :style="heroThemeStyle">
    <div v-if="currentHeroPost" class="hero-backdrop" aria-hidden="true">
      <Transition name="hero-backdrop">
        <img v-if="heroBackdrop.image" :key="heroBackdrop.image" :src="heroBackdrop.image" alt="" decoding="async" fetchpriority="low">
      </Transition>
    </div>
    <section class="home-shell content-layout pt-2">
      <div v-if="heroPosts.length" class="mobile-hero" data-page-enter="0">
        <div ref="mobileCarousel" class="mobile-hero-carousel" aria-label="精选文章" @scroll.passive="syncMobileHero">
          <NuxtLink
            v-for="(item, index) in heroPosts"
            :key="`mobile-hero-${item.id}`"
            :to="item.to"
            class="mobile-hero-slide"
          >
            <img
              :src="heroCover(item.cover)"
              alt=""
              class="mobile-hero-image"
              :loading="index === 0 ? 'eager' : 'lazy'"
              decoding="async"
              :fetchpriority="index === 0 ? 'high' : 'low'"
              @error="markHeroCoverFailed($event)"
            >
            <span class="mobile-hero-shade" aria-hidden="true" />
            <span class="mobile-hero-title">{{ item.title }}</span>
          </NuxtLink>
        </div>
        <div v-if="singleHero && heroPosts.length > 1" class="hero-indicators mobile-hero-indicators">
          <button
            v-for="(item, index) in heroPosts"
            :key="item.id"
            type="button"
            :class="{ 'is-active': item.id === currentHeroPost?.id }"
            :aria-current="item.id === currentHeroPost?.id ? 'true' : undefined"
            :aria-label="`切换到第 ${index + 1} 张`"
            @click="goToMobileHero(index)"
          />
        </div>
      </div>

      <div class="hero-board" :class="{ 'has-no-posts': !latest }" data-page-enter="0">
        <NuxtLink :to="currentHeroPost ? postPath(currentHeroPost.slug) : '/archive'" class="hero-main">
          <Transition name="hero-fade">
            <img
              :key="heroTransitionKey"
              :src="heroImage"
              alt=""
              class="hero-image"
              decoding="async"
              fetchpriority="high"
              @error="markHeroCoverFailed($event)"
            >
          </Transition>
          <div class="hero-copy">
            <Transition name="hero-copy" mode="out-in">
              <div :key="heroTransitionKey" class="hero-copy-content">
                <h1>{{ currentHeroPost?.title || siteName }}</h1>
                <p v-if="!singleHero">{{ heroSelection?.data.configured ? '⭐ 精选推荐' : currentHeroPost?.isPinned ? '⭐ 置顶推荐' : (latest ? '⭐ 最新发布' : '暂无已发布文章') }}</p>
              </div>
            </Transition>
          </div>
        </NuxtLink>
        <PointerGlow />

        <div v-if="heroPosts.length && !singleHero" class="hero-list">
          <NuxtLink
            v-for="item in heroPosts"
            :key="item.id"
            :to="item.to"
            class="hero-link"
            :class="{ 'is-active': item.id === currentHeroPost?.id }"
            @mouseenter="scheduleHeroChange(item)"
            @mouseleave="cancelHeroChange"
            @focus="setActiveHeroPost(item)"
          >
            <span class="hero-link-icon">
              <img v-if="item.memeIcon" :src="item.memeIcon" alt="" aria-hidden="true">
              <Icon v-else :name="item.icon" mode="svg" aria-hidden="true" />
            </span>
            <span>{{ item.title }}</span>
          </NuxtLink>
        </div>

        <div v-if="heroPosts.length" class="hero-controls">
          <div class="hero-indicators">
            <span v-if="singleHero && heroPosts.length > 1" class="hero-recommendation">
              <Icon name="i-lucide-star" mode="svg" aria-hidden="true" />
              精选推荐
            </span>
            <button
              v-for="(item, index) in heroPosts.length > 1 ? heroPosts : []"
              :key="item.id"
              type="button"
              :class="{ 'is-active': item.id === currentHeroPost?.id }"
              :aria-current="item.id === currentHeroPost?.id ? 'true' : undefined"
              :aria-label="`切换到第 ${index + 1} 张`"
              @click="setActiveHeroPost(item)"
            />
          </div>
          <div v-if="heroPosts.length > 1" class="hero-arrows">
            <button type="button" aria-label="上一条" @click="stepHero(-1)"><Icon name="i-lucide-chevron-left" aria-hidden="true" /></button>
            <button type="button" aria-label="下一条" @click="stepHero(1)"><Icon name="i-lucide-chevron-right" aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      <nav v-if="topicTabs.length" class="topic-tabs" aria-label="文章分类" data-page-enter="1">
        <button
          v-for="tab in topicTabs"
          :key="tab.label"
          type="button"
          class="topic-tab"
          :class="{ 'is-active': tab.active }"
          :disabled="listPending"
          :aria-label="tab.label"
          @mouseenter="showTopicTooltip($event, tab.tooltip)"
          @mouseleave="hideTopicTooltip"
          @focus="showTopicTooltip($event, tab.tooltip)"
          @blur="hideTopicTooltip"
          @click="selectTopic(tab.slug, tab.sort)"
        >
          <Icon :name="tab.icon" mode="svg" aria-hidden="true" />
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

      <main :aria-busy="listPending" data-page-enter="2">
        <template v-if="showListSkeleton">
          <div v-if="useArchiveCardStyle" class="home-archive-list home-archive-desktop" role="status" aria-label="正在加载文章">
            <PostCardSkeleton variant="archive" :count="pageSize" />
          </div>
          <div class="post-grid" :class="{ 'home-grid-mobile': useArchiveCardStyle }" role="status" aria-label="正在加载文章">
            <PostCardSkeleton variant="grid" :count="pageSize" />
          </div>
        </template>

        <div v-else-if="listError" class="empty-card list-error" role="alert">
          <h2>文章加载失败</h2>
          <p>网络似乎开了个小差，请稍后重试。</p>
          <button type="button" @click="refreshPosts()">重新加载</button>
        </div>

        <template v-else-if="displayPosts.length">
          <div
            v-if="useArchiveCardStyle"
            :key="`archive-${topicRevealVersion}`"
            class="home-archive-list home-archive-desktop"
            :class="{ 'is-topic-revealing': topicRevealVersion > 0 }"
          >
            <div
              v-for="(post, index) in posts"
              :key="post.id"
              class="topic-card-reveal"
              :style="{ '--topic-card-order': index }"
            >
              <ArchivePostCard :post="post" stable-cover />
            </div>
          </div>

          <div
            :key="`grid-${topicRevealVersion}`"
            class="post-grid"
            :class="{ 'home-grid-mobile': useArchiveCardStyle, 'is-topic-revealing': topicRevealVersion > 0 }"
          >
            <div
              v-for="(post, index) in displayPosts"
              :key="post.key"
              class="topic-card-reveal"
              :style="{ '--topic-card-order': index }"
            >
              <article class="post-card">
                <NuxtLink
                  :to="post.to"
                  :aria-label="post.title"
                  class="post-cover"
                >
                  <template v-if="post.cover && !failedCoverUrls.has(post.cover)">
                    <PostCoverImage :src="post.cover" alt="" class="cover-image" stable @error="failedCoverUrls.add(post.cover)" />
                    <span class="cover-overlay" aria-hidden="true" />
                    <span class="cover-word" aria-hidden="true">{{ post.coverWord }}</span>
                    <span class="cover-icon" :class="{ 'has-meme': Boolean(post.memeIcon) }" aria-hidden="true">
                      <img v-if="post.memeIcon" :src="post.memeIcon" alt="" loading="lazy" decoding="async">
                      <Icon v-else :name="post.icon" mode="svg" />
                    </span>
                  </template>
                </NuxtLink>
                <div class="post-body">
                  <div class="post-meta">
                    <span v-if="post.isPinned" class="post-pinned-mark">
                      <PinIcon aria-hidden="true" />
                      置顶
                    </span>
                    <span>{{ post.category }}</span>
                    <span v-if="!popular && index < 2 && !post.isPinned">最新</span>
                  </div>
                  <NuxtLink :to="post.to" class="post-title">
                    <span>{{ post.title }}</span>
                    <span class="read-more-cue" aria-hidden="true">→</span>
                  </NuxtLink>
                  <div class="post-tags">
                    <span v-for="tag in post.tags" :key="tag"># {{ tag }}</span>
                    <time>{{ post.date }}</time>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </template>

        <div v-else class="empty-card">
          <h2>暂无文章</h2>
          <p>后台发布文章后，这里会自动显示最新内容。</p>
        </div>

        <SeoPagination v-if="!listError" :page="currentPage" :total="totalPages" :page-to="pageTo" />
      </main>

      <PublicSidebar
        class="sidebar"
        :pointer-glow="singleHero"
        sticky-after-author
        data-page-enter="2"
        :site-name="siteName"
        :description="siteSettings.sidebar_description"
        :categories="categories"
        :tags="cloudTags"
        :posts="heroAll"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import PointerGlow from '~/components/PointerGlow.vue'
import PostCoverImage from '~/components/PostCoverImage.vue'
import { defaultSeoDescription } from '~/utils/seo'
import type { ApiResult, PublicMemeImagePayload } from '~~/types/api'
import type { HomeHeroPayload, HomeHeroPost, PublicPostListPayload } from '~~/types/dto/post'
import type { TaxonomyItem } from '~~/types/dto/taxonomy'
import { categoryNavigation } from '~/utils/category-navigation'
import { resolveCategoryIcon } from '~/utils/category-icons'
import { Pin as PinIcon } from '@lucide/vue'
import { coverColorText } from '~/utils/cover-color'
import { homeHeroFallbackCover } from '~~/shared/home-hero'

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName)
const useArchiveCardStyle = computed(() => siteSettings.value.home_post_card_style === 'archive')
const pageSize = 12
const route = useRoute()
const singleHero = computed(() => siteSettings.value.home_hero_layout === 'single')
const popular = computed(() => route.query.sort === 'popular')
const categorySlug = computed(() => !popular.value && typeof route.query.category === 'string' ? route.query.category : '')
const { currentPage, pageTo } = usePublicPagination()
const [{ data, status: listStatus, error: listError, refresh: refreshPosts }, { data: categoryData }, { data: tagData }, { data: memeData }, { data: heroSelection }] = await Promise.all([
  useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query: computed(() => ({ page: currentPage.value, pageSize, category: categorySlug.value || undefined, sort: popular.value ? 'popular' : undefined })) }),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/tags'),
  useFetch<ApiResult<PublicMemeImagePayload[]>>('/api/gallery/memes'),
  useFetch<ApiResult<HomeHeroPayload>>('/api/home/hero', { key: 'home-hero-selection' })
])

assertPublicPageExists(data.value?.data)

const posts = computed(() => data.value?.data.items || [])
const listPending = computed(() => listStatus.value === 'pending')
const showListSkeleton = useDelayedPending(listPending)
const topicRevealVersion = ref(0)
let revealTopicCardsOnNextResult = false

watch(listStatus, (status) => {
  if (!revealTopicCardsOnNextResult || status === 'pending' || status === 'idle') return
  revealTopicCardsOnNextResult = false
  if (status === 'success') topicRevealVersion.value += 1
})

const heroAll = computed(() => heroSelection.value?.data.recent || [])
const totalPosts = computed(() => data.value?.data.total || posts.value.length)
const totalPages = computed(() => Math.ceil(totalPosts.value / pageSize))

const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const memeImages = computed(() => memeData.value?.data || [])
const memeIcons = computed(() => memeImages.value.map(image => image.url))
const heroMemeIcons = computed(() => {
  const group = siteSettings.value.hero_meme_group
  if (!group) return []

  const memeGroup = group === 'ungrouped' ? null : group
  return memeImages.value.filter(image => image.memeGroup === memeGroup).map(image => image.url)
})
const heroMemeOffset = useState('home-hero-meme-offset', () => Math.floor(Math.random() * 10000))
const activeHeroId = ref<number | null>(null)
const latest = computed(() => heroPosts.value[0])
const currentHeroPost = computed(() => heroPosts.value.find(post => post.id === activeHeroId.value) || latest.value)
const failedHeroCovers = reactive(new Set<string>())
const heroImage = computed(() => heroCover(currentHeroPost.value?.cover))

function heroCover(cover?: string | null) {
  return cover && !failedHeroCovers.has(cover) ? cover : homeHeroFallbackCover
}

function markHeroCoverFailed(event: Event) {
  const cover = (event.currentTarget as HTMLImageElement).getAttribute('src')
  if (cover && cover !== homeHeroFallbackCover) failedHeroCovers.add(cover)
}
const heroTransitionKey = computed(() => currentHeroPost.value?.id || 'hero-empty')
const homeSeoTitle = computed(() => {
  const subtitle = siteSettings.value.site_subtitle?.trim()
  return subtitle && subtitle !== '个人博客' ? `${siteName.value} - ${subtitle}` : `${siteName.value}｜AI 编程、Agent 实践与技术笔记`
})


function memeIconForPost(id: number) {
  if (!memeIcons.value.length) return ''
  return memeIcons.value[id % memeIcons.value.length] || ''
}

const coverStyles = [
  { icon: 'i-lucide-sparkles' },
  { icon: 'i-lucide-brain-circuit' },
  { icon: 'i-lucide-leaf' },
  { icon: 'i-lucide-smile-plus' },
  { icon: 'i-lucide-badge-check' },
  { icon: 'i-lucide-flame' }
]

const displayPosts = computed(() => {
  return posts.value.map((post) => {
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
      isPinned: Boolean(post.isPinned),
      cover: post.cover || '',
      coverWord: category === '未分类' ? post.title.slice(0, 4) : category,
      memeIcon: memeIconForPost(post.id),
      ...style
    }
  })
})

const heroIconLabels = ['i-lucide-command', 'i-lucide-mail', 'i-lucide-bot', 'i-lucide-newspaper', 'i-lucide-history', 'i-lucide-zap']

const heroPosts = computed(() => {
  return (heroSelection.value?.data.slides || []).map((post, index) => {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      cover: post.cover,
      color: post.color,
      isPinned: Boolean(post.isPinned),
      to: postPath(post.slug),
      icon: heroIconLabels[index] || 'i-lucide-file-text',
      memeIcon: heroMemeIcons.value.length ? heroMemeIcons.value[(index + heroMemeOffset.value) % heroMemeIcons.value.length] : ''
    }
  })
})
const slideColor = computed(() => currentHeroPost.value?.color)
const heroBackdrop = shallowRef({ image: heroImage.value, color: slideColor.value })
const heroTheme = computed(() => heroBackdrop.value.color)
const heroThemeStyle = computed(() => {
  const color = heroTheme.value
  if (!color) return undefined
  const foreground = coverColorText(color)
  return {
    '--hero-accent': color,
    '--hero-accent-text': foreground,
    '--hero-control-ink': foreground === '#000'
      ? 'color-mix(in srgb, var(--hero-accent) 56%, #171b24)'
      : color
  }
})

onMounted(() => {
  watch([heroImage, slideColor], async ([src, color], _, onCleanup) => {
    if (src === heroBackdrop.value.image) {
      heroBackdrop.value = { image: src, color }
      return
    }
    let cancelled = false
    onCleanup(() => { cancelled = true })
    const image = new Image()
    image.src = src
    try {
      await image.decode()
    } catch {
      if (!cancelled) {
        if (src === homeHeroFallbackCover) heroBackdrop.value = { image: '', color }
        else failedHeroCovers.add(src)
      }
      return
    }
    if (!cancelled) heroBackdrop.value = { image: src, color }
  })
})

const { page: headerPage } = useSiteHeaderPage()
useHead(() => ({
  meta: headerPage.value.path === '/' && !headerPage.value.isScrolled && heroTheme.value
    ? [{ name: 'theme-color', content: heroTheme.value }]
    : []
}))
const mobileCarousel = ref<HTMLElement>()
const failedCoverUrls = reactive(new Set<string>())
let heroChangeTimer: ReturnType<typeof setTimeout> | null = null

function cancelHeroChange() {
  if (!heroChangeTimer) return
  clearTimeout(heroChangeTimer)
  heroChangeTimer = null
}

function setActiveHeroPost(post: HomeHeroPost) {
  cancelHeroChange()
  activeHeroId.value = post.id
}

function scheduleHeroChange(post: HomeHeroPost) {
  cancelHeroChange()
  if (post.id === currentHeroPost.value?.id) return
  heroChangeTimer = setTimeout(() => {
    activeHeroId.value = post.id
    heroChangeTimer = null
  }, 30)
}

function stepHero(offset: number) {
  const index = heroPosts.value.findIndex(post => post.id === currentHeroPost.value?.id)
  const count = heroPosts.value.length
  const next = heroPosts.value[(index + offset + count) % count]
  if (next) setActiveHeroPost(next)
}

function syncMobileHero() {
  const carousel = mobileCarousel.value
  const first = carousel?.children[0] as HTMLElement | undefined
  if (!carousel?.clientWidth || !first) return
  const step = (carousel.children[1] as HTMLElement | undefined)?.offsetLeft
  const index = step === undefined ? 0 : Math.round(carousel.scrollLeft / (step - first.offsetLeft))
  const post = heroPosts.value[index]
  if (post) setActiveHeroPost(post)
}

function goToMobileHero(index: number) {
  const carousel = mobileCarousel.value
  const first = carousel?.children[0] as HTMLElement | undefined
  const target = carousel?.children[index] as HTMLElement | undefined
  if (!carousel || !first || !target) return
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  carousel.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior })
}

const topicTooltip = reactive({
  visible: false,
  label: '',
  x: 0,
  y: 0
})

const topicTabs = computed(() => [
  { label: '全部文章', tooltip: '全部文章', icon: 'i-lucide-layout-list', slug: '', sort: undefined, active: !popular.value && !categorySlug.value },
  { label: '热门', tooltip: '按累计浏览量排序', icon: 'i-lucide-flame', slug: '', sort: 'popular', active: popular.value },
  ...categoryNavigation(categories.value).map((category) => ({
    label: category.name,
    tooltip: `查看 ${category.name} 分类的文章`,
    icon: resolveCategoryIcon(category.icon),
    slug: category.slug,
    sort: undefined,
    active: !popular.value && categorySlug.value === category.slug
  }))
])

function selectTopic(slug: string, sort?: string) {
  if (slug === categorySlug.value && Boolean(sort) === popular.value && !route.query.page) {
    hideTopicTooltip()
    return
  }

  revealTopicCardsOnNextResult = true
  void navigateTo({ path: route.path, query: { ...route.query, category: slug || undefined, sort, page: undefined } })
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

function resetHomeState() {
  cancelHeroChange()
  selectTopic('')
  activeHeroId.value = null
  mobileCarousel.value?.scrollTo({ left: 0, behavior: 'instant' })
  hideTopicTooltip()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('home:reset', resetHomeState)
})

onBeforeUnmount(() => {
  cancelHeroChange()
  window.removeEventListener('home:reset', resetHomeState)
})

const cloudTags = computed(() => tags.value.slice(0, 12))

useSeoMeta({
  title: homeSeoTitle,
  description: () => siteSettings.value.seo_description || defaultSeoDescription,
  ogTitle: homeSeoTitle,
  ogDescription: () => siteSettings.value.seo_description || defaultSeoDescription
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
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: var(--theme-page);
  color: var(--theme-text);
}

.hero-backdrop {
  position: absolute;
  inset: calc(-1 * var(--site-header-height)) 0 auto;
  height: 320px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, #000 28%, transparent 92%);
  opacity: .2;
  pointer-events: none;
}

.hero-backdrop img {
  position: absolute;
  inset: -32px;
  width: calc(100% + 64px);
  height: calc(100% + 64px);
  object-fit: cover;
  object-position: center 30%;
  filter: blur(28px) saturate(1.25) brightness(1.05);
  transform: scale(1.1);
}

.hero-backdrop-leave-active { z-index: 1; transition: opacity 450ms ease; }
.hero-backdrop-leave-to { opacity: 0; }

.home-shell {
  position: relative;
  width: var(--site-content-width);
  margin: 0 auto;
}

.hero-board {
  grid-area: hero;
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

.has-single-hero .hero-board {
  grid-template-columns: minmax(0, 1fr);
  min-height: 320px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 12px;
  box-shadow: none;
}

.has-single-hero .hero-main { min-height: 318px; }
.has-single-hero .hero-copy { inset: auto 104px 67px 32px; max-width: none; }
.has-single-hero .hero-copy h1 {
  overflow: hidden;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 5px rgb(0 0 0 / 50%);
}

.has-single-hero .hero-fade-enter-active,
.has-single-hero .hero-fade-leave-active { transition: opacity 450ms ease; }
.has-single-hero .hero-image { transform: none; }

.hero-controls {
  position: absolute;
  inset: 16px 402px auto 16px;
  z-index: 2;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 8px;
  color: white;
  pointer-events: none;
}

.has-single-hero .hero-controls { inset: auto 32px 32px; }
.hero-indicators,
.hero-arrows { display: flex; align-items: center; gap: 8px; }
.hero-controls button { cursor: pointer; pointer-events: auto; }
.hero-recommendation {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 2px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgb(255 255 255 / 16%);
  font-size: 12px;
}

.hero-recommendation svg {
  width: 12px;
  height: 12px;
  fill: currentColor;
}

.hero-indicators button {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: rgb(255 255 255 / 40%);
  transition: width 450ms ease, background-color 450ms ease;
}

.hero-indicators button.is-active { width: 24px; background: rgb(255 255 255 / 90%); }
.hero-arrows button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: rgb(255 255 255 / 15%);
  font-size: 24px;
  transition: color 300ms ease, background-color 300ms ease, transform 300ms ease;
}
.hero-arrows button:is(:hover, :focus-visible) {
  background: #fff;
  color: var(--hero-control-ink, var(--theme-accent));
  transform: scale(1.1);
}
.hero-arrows button:active { transform: scale(.8); }
.hero-controls button:focus-visible { outline: 2px solid white; outline-offset: 3px; }

.mobile-hero {
  position: relative;
  grid-area: hero;
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
  transition:
    opacity 480ms cubic-bezier(.22, 1, .36, 1),
    transform 650ms cubic-bezier(.22, 1, .36, 1);
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}

.hero-fade-enter-from {
  transform: scale(1.025);
}

.hero-fade-leave-to {
  transform: scale(1.008);
}

.hero-fade-enter-to,
.hero-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.hero-main::after {
  position: absolute;
  inset: auto 0 0;
  z-index: -1;
  height: 58%;
  content: "";
  background: linear-gradient(0deg, color-mix(in srgb, var(--hero-accent, #20252d) 48%, #000) 0%, rgb(0 0 0 / 6%), transparent);
}

.has-single-hero .hero-main::after {
  height: 120px;
  background: linear-gradient(to top, var(--hero-accent, #20252d), transparent);
  backdrop-filter: blur(16px) saturate(1.2);
  mask-image: linear-gradient(to top, #000, transparent);
}

.hero-copy {
  position: absolute;
  left: 32px;
  bottom: 28px;
  max-width: 620px;
  color: white;
}

.hero-copy-content {
  transform-origin: left bottom;
}

.hero-copy-enter-active,
.hero-copy-leave-active {
  transition: opacity 180ms ease, transform 220ms cubic-bezier(.22, 1, .36, 1);
}

.hero-copy-enter-from {
  opacity: 0;
  transform: translateY(7px);
}

.hero-copy-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
  transition: background-color 240ms ease, color 240ms ease;
}

.hero-link.is-active {
  background: color-mix(in srgb, var(--theme-surface) 18%, transparent);
  color: white;
}

.hero-link-icon {
  display: grid;
  width: 34px;
  height: 34px;
  overflow: hidden;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--theme-surface) 20%, transparent);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 16%);
  font-size: 12px;
}

.hero-link-icon :deep(svg),
.hero-link-icon :deep(span) {
  width: 18px;
  height: 18px;
}

.hero-link-icon img {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.topic-tabs {
  grid-area: topics;
  min-width: 0;
  display: flex;
  gap: 10px;
  margin: 12px 0;
  overflow-x: auto;
  padding: 4px;
}

.topic-tab {
  appearance: none;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 18px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 18px;
  background: var(--theme-surface);
  color: var(--theme-text-soft);
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
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: var(--theme-accent-foreground);
}

.topic-tab:hover:not(.is-active) {
  border-color: var(--theme-border);
  background: var(--theme-surface-muted);
  box-shadow: 0 10px 24px rgb(31 43 68 / 8%);
}

.topic-tab:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 2px;
}

.topic-tab.is-active:hover {
  border-color: var(--theme-accent-hover);
  background: var(--theme-accent-hover);
}

.topic-tab:disabled { cursor: default; }

.topic-tooltip {
  position: fixed;
  z-index: 80;
  min-width: max-content;
  padding: 10px 14px;
  border: 1px solid var(--theme-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--theme-surface) 88%, transparent);
  backdrop-filter: blur(12px) saturate(1.15);
  box-shadow: 0 16px 34px rgb(31 43 68 / 14%);
  color: var(--theme-text);
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
  grid-template-areas: 'hero hero' 'topics topics' 'posts sidebar';
  gap: 0 12px;
  align-items: start;
}

.content-layout > main { grid-area: posts; min-width: 0; }
.has-single-hero .content-layout {
  grid-template-columns: minmax(0, 1fr) 300px;
  grid-template-areas: 'hero sidebar' 'topics sidebar' 'posts sidebar';
  grid-template-rows: auto auto 1fr;
  gap: 0 10px;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.home-archive-list {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.topic-card-reveal { min-width: 0; }

.is-topic-revealing .topic-card-reveal {
  animation: topic-card-enter 420ms cubic-bezier(.2, .78, .2, 1) both;
  animation-delay: calc(var(--topic-card-order, 0) * 35ms);
}

@keyframes topic-card-enter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.home-grid-mobile { display: none; }

.post-card {
  overflow: hidden;
  border: 1px solid var(--theme-border-soft);
  border-radius: 8px;
  background: var(--theme-surface);
  box-shadow: 0 14px 34px rgb(42 59 91 / 7%);
  transition: border-color .2s ease, box-shadow .2s ease, background .2s ease;
}

.post-card:hover,
.post-card:focus-within {
  border-color: rgb(79 103 245 / 28%);
  box-shadow: 0 18px 42px rgb(42 59 91 / 12%);
}

.post-cover {
  position: relative;
  display: grid;
  min-height: 202px;
  place-items: center;
  overflow: hidden;
  isolation: isolate;
  background: linear-gradient(135deg, var(--theme-surface), var(--theme-surface-muted));
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  backface-visibility: hidden;
  transform: translateZ(0) scale(1.001);
  transform-origin: center;
  transition: transform .32s ease;
  will-change: transform;
}

.post-card:hover .cover-image,
.post-card:focus-within .cover-image {
  transform: translateZ(0) scale(1.025);
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
  background: color-mix(in srgb, var(--theme-surface) 75%, transparent);
  box-shadow: 0 18px 34px rgb(0 0 0 / 18%);
  color: var(--theme-text-strong);
  font-size: 58px;
  font-weight: 900;
}

.cover-icon :deep(svg),
.cover-icon :deep(span) {
  width: 54px;
  height: 54px;
}

.cover-icon.has-meme {
  overflow: hidden;
  border-color: rgb(255 255 255 / 38%);
  background: color-mix(in srgb, var(--theme-surface) 64%, transparent);
  backdrop-filter: blur(22px) saturate(130%);
  -webkit-backdrop-filter: blur(22px) saturate(130%);
}

.cover-icon.has-meme img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.post-card:hover .cover-icon,
.post-card:focus-within .cover-icon {
  box-shadow: 0 20px 38px rgb(0 0 0 / 22%);
}

.post-body {
  padding: 20px 30px 22px;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--theme-text-faint);
  font-size: 12px;
  font-weight: 700;
}

.post-pinned-mark {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--theme-warning);
}

.post-pinned-mark svg {
  width: 13px;
  height: 13px;
  fill: rgb(245 158 11 / 18%);
}

.post-title {
  display: flex;
  min-height: 62px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  color: var(--theme-text);
  font-size: 20px;
  font-weight: 900;
  line-height: 1.45;
  transition: color .18s ease;
}

.post-title:focus-visible {
  outline: none;
}

.post-card:hover .post-title,
.post-card:focus-within .post-title {
  color: var(--theme-accent);
}

.post-title span:first-child {
  min-width: 0;
}

.read-more-cue {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: rgb(79 103 245 / 10%);
  color: var(--theme-accent);
  font-size: 18px;
  line-height: 1;
  opacity: 0;
  transition: opacity .18s ease, background .18s ease;
}

.post-card:hover .read-more-cue,
.post-card:focus-within .read-more-cue {
  opacity: 1;
}

.post-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  color: var(--theme-text-muted);
  font-size: 14px;
}

.post-tags span {
  transition: color .18s ease;
}

.post-tags span:hover {
  color: var(--theme-accent);
}

.post-tags time {
  margin-left: auto;
}

.sidebar.public-sidebar {
  grid-area: sidebar;
  gap: 10px;
}

@media (min-width: 1101px) {
  .sidebar.public-sidebar {
    display: flex;
    align-self: stretch;
    flex-direction: column;
  }

  .sidebar :deep(.sidebar-card-group) { display: grid; gap: 10px; }
  .sidebar :deep(.sidebar-card-group.is-sticky) {
    position: sticky;
    top: calc(var(--site-header-height) + 8px);
  }
}

.has-single-hero .sidebar :deep(.sidebar-author) {
  --theme-text-strong: var(--hero-accent-text, var(--theme-accent-foreground));
  --theme-text-muted: var(--theme-text-strong);
  --theme-surface-muted: color-mix(in srgb, var(--theme-text-strong) 15%, transparent);
  min-height: 320px;
  padding: 21px 22px 18px;
  border-radius: 12px;
  background: var(--hero-accent, var(--theme-accent));
  box-shadow: none;
  transition: background-color 450ms ease;
}

.has-single-hero .sidebar :deep(.author-avatar) { margin-bottom: 16px; }
.has-single-hero .sidebar :deep(.author-avatar-fallback) { color: var(--theme-text); }
.has-single-hero .sidebar :deep(.sidebar-author strong) { margin-bottom: 8px; }
.has-single-hero .sidebar :deep(.author-signature) { margin-top: 8px; font-size: 20px; }
.has-single-hero .sidebar :deep(.author-links) { margin-top: 12px; }

.profile-card,
.tag-cloud,
.site-stats {
  border: 1px solid var(--theme-border-soft);
  border-radius: 8px;
  background: var(--theme-surface);
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
  background: color-mix(in srgb, var(--theme-surface) 16%, transparent);
  color: white;
  font-size: 18px;
  transition: background 0.2s ease;
}

.social-icon:hover {
  background: color-mix(in srgb, var(--theme-surface) 28%, transparent);
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
  border: 1px solid var(--theme-border-soft);
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

.empty-card {
  border: 1px solid var(--theme-border-soft);
  border-radius: 8px;
  background: var(--theme-surface);
  padding: 48px 32px;
  box-shadow: 0 14px 34px rgb(42 59 91 / 7%);
}

.empty-card h2 {
  margin: 0;
  color: var(--theme-text);
  font-size: 24px;
  font-weight: 900;
}

.empty-card p {
  margin: 12px 0 0;
  color: var(--theme-text-muted);
}

.list-error button {
  margin-top: 18px;
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

@media (max-width: 1200px) {
  .has-single-hero .home-shell { width: calc(100% - 60px); }
  .has-single-hero .content-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'hero' 'topics' 'posts';
  }
  .has-single-hero .sidebar { display: none; }
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

  .content-layout {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'hero' 'topics' 'posts' 'sidebar';
    gap: 0;
  }

  .hero-controls { right: 16px; }
}

@media (max-width: 768px) {
  .hero-backdrop { display: none; }
  .has-single-hero .home-shell { width: calc(100% - 40px); }
  .mobile-hero { display: block; }

  .mobile-hero-carousel {
    display: flex;
    gap: 12px;
    margin: 0 calc(-1 * var(--site-gutter)) 12px;
    overflow-x: auto;
    padding: 0 var(--site-gutter) 2px;
    scroll-padding-inline: var(--site-gutter);
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
    touch-action: pan-x pan-y;
    scrollbar-width: none;
  }

  .mobile-hero-carousel::-webkit-scrollbar {
    display: none;
  }

  .mobile-hero-slide {
    position: relative;
    display: block;
    width: calc(100% - 56px);
    min-width: calc(100% - 56px);
    height: 188px;
    overflow: hidden;
    border-radius: 14px;
    background: #20252d;
    box-shadow: 0 12px 30px rgb(28 35 48 / 14%);
    scroll-snap-align: center;
  }

  .has-single-hero .mobile-hero-carousel {
    position: relative;
    gap: 0;
    margin: 0;
    padding: 0;
    border-radius: 12px;
    scroll-padding-inline: 0;
  }
  .mobile-hero-indicators {
    position: absolute;
    left: 20px;
    bottom: 20px;
    gap: 6px;
  }
  .mobile-hero-indicators button { width: 6px; height: 6px; }
  .mobile-hero-indicators button.is-active { width: 20px; }
  .mobile-hero-indicators button:focus-visible { outline: 2px solid white; outline-offset: 3px; }
  .has-single-hero .mobile-hero-image { object-position: 70% center; }
  .has-single-hero .mobile-hero-title {
    inset: auto 20px 31px;
    display: block;
    font-size: 18px;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .has-single-hero .mobile-hero-shade {
    inset: auto 0 0;
    height: 120px;
    background: linear-gradient(to top, var(--hero-accent, #20252d), transparent);
    backdrop-filter: blur(16px) saturate(1.2);
    mask-image: linear-gradient(to top, #000, transparent);
  }
  .has-single-hero .mobile-hero-slide {
    width: 100%;
    min-width: 100%;
    height: 200px;
    border-radius: 0;
    box-shadow: none;
    scroll-snap-align: start;
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
  .sidebar {
    grid-template-columns: 1fr;
  }

  .post-grid {
    grid-template-columns: 1fr;
  }

  .home-archive-desktop { display: none; }
  .home-grid-mobile { display: grid; }

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

@media (prefers-reduced-motion: reduce) {
  .hero-arrows button { transition: none; transform: none; }
  .hero-arrows button:is(:hover, :focus-visible, :active) { transform: none; }

  .has-single-hero .sidebar :deep(.sidebar-author),
  .hero-backdrop-leave-active,
  .hero-indicators button,
  .hero-fade-enter-active,
  .hero-fade-leave-active,
  .hero-copy-enter-active,
  .hero-copy-leave-active,
  .hero-link {
    transition: none;
  }

  .hero-fade-enter-from,
  .hero-fade-leave-to,
  .hero-copy-enter-from,
  .hero-copy-leave-to {
    transform: none;
  }

  .is-topic-revealing .topic-card-reveal {
    animation: none;
  }
}
</style>
