<template>
  <article class="archive-item">
    <span class="archive-thumb" :class="!post.cover && coverFallbackClass(post.id)">
      <img v-if="post.cover" :src="post.cover" :alt="post.title" loading="lazy" decoding="async">
      <span v-else>{{ coverWord }}</span>
    </span>
    <div class="archive-copy">
      <span v-if="post.isPinned" class="archive-pinned">
        <PinIcon aria-hidden="true" />
        置顶
      </span>
      <h2>
        <NuxtLink :to="postPath(post.slug)" class="archive-post-link">{{ post.title }}</NuxtLink>
      </h2>
      <div class="archive-summary">
        <NuxtLink v-if="post.category" :to="categoryPath" class="archive-category-link">{{ post.category.name }}</NuxtLink>
        <span v-else class="archive-category-empty">未分类</span>
        <span class="archive-summary-separator">/</span>
        <span class="archive-summary-text">{{ post.summary || '这篇文章暂时没有摘要，点击阅读全文。' }}</span>
      </div>
      <div class="archive-footer">
        <div class="archive-tags" aria-label="文章标签">
          <NuxtLink v-for="tag in visibleTags" :key="tag.id" :to="tagPath(tag.slug)"># {{ tag.name }}</NuxtLink>
        </div>
        <div class="archive-meta">
          <span>
            <CalendarIcon aria-hidden="true" />
            {{ formattedDate }}
          </span>
          <span>
            <EyeIcon aria-hidden="true" />
            {{ formattedViews }}
          </span>
        </div>
      </div>
    </div>
    <span class="archive-arrow" aria-hidden="true">
      <ChevronRightIcon />
    </span>
  </article>
</template>

<script setup lang="ts">
import type { PostSummary } from '~~/types/dto/post'
import {
  Calendar as CalendarIcon,
  ChevronRight as ChevronRightIcon,
  Eye as EyeIcon,
  Pin as PinIcon
} from '@lucide/vue'

const props = defineProps<{
  post: PostSummary
}>()

const coverFallbackClasses = ['cover-pink', 'cover-blue', 'cover-green', 'cover-orange', 'cover-gray', 'cover-coral']
const coverFallbackClass = (id: number) => coverFallbackClasses[id % coverFallbackClasses.length]
const coverWord = computed(() => (props.post.category?.name || props.post.title).slice(0, 4))
const categoryPath = computed(() => props.post.category ? `/categories/${encodeURIComponent(props.post.category.slug)}` : '')
const visibleTags = computed(() => props.post.tags?.slice(0, 3) || [])
const tagPath = (slug: string) => `/tags/${encodeURIComponent(slug)}`
const formattedDate = computed(() => {
  if (!props.post.publishedAt) return '未设置'
  const date = new Date(props.post.publishedAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
})
const formattedViews = computed(() => {
  const views = props.post.viewCount || 0
  return views >= 1000 ? `${(views / 1000).toFixed(1).replace('.0', '')}k` : String(views)
})
</script>

<style scoped>
.archive-item {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
  min-height: 156px;
  min-width: 0;
  gap: 22px;
  align-items: center;
  overflow: hidden;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--theme-border) 68%, transparent);
  border-radius: 24px;
  background: var(--theme-surface);
  box-shadow: 0 4px 20px rgb(var(--theme-shadow) / 4%);
  content-visibility: auto;
  contain-intrinsic-size: auto 156px;
  transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease;
}

.archive-item:hover,
.archive-item:focus-within {
  border-color: color-mix(in srgb, var(--theme-accent) 34%, var(--theme-border));
  box-shadow: 0 10px 26px rgb(var(--theme-shadow) / 10%);
  transform: translateY(-2px) scale(1.002);
}

