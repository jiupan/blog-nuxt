<template>
  <aside class="public-sidebar" aria-label="侧边栏">
    <section v-if="moduleVisible('author')" class="sidebar-author" :style="moduleStyle('author')">
      <span class="author-glow" aria-hidden="true" />
      <div class="author-content">
        <div class="author-avatar">
          <img v-if="authorAvatar" :src="authorAvatar" :alt="authorName">
          <span v-else>{{ initial }}</span>
          <i aria-hidden="true" />
        </div>
        <h2>{{ authorName }}</h2>
        <strong>{{ subtitle }}</strong>
        <p>{{ authorDescription }}</p>
        <div class="author-signature" aria-hidden="true">{{ authorSignature }}</div>
        <div class="author-links" aria-label="快捷链接">
          <NuxtLink to="/about" title="关于">
            <SparklesIcon aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/archive" title="归档">
            <BookOpenIcon aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/link" title="友链">
            <CompassIcon aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <div v-if="slots['after-author']" class="sidebar-extension" :style="extensionStyle('author')">
      <slot name="after-author" />
    </div>

    <section v-if="visiblePosts.length && moduleVisible('featured')" class="sidebar-section featured-section" :style="moduleStyle('featured')">
      <div class="section-title">
        <h3>精选阅读</h3>
        <TrendingUpIcon aria-hidden="true" />
      </div>
      <NuxtLink v-for="(post, index) in visiblePosts" :key="post.slug" :to="postPath(post.slug)" class="featured-link">
        <span class="featured-thumb" :class="!post.cover && topicTone(index)">
          <img v-if="post.cover" :src="post.cover" :alt="post.title">
          <span v-else>{{ coverWord(post) }}</span>
        </span>
        <span class="featured-copy">
          <em>{{ post.category?.name || '文章' }}</em>
          <strong>{{ post.title }}</strong>
          <time v-if="post.publishedAt">
            <ClockIcon aria-hidden="true" />
            {{ formatPostDate(post.publishedAt) }}
          </time>
        </span>
      </NuxtLink>
    </section>

    <section v-if="visibleCategories.length && moduleVisible('categories')" class="sidebar-section topics-section" :style="moduleStyle('categories')">
      <div class="section-title">
        <h3>探索话题</h3>
        <CompassIcon aria-hidden="true" />
      </div>
      <div class="topic-list">
        <NuxtLink v-for="(category, index) in visibleCategories" :key="category.slug" :to="`/categories/${category.slug}`" class="topic-row">
          <span class="topic-icon" :class="topicTone(index)">
            <component :is="topicIcon(index)" aria-hidden="true" />
          </span>
          <span class="topic-name">{{ category.name }}</span>
          <span v-if="itemCount(category)" class="topic-count">{{ itemCount(category) }}</span>
        </NuxtLink>
      </div>
    </section>

    <section v-if="visibleTags.length && moduleVisible('tags')" class="sidebar-section popular-tags-section" :style="moduleStyle('tags')">
      <div class="section-title">
        <h3>热门标签</h3>
        <TagIcon aria-hidden="true" />
      </div>
      <div class="popular-tags">
        <NuxtLink v-for="tag in visibleTags" :key="tag.slug" :to="`/tags/${tag.slug}`">
          {{ tag.name }}
          <span>{{ itemCount(tag) }}</span>
        </NuxtLink>
      </div>
    </section>

    <div v-if="slots['after-tags']" class="sidebar-extension" :style="extensionStyle('tags')">
      <slot name="after-tags" />
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  BookOpen as BookOpenIcon,
  Camera as CameraIcon,
  Clock3 as ClockIcon,
  Code2 as Code2Icon,
  Compass as CompassIcon,
  Leaf as LeafIcon,
  PenLine as PenLineIcon,
  Sparkles as SparklesIcon,
  Tag as TagIcon,
  TrendingUp as TrendingUpIcon
} from '@lucide/vue'
import type { Component } from 'vue'

type SidebarTaxonomy = {
  name: string
  slug: string
  _count?: {
    posts?: number
  }
}

type SidebarPost = {
  title: string
  slug: string
  cover?: string | null
  viewCount?: number | null
  publishedAt?: string | Date | null
  category?: {
    name: string
  } | null
}

type SidebarModuleKey = 'author' | 'featured' | 'categories' | 'tags'
type SidebarModuleSetting = { key: SidebarModuleKey, visible: boolean }

const props = withDefaults(defineProps<{
  siteName: string
  description?: string
  avatar?: string
  categories?: SidebarTaxonomy[]
  tags?: SidebarTaxonomy[]
  posts?: SidebarPost[]
}>(), {
  description: '个人博客',
  avatar: '',
  categories: () => [],
  tags: () => [],
  posts: () => []
})

