<template>
  <aside class="public-sidebar" aria-label="侧边栏">
    <section class="sidebar-author">
      <span class="author-glow" aria-hidden="true"></span>
      <div class="author-content">
        <div class="author-avatar">
          <img v-if="avatar" :src="avatar" :alt="siteName">
          <span v-else>{{ initial }}</span>
          <i aria-hidden="true"></i>
        </div>
        <h2>{{ siteName }}</h2>
        <strong>{{ subtitle }}</strong>
        <p>{{ description }}</p>
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

    <slot name="after-author" />

    <section v-if="visiblePosts.length" class="sidebar-section featured-section">
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
        </span>
      </NuxtLink>
    </section>

    <section v-if="visibleCategories.length" class="sidebar-section">
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

    <section v-if="visibleTags.length" class="sidebar-section popular-tags-section">
      <div class="section-title">
        <h3>热门标签</h3>
        <TagIcon aria-hidden="true" />
      </div>
      <div class="popular-tags">
        <NuxtLink v-for="tag in visibleTags" :key="tag.slug" :to="`/tags/${tag.slug}`">
          #{{ tag.name }}
        </NuxtLink>
      </div>
    </section>

    <slot name="after-tags" />
  </aside>
</template>

<script setup lang="ts">
import {
  BookOpen as BookOpenIcon,
  Camera as CameraIcon,
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
  category?: {
    name: string
  } | null
}

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

const initial = computed(() => props.siteName.slice(0, 1).toUpperCase())
const subtitle = computed(() => props.siteName.includes('(') ? 'Personal Blog' : '独立写作者')
const visibleCategories = computed(() => props.categories.slice(0, 5))
const visibleTags = computed(() => props.tags.slice(0, 8))
const visiblePosts = computed(() => props.posts.slice(0, 4))
const topicIcons: Component[] = [PenLineIcon, LeafIcon, Code2Icon, CameraIcon, SparklesIcon]
const topicTones = ['tone-blue', 'tone-green', 'tone-purple', 'tone-orange', 'tone-slate']

function formatViews(value?: number) {
  return (value || 0).toLocaleString('en-US')
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
  color: #303946;
}

.sidebar-author {
  position: relative;
  overflow: hidden;
  padding: 30px 26px;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 36px rgb(15 23 42 / 5%);
  text-align: center;
}

.author-glow {
  position: absolute;
  top: -44px;
  right: -42px;
  width: 150px;
  height: 150px;
  border-radius: 999px;
  background: #f4f6f8;
  filter: blur(26px);
  opacity: 0.88;
  transition: opacity 240ms ease, transform 240ms ease;
}

.sidebar-author:hover .author-glow {
  opacity: 1;
  transform: scale(1.08);
}

.author-content {
  position: relative;
  z-index: 1;
}

.author-avatar {
  display: grid;
  position: relative;
  width: 96px;
  height: 96px;
  margin: 0 auto 20px;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #e5eaf0, #f8fafc);
  color: #29313d;
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 34px;
  font-weight: 700;
  box-shadow: 0 12px 24px rgb(15 23 42 / 10%);
}

.author-avatar img {
  width: 100%;
  height: 100%;
  border: 4px solid #fff;
  border-radius: inherit;
  object-fit: cover;
}

.author-avatar i {
  position: absolute;
  right: 8px;
  bottom: 7px;
  width: 15px;
  height: 15px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #4ade80;
}

.sidebar-author h2 {
  margin: 0 0 6px;
  color: #172033;
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}

.sidebar-author strong {
  display: block;
  margin-bottom: 14px;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sidebar-author p {
  margin: 0;
  color: #667385;
  font-size: 14px;
  line-height: 1.7;
}

.author-links {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
}

.author-links a {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 999px;
  background: #f6f8fa;
  color: #64748b;
  transition: color 160ms ease, background 160ms ease, transform 160ms ease;
}

.author-links a:hover {
  background: #0f172a;
  color: #fff;
  transform: translateY(-2px) scale(1.04);
}

.author-links svg {
  width: 18px;
  height: 18px;
}

.sidebar-section {
  display: grid;
  gap: 18px;
  padding: 26px;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 36px rgb(15 23 42 / 5%);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.section-title h3 {
  margin: 0;
  color: #172033;
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 18px;
  font-weight: 700;
}

.section-title > svg {
  width: 21px;
  height: 21px;
  color: #9aa5b1;
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
  background: #f4f6f8;
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
  background: #fff;
  box-shadow: 0 6px 14px rgb(15 23 42 / 6%);
}

.topic-icon svg {
  width: 17px;
  height: 17px;
}

.topic-name {
  overflow: hidden;
  color: #495566;
  font-size: 14px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topic-row:hover .topic-name {
  color: #172033;
}

.topic-count {
  min-width: 28px;
  border-radius: 999px;
  background: #f6f8fa;
  padding: 5px 8px;
  color: #9aa5b1;
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}

.topic-row:hover .topic-count {
  background: #fff;
  color: #3b82f6;
}

.popular-tags-section {
  padding-bottom: 30px;
}

.popular-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.popular-tags a {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  border: 1px solid #edf1f5;
  border-radius: 999px;
  background: #f8fafc;
  padding: 0 18px;
  color: #536170;
  font-size: 14px;
  font-weight: 700;
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 2%);
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.popular-tags a:hover {
  border-color: #d8e0e8;
  background: #fff;
  color: #172033;
  transform: translateY(-1px);
}

.featured-section {
  gap: 20px;
}

.featured-link {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.featured-thumb {
  display: grid;
  position: relative;
  width: 78px;
  height: 56px;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
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
  gap: 4px;
  min-width: 0;
}

.featured-copy em {
  overflow: hidden;
  color: #3b82f6;
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
  color: #303946;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.45;
  transition: color 160ms ease;
}

.featured-link:hover .featured-copy strong {
  color: #3b82f6;
}

.tone-blue { background: #eff6ff; color: #3b82f6; }
.tone-green { background: #ecfdf5; color: #10b981; }
.tone-purple { background: #f5f3ff; color: #8b5cf6; }
.tone-orange { background: #fff7ed; color: #f97316; }
.tone-slate { background: #f1f5f9; color: #64748b; }

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
.featured-thumb.tone-slate { background: linear-gradient(135deg, #343941, #5d6470); }

:deep(.toc-card),
:deep(.info-card) {
  display: grid;
  gap: 12px;
  padding: 26px;
  border: 1px solid #eef1f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 36px rgb(15 23 42 / 5%);
}

:deep(.toc-card h2),
:deep(.info-card h2) {
  margin: 0;
  color: #172033;
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
  color: #667385;
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