.archive-thumb {
  display: grid;
  flex: 0 0 176px;
  width: 176px;
  height: 132px;
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

.archive-item:hover .archive-thumb img,
.archive-item:focus-within .archive-thumb img { transform: scale(1.025); }

.cover-pink { background: linear-gradient(135deg, #5c2348, #8b2f6a); }
.cover-blue { background: linear-gradient(135deg, #18345f, #1f5d91); }
.cover-green { background: linear-gradient(135deg, #29462c, #4e7433); }
.cover-orange { background: linear-gradient(135deg, #5a3517, #9a5a1d); }
.cover-gray { background: linear-gradient(135deg, var(--theme-text), #5d6470); }
.cover-coral { background: linear-gradient(135deg, #68312e, #a9463e); }

.archive-copy { flex: 1 1 auto; min-width: 0; }

.archive-pinned {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  padding: 3px 8px;
  border: 1px solid color-mix(in srgb, var(--theme-warning) 28%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-warning) 11%, var(--theme-surface));
  color: var(--theme-warning);
  font-size: 11px;
  font-weight: 850;
  line-height: 1;
}

.archive-pinned svg {
  width: 11px;
  height: 11px;
  fill: color-mix(in srgb, var(--theme-warning) 18%, transparent);
}

.archive-copy h2 {
  overflow: hidden;
  margin: 0;
  color: var(--theme-text);
  font-size: 20px;
  font-weight: 850;
  line-height: 1.4;
  text-overflow: ellipsis;
  transition: color 180ms ease;
  white-space: nowrap;
}

.archive-post-link::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  content: "";
}

.archive-post-link:focus-visible { outline: none; }

.archive-item:hover .archive-copy h2,
.archive-item:focus-within .archive-copy h2 { color: var(--theme-accent); }

.archive-summary {
  display: -webkit-box;
  overflow: hidden;
  margin: 10px 0 0;
  color: var(--theme-text-muted);
  font-size: 14px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.archive-category-link,
.archive-tags a {
  position: relative;
  z-index: 2;
  transition: color 180ms ease;
}

.archive-category-link::after,
.archive-tags a::after {
  position: absolute;
  right: 50%;
  bottom: 0;
  left: 50%;
  height: 1px;
  border-radius: 999px;
  background: currentColor;
  content: "";
  transition: right 180ms ease, left 180ms ease;
}

.archive-category-link,
.archive-category-empty { color: var(--theme-text-soft); font-weight: 700; }
.archive-summary-separator { margin: 0 7px; color: var(--theme-text-faint); }

.archive-category-link:hover,
.archive-category-link:focus-visible,
.archive-tags a:hover,
.archive-tags a:focus-visible {
  color: var(--theme-accent);
  outline: none;
}

.archive-category-link:hover::after,
.archive-category-link:focus-visible::after,
.archive-tags a:hover::after,
.archive-tags a:focus-visible::after {
  right: 0;
  left: 0;
}

.archive-footer {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
}

.archive-tags {
  display: flex;
  min-width: 0;
  gap: 10px;
  overflow: hidden;
  color: var(--theme-text-faint);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.archive-tags a {
  overflow: hidden;
  text-overflow: ellipsis;
}

.archive-meta {
  display: flex;
  flex: 0 0 auto;
  gap: 16px;
  align-items: center;
  color: var(--theme-text-faint);
  font-size: 12px;
  font-weight: 500;
}

.archive-meta span {
  display: inline-flex;
  gap: 5px;
  align-items: center;
}

.archive-meta svg { width: 14px; height: 14px; }

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

.archive-item:hover .archive-arrow,
.archive-item:focus-within .archive-arrow {
  background: color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface));
  color: var(--theme-accent);
  transform: translateX(2px);
}

@media (max-width: 640px) {
  .archive-item {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    min-height: 106px;
    gap: 14px;
    border-radius: 18px;
    padding: 9px;
    contain-intrinsic-size: auto 106px;
  }
  .archive-thumb { width: 104px; height: 88px; border-radius: 13px; font-size: 17px; }
  .archive-copy h2 { font-size: 16px; }
  .archive-summary { margin-top: 6px; font-size: 12px; }
  .archive-footer { gap: 8px; margin-top: 7px; }
  .archive-tags { gap: 6px; font-size: 10px; }
  .archive-tags a:nth-child(n + 2) { display: none; }
  .archive-meta { gap: 10px; font-size: 10px; }
  .archive-meta span:last-child { display: none; }
  .archive-meta svg { width: 12px; height: 12px; }
  .archive-arrow { display: none; }
}

@media (max-width: 420px) {
  .archive-item { grid-template-columns: 86px minmax(0, 1fr); gap: 11px; }
  .archive-thumb { width: 86px; height: 78px; }
  .archive-summary-text,
  .archive-summary-separator { display: none; }
  .archive-pinned { margin-bottom: 4px; padding: 2px 6px; font-size: 10px; }
  .archive-copy h2 {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
  }
}
</style>