const siteSettings = useSiteSettings()
const slots = useSlots()
const authorName = computed(() => siteSettings.value.sidebar_author_name.trim() || props.siteName)
const authorAvatar = computed(() => siteSettings.value.sidebar_author_avatar || props.avatar)
const authorDescription = computed(() => siteSettings.value.sidebar_author_description || props.description)
const authorSignature = computed(() => siteSettings.value.sidebar_author_signature.trim() || authorName.value)
const initial = computed(() => authorName.value.slice(0, 1).toUpperCase())
const subtitle = computed(() => siteSettings.value.sidebar_author_subtitle || (props.siteName.includes('(') ? 'Personal Blog' : '独立写作者'))
const sidebarModules = computed<SidebarModuleSetting[]>(() => parseSidebarModules(siteSettings.value.sidebar_modules))
const visibleCategories = computed(() => props.categories.slice(0, 5))
const visibleTags = computed(() => props.tags.slice(0, 8))
const visiblePosts = computed(() => props.posts.slice(0, 4))
const topicIcons: Component[] = [PenLineIcon, LeafIcon, Code2Icon, CameraIcon, SparklesIcon]
const topicTones = ['tone-blue', 'tone-green', 'tone-purple', 'tone-orange', 'tone-slate']

function parseSidebarModules(raw: string): SidebarModuleSetting[] {
  const defaults: SidebarModuleSetting[] = [
    { key: 'author', visible: true }, { key: 'featured', visible: true },
    { key: 'categories', visible: true }, { key: 'tags', visible: true }
  ]
  try {
    const parsed = JSON.parse(raw) as SidebarModuleSetting[]
    const valid = parsed.filter(item => defaults.some(candidate => candidate.key === item.key))
    for (const item of defaults) if (!valid.some(candidate => candidate.key === item.key)) valid.push(item)
    return valid
  } catch { return defaults }
}

function moduleVisible(key: SidebarModuleKey) {
  return sidebarModules.value.find(item => item.key === key)?.visible !== false
}

function moduleStyle(key: SidebarModuleKey) {
  return { order: (sidebarModules.value.findIndex(item => item.key === key) + 1) * 10 }
}

function extensionStyle(key: SidebarModuleKey) {
  return { order: Number(moduleStyle(key).order) + 1 }
}

function formatPostDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
}

function itemCount(item: SidebarTaxonomy) {
  return item._count?.posts || 0
}

function topicIcon(index: number) {
  return topicIcons[index % topicIcons.length]
}

function topicTone(index: number) {
  return topicTones[index % topicTones.length]
}

function coverWord(post: SidebarPost) {
  return (post.category?.name || post.title).slice(0, 2)
}
</script>

<style scoped>
.public-sidebar {
  display: grid;
  gap: 28px;
  color: var(--theme-text);
}

.sidebar-extension { display: grid; gap: 28px; }

.sidebar-author {
  --author-accent: #d4a373;
  position: relative;
  overflow: hidden;
  padding: 32px 26px 28px;
  border: 1px solid color-mix(in srgb, var(--theme-surface) 58%, var(--theme-border-soft));
  border-radius: 24px;
  background: color-mix(in srgb, var(--theme-surface) 95%, transparent);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 40px -10px rgb(var(--theme-shadow) / 7%);
  text-align: center;
  transition: box-shadow 400ms cubic-bezier(.4, 0, .2, 1), transform 400ms cubic-bezier(.4, 0, .2, 1);
}

.sidebar-author:hover {
  box-shadow: 0 20px 40px -10px rgb(var(--theme-shadow) / 12%);
  transform: translateY(-2px);
}

.author-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 128px;
  height: 128px;
  border-radius: 0 24px 0 100%;
  background: color-mix(in srgb, var(--author-accent) 13%, var(--theme-surface));
  opacity: .72;
  transition: opacity 400ms ease, transform 400ms ease;
  transform-origin: top right;
}

.sidebar-author:hover .author-glow {
  opacity: 1;
  transform: scale(1.1);
}

.author-content {
  position: relative;
  z-index: 1;
}

.author-avatar {
  display: grid;
  position: relative;
  width: 112px;
  height: 112px;
  margin: 2px auto 22px;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--author-accent) 22%, var(--theme-surface)), var(--theme-surface-muted));
  color: var(--theme-text);
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 38px;
  font-weight: 700;
  box-shadow: 0 12px 26px rgb(var(--theme-shadow) / 13%);
  animation: author-pulse 3s infinite;
}

