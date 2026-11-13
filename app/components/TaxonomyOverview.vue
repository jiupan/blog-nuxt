<template>
  <div class="taxonomy-page" :class="{ 'is-tags': kind === 'tags' }">
    <header class="taxonomy-heading" data-page-enter style="--page-enter-order: 0">
      <h1>{{ data ? `查看不同领域的 ${items.length} 个${label}。` : `文章${label}` }}</h1>
      <nav class="taxonomy-stats" aria-label="内容索引">
        <NuxtLink
          v-for="stat in stats"
          :key="stat.to"
          :to="stat.to"
          :aria-label="stat.label"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path :d="stat.icon" fill="currentColor" fill-rule="evenodd" />
          </svg>
          <b>{{ stat.count ?? '—' }}</b>
          <span class="taxonomy-stat-tooltip" aria-hidden="true">{{ stat.label }}</span>
        </NuxtLink>
      </nav>
    </header>

    <div v-if="error" class="taxonomy-empty" role="alert">
      <UIcon name="i-lucide-cloud-alert" aria-hidden="true" />
      <h2>{{ label }}加载失败</h2>
      <p>请稍后重试。</p>
      <button type="button" :disabled="pending" @click="retry">{{ pending ? '正在加载…' : '重新加载' }}</button>
    </div>
    <div v-else-if="!items.length" class="taxonomy-empty">
      <UIcon :name="kind === 'categories' ? 'i-lucide-folder-open' : 'i-lucide-tags'" aria-hidden="true" />
      <h2>还没有{{ label }}</h2>
      <NuxtLink to="/archive">浏览全部文章</NuxtLink>
    </div>
    <div v-else class="taxonomy-grid" data-page-enter style="--page-enter-order: 1">
      <section v-for="item in items" :key="item.id" class="taxonomy-card" :aria-labelledby="`taxonomy-${item.id}`">
        <NuxtLink :to="itemPath(item.slug)" class="taxonomy-card-label" :aria-label="`浏览${label}「${item.name}」下的 ${item._count?.posts || 0} 篇文章`">
          <UIcon :name="kind === 'categories' ? resolveCategoryIcon(item.icon) : 'i-lucide-tag'" aria-hidden="true" />
          <h2 :id="`taxonomy-${item.id}`" :title="item.name">{{ item.name }}</h2>
          <span>{{ item._count?.posts || 0 }}<span class="sr-only"> 篇文章</span></span>
        </NuxtLink>
        <ul v-if="item.posts.length" class="taxonomy-posts">
          <li v-for="post in item.posts" :key="post.id">
            <NuxtLink :to="postPath(post.slug)" :title="post.title">{{ post.title }}</NuxtLink>
          </li>
        </ul>
        <p v-else class="taxonomy-no-posts">暂时没有已发布的文章</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import type { TaxonomyItem, TaxonomyOverviewPayload } from '~~/types/dto/taxonomy'
import { resolveCategoryIcon } from '~/utils/category-icons'
import { postPath } from '~/utils/post-path'

const props = defineProps<{ kind: 'categories' | 'tags' }>()
const label = props.kind === 'categories' ? '分类' : '标签'
const otherLabel = props.kind === 'categories' ? '标签' : '分类'
const otherPath = props.kind === 'categories' ? '/tags' : '/categories'
const settings = useSiteSettings()
const config = useRuntimeConfig()
const [{ data, error, pending, refresh }, { data: otherData, refresh: refreshOther }] = await Promise.all([
  useFetch<ApiResult<TaxonomyOverviewPayload>>(`/api/taxonomies/${props.kind}`),
  useFetch<ApiResult<TaxonomyItem[]>>(`/api${otherPath}`)
])
const items = computed(() => data.value?.data.items || [])
const siteName = computed(() => settings.value.site_title || config.public.siteName || 'Jiupan Blog')

const statIcons = {
  tags: 'M2 12 12 2l8.5 1.5L22 12 12 22 2 12Zm14-4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z',
  archive: 'M3 2h18v20H3V2Zm3 4v5h5V6H6Zm8 0v2h4V6h-4Zm0 3v2h4V9h-4Zm-8 4v2h12v-2H6Zm0 4v2h12v-2H6Z',
  categories: 'M6 3h6l2 2h9v13H6V3ZM1 7h3v13h15v2H1V7Z'
}
const stats = computed(() => [
  {
    to: `/${props.kind}`,
    icon: statIcons[props.kind],
    count: data.value ? items.value.length : undefined,
    label: data.value ? `全站共 ${items.value.length} 个${label}` : label
  },
  {
    to: '/archive',
    icon: statIcons.archive,
    count: data.value?.data.totalPosts,
    label: data.value ? `全站共 ${data.value.data.totalPosts} 篇文章` : '浏览全部文章'
  },
  {
    to: otherPath,
    icon: statIcons[props.kind === 'categories' ? 'tags' : 'categories'],
    count: otherData.value?.data.length,
    label: otherData.value ? `全站共 ${otherData.value.data.length} 个${otherLabel}` : `浏览全部${otherLabel}`
  }
])

function itemPath(slug: string) {
  return `/${props.kind}/${encodeURIComponent(slug)}`
}

async function retry() {
  await Promise.all([refresh(), refreshOther()])
}