.author-avatar img {
  width: 100%;
  height: 100%;
  border: 4px solid var(--theme-surface);
  border-radius: inherit;
  object-fit: cover;
}

.author-avatar i {
  position: absolute;
  right: 8px;
  bottom: 7px;
  width: 15px;
  height: 15px;
  border: 2px solid var(--theme-surface);
  border-radius: 999px;
  background: #4ade80;
}

.sidebar-author h2 {
  margin: 0 0 7px;
  color: var(--theme-text-strong);
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}

.sidebar-author strong {
  display: block;
  margin-bottom: 16px;
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sidebar-author p {
  margin: 0;
  color: var(--theme-text-muted);
  font-size: 14px;
  line-height: 1.7;
}

.author-signature {
  overflow: hidden;
  margin: 15px auto 0;
  color: color-mix(in srgb, var(--theme-text-muted) 78%, var(--author-accent));
  font-family: "Segoe Script", "Bradley Hand", "Kaiti SC", cursive;
  font-size: 25px;
  font-style: italic;
  line-height: 1.25;
  text-overflow: ellipsis;
  transform: rotate(-2deg);
  white-space: nowrap;
}

.author-links {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.author-links a {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-surface-muted) 88%, var(--theme-surface));
  color: var(--theme-text-muted);
  box-shadow: 0 4px 12px rgb(var(--theme-shadow) / 5%);
  transition: color 300ms ease, background 300ms ease, box-shadow 300ms ease, transform 300ms ease;
}

.author-links a:hover {
  background: var(--author-accent);
  color: #fff;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--author-accent) 28%, transparent);
  transform: translateY(-3px);
}

.author-links svg {
  width: 18px;
  height: 18px;
}

@keyframes author-pulse {
  0% { transform: scale(.97); box-shadow: 0 0 0 0 color-mix(in srgb, var(--author-accent) 38%, transparent), 0 12px 26px rgb(var(--theme-shadow) / 13%); }
  70% { transform: scale(1); box-shadow: 0 0 0 15px transparent, 0 12px 26px rgb(var(--theme-shadow) / 13%); }
  100% { transform: scale(.97); box-shadow: 0 0 0 0 transparent, 0 12px 26px rgb(var(--theme-shadow) / 13%); }
}

@media (prefers-reduced-motion: reduce) {
  .author-avatar { animation: none; }
}

.sidebar-section {
  display: grid;
  gap: 18px;
  padding: 26px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 24px;
  background: color-mix(in srgb, var(--theme-surface) 95%, transparent);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 40px -10px rgb(var(--theme-shadow) / 7%);
  transition: box-shadow 400ms cubic-bezier(.4, 0, .2, 1), transform 400ms cubic-bezier(.4, 0, .2, 1);
}

.sidebar-section:hover {
  box-shadow: 0 20px 40px -10px rgb(var(--theme-shadow) / 12%);
  transform: translateY(-2px);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-title h3 {
  margin: 0;
  color: var(--theme-text-strong);
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 18px;
  font-weight: 700;
}

.section-title > svg {
  width: 21px;
  height: 21px;
  color: var(--theme-text-faint);
}

.topic-list {
  display: grid;
  gap: 8px;
}

.topic-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 160ms ease, transform 160ms ease;
}

.topic-row:hover {
  background: var(--theme-surface-muted);
  transform: translateY(-1px);
}

.topic-icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  transition: background 160ms ease, box-shadow 160ms ease;
}

.topic-row:hover .topic-icon {
  box-shadow: 0 6px 14px rgb(var(--theme-shadow) / 14%);
}

.topic-icon svg {
  width: 17px;
  height: 17px;
}

.topic-name {
  overflow: hidden;
  color: var(--theme-text-soft);
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-row:hover .topic-name {
  color: var(--theme-text-strong);
}

.topic-count {
  min-width: 28px;
  border-radius: 999px;
  background: var(--theme-surface-muted);
  padding: 5px 8px;
  color: var(--theme-text-faint);
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}

.topic-row:hover .topic-count {
  background: var(--theme-surface);
  color: var(--theme-info);
}

.popular-tags-section {
  padding-bottom: 30px;
}

.popular-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.popular-tags a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  border: 1px solid color-mix(in srgb, var(--theme-border) 74%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-surface-muted) 70%, var(--theme-surface));
  padding: 0 15px;
  color: var(--theme-text-muted);
  font-size: 12px;
  font-weight: 650;
  box-shadow: 0 3px 10px rgb(var(--theme-shadow) / 4%);
  transition: background 300ms ease, border-color 300ms ease, color 300ms ease, box-shadow 300ms ease, transform 300ms ease;
}

.popular-tags a span {
  margin-left: 6px;
  opacity: .58;
  font-variant-numeric: tabular-nums;
}

.popular-tags a:hover {
  border-color: transparent;
  background: #d4a373;
  color: #fff;
  box-shadow: 0 8px 16px rgb(212 163 115 / 24%);
  transform: translateY(-3px);
}

:global(.dark) .topics-section,
:global(.dark) .popular-tags-section {
  border-color: #3a4860;
  background: linear-gradient(145deg, var(--theme-surface-raised), var(--theme-surface));
  box-shadow: 0 16px 38px rgb(0 0 0 / 18%), inset 0 1px 0 rgb(255 255 255 / 3%);
}

:global(.dark) .topic-row:hover {
  background: var(--theme-surface-hover);
}

:global(.dark) .topic-count {
  background: #202b40;
  color: var(--theme-text-muted);
}

:global(.dark) .popular-tags a {
  border-color: #526078;
  background: #202a3d;
  color: var(--theme-text-muted);
}

:global(.dark) .popular-tags a:hover {
  border-color: transparent;
  background: #d4a373;
  color: #fff;
}

.featured-section {
  gap: 20px;
}

.featured-link {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
}

.featured-thumb {
  display: grid;
  position: relative;
  width: 80px;
  height: 80px;
  place-items: center;
  overflow: hidden;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 17px;
  font-weight: 850;
}

.featured-thumb::after {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.1);
  content: "";
  transition: background 180ms ease;
}

.featured-link:hover .featured-thumb::after {
  background: transparent;
}

.featured-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 420ms ease;
}

.featured-link:hover .featured-thumb img {
  transform: scale(1.08);
}

.featured-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.featured-copy em {
  overflow: hidden;
  color: #d4a373;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.featured-copy strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.45;
  transition: color 160ms ease;
}

.featured-link:hover .featured-copy strong {
  color: #d4a373;
}

.featured-copy time {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--theme-text-faint);
  font-size: 11px;
}

.featured-copy time svg {
  width: 12px;
  height: 12px;
}

.tone-blue { background: var(--theme-accent-soft); color: var(--theme-info); }
.tone-green { background: var(--theme-success-soft); color: var(--theme-success); }
.tone-purple { background: var(--theme-purple-soft); color: #8b5cf6; }
.tone-orange { background: var(--theme-warning-soft); color: #f97316; }
.tone-slate { background: var(--theme-surface-muted); color: var(--theme-text-muted); }

.featured-thumb.tone-blue,
.featured-thumb.tone-green,
.featured-thumb.tone-purple,
.featured-thumb.tone-orange,
.featured-thumb.tone-slate {
  color: rgba(255, 255, 255, 0.86);
}

.featured-thumb.tone-blue { background: linear-gradient(135deg, #18345f, #1f5d91); }
.featured-thumb.tone-green { background: linear-gradient(135deg, #29462c, #4e7433); }
.featured-thumb.tone-purple { background: linear-gradient(135deg, #5c2348, #8b2f6a); }
.featured-thumb.tone-orange { background: linear-gradient(135deg, #5a3517, #9a5a1d); }
.featured-thumb.tone-slate { background: linear-gradient(135deg, var(--theme-text), #5d6470); }

:deep(.toc-card),
:deep(.info-card) {
  display: grid;
  gap: 12px;
  padding: 26px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 24px;
  background: color-mix(in srgb, var(--theme-surface) 95%, transparent);
  box-shadow: 0 10px 40px -10px rgb(var(--theme-shadow) / 7%);
  transition: box-shadow 400ms cubic-bezier(.4, 0, .2, 1), transform 400ms cubic-bezier(.4, 0, .2, 1);
}

:deep(.toc-card:hover),
:deep(.info-card:hover) {
  box-shadow: 0 20px 40px -10px rgb(var(--theme-shadow) / 12%);
  transform: translateY(-2px);
}

:deep(.toc-card h2),
:deep(.info-card h2) {
  margin: 0;
  color: var(--theme-text-strong);
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 18px;
  font-weight: 700;
}

:deep(.toc-list) {
  display: grid;
  gap: 9px;
}

:deep(.toc-list a),
:deep(.toc-card p),
:deep(.info-card p) {
  color: var(--theme-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .public-sidebar {
    gap: 20px;
  }

  .sidebar-author,
  .sidebar-section,
  :deep(.toc-card),
  :deep(.info-card) {
    padding: 22px;
  }
}
</style>