useSeoMeta({
  title: () => `${label} - ${siteName.value}`,
  description: () => `按${label}浏览 ${siteName.value} 的文章。`
})
</script>

<style scoped>
.taxonomy-page {
  width: var(--site-content-width);
  min-height: 70vh;
  margin: 0 auto;
  padding: 64px 0 80px;
  color: var(--theme-text);
}
.taxonomy-heading { margin-bottom: 44px; }
.taxonomy-heading h1 {
  margin: 0 0 28px;
  font-size: clamp(30px, 3.6vw, 48px);
  font-weight: 850;
  line-height: 1.45;
  letter-spacing: -.045em;
  text-wrap: balance;
}
.taxonomy-stats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-surface);
  box-shadow: 0 8px 16px -4px rgb(var(--theme-shadow) / 5%);
}
.taxonomy-stats a {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 999px;
  transition: background-color .18s;
}
.taxonomy-stats svg { width: 20px; height: 20px; flex: none; color: var(--theme-accent); }
.taxonomy-stats b { font-size: 20px; font-weight: 800; line-height: 1; }
.taxonomy-stat-tooltip {
  position: absolute;
  z-index: 2;
  bottom: calc(100% + 11px);
  left: 50%;
  transform: translateX(-50%);
  visibility: hidden;
  padding: 7px 12px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-surface-raised);
  color: var(--theme-text);
  font-size: 14px;
  line-height: 1.4;
  white-space: nowrap;
  pointer-events: none;
}
.taxonomy-stats a:focus-visible { background: var(--theme-accent-soft); }
.taxonomy-stats a:focus-visible .taxonomy-stat-tooltip { visibility: visible; }
@media (hover: hover) {
  .taxonomy-stats a:hover { background: var(--theme-accent-soft); }
  .taxonomy-stats a:hover .taxonomy-stat-tooltip { visibility: visible; }
}
.taxonomy-grid { display: grid; gap: 12px; }
.taxonomy-card {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-surface);
}
.taxonomy-card-label {
  display: flex;
  min-width: 0;
  min-height: 106px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 14px 8px;
  border-radius: 10px;
  background: var(--theme-surface-muted);
  text-align: center;
  transition: color .18s, background-color .18s;
}
.taxonomy-card-label:hover { background: var(--theme-accent-soft); color: var(--theme-accent); }
.taxonomy-card-label > .iconify { width: 22px; height: 22px; color: var(--theme-accent); }
.taxonomy-card-label h2 {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  font-size: 16px;
  font-weight: 750;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.taxonomy-card-label > span:last-child { color: var(--theme-accent); font-size: 13px; }
.taxonomy-posts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: center;
  gap: 4px 24px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}
.taxonomy-posts li { display: flex; min-width: 0; align-items: center; gap: 8px; }
.taxonomy-posts li::before { width: 5px; height: 5px; flex: 0 0 5px; border-radius: 50%; background: var(--theme-accent); opacity: .45; content: ''; }
.taxonomy-posts a {
  display: block;
  min-width: 0;
  padding: 6px 0;
  overflow: hidden;
  color: var(--theme-text-soft);
  font-size: 15px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color .18s;
}
.taxonomy-posts a:hover { color: var(--theme-accent); }
.taxonomy-no-posts { align-self: center; color: var(--theme-text-muted); font-size: 14px; }
.is-tags .taxonomy-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.is-tags .taxonomy-card { grid-template-columns: 120px minmax(0, 1fr); }
.is-tags .taxonomy-posts { grid-template-columns: minmax(0, 1fr); gap: 4px; }
.taxonomy-empty { display: grid; min-height: 260px; justify-items: center; align-content: center; gap: 14px; border: 1px solid var(--theme-border); border-radius: 18px; background: var(--theme-surface); color: var(--theme-text-muted); }
.taxonomy-empty > .iconify { width: 32px; height: 32px; }
.taxonomy-empty h2, .taxonomy-empty p { margin: 0; }
.taxonomy-empty h2 { font-size: 18px; color: var(--theme-text); }
.taxonomy-empty a, .taxonomy-empty button { border: 0; border-radius: 999px; padding: 9px 18px; background: var(--theme-accent); color: var(--theme-accent-foreground); font: inherit; cursor: pointer; }
.taxonomy-page a:focus-visible, .taxonomy-page button:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 4px; }
@media (max-width: 980px) {
  .taxonomy-page { padding-top: 40px; }
  .is-tags .taxonomy-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .taxonomy-page { padding: 30px 0 48px; }
  .taxonomy-heading { margin-bottom: 26px; }
  .taxonomy-heading h1 { margin-bottom: 20px; font-size: 28px; }
  .taxonomy-stats { gap: 0; }
  .taxonomy-stats a { padding: 8px 10px; }
  .taxonomy-stats b { font-size: 17px; }
  .taxonomy-stats a:first-child .taxonomy-stat-tooltip { left: 0; transform: none; }
  .taxonomy-card, .is-tags .taxonomy-card { grid-template-columns: 100px minmax(0, 1fr); gap: 12px; padding: 10px; }
  .taxonomy-card-label { min-height: 94px; padding: 10px 7px; }
  .taxonomy-card-label h2 { font-size: 14px; }
  .taxonomy-posts { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .taxonomy-posts a { padding: 5px 0; font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) {
  .taxonomy-page a { transition: none; }
}
</style>
