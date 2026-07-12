<template>
  <div class="collection-page">
    <section class="collection-shell">
      <div class="collection-layout">
        <main class="collection-main">
          <header class="collection-heading">
            <div class="collection-kicker">
              <UIcon :name="kind === 'category' ? currentTaxonomy?.icon || 'i-lucide-folder' : 'i-lucide-tag'" class="size-4" />
              <span>{{ kindLabel }}</span>
            </div>
            <h1>{{ currentTaxonomy?.name || slug }}</h1>
            <p>
              <template v-if="total">这里收录了 {{ total }} 篇与“{{ currentTaxonomy?.name || slug }}”相关的文章。</template>
              <template v-else>这里暂时还没有已发布的文章。</template>
            </p>
          </header>

          <div v-if="posts.length" class="collection-list">
            <NuxtLink v-for="post in posts" :key="post.id" :to="postPath(post.slug)" class="collection-item">
              <span class="collection-thumb" :class="!post.cover && coverFallbackClass(post.id)">
                <img v-if="post.cover" :src="post.cover" :alt="post.title" loading="lazy">
                <span v-else>{{ coverWord(post) }}</span>
              </span>
              <div class="collection-copy">
                <div class="collection-title-row">
                  <h2>{{ post.title }}</h2>
                  <span v-if="post.isPinned" class="pin-badge"><UIcon name="i-lucide-pin" class="size-3" />置顶</span>
                </div>
                <p><strong>{{ post.category?.name || '未分类' }}</strong><span>/</span>{{ post.summary || '这篇文章暂时没有摘要，点击阅读全文。' }}</p>
                <div class="collection-meta">
                  <span>
                    <UIcon name="i-lucide-calendar" />
                    {{ formatDate(post.publishedAt) }}
                  </span>
                  <span>
                    <UIcon name="i-lucide-eye" />
                    {{ formatViews(post.viewCount) }}
                  </span>
                </div>
              </div>
              <span class="collection-arrow" aria-hidden="true"><UIcon name="i-lucide-chevron-right" /></span>
            </NuxtLink>
          </div>

          <div v-else class="collection-empty">
            <span><UIcon :name="kind === 'category' ? 'i-lucide-folder-open' : 'i-lucide-tags'" class="size-7" /></span>
            <strong>暂无相关文章</strong>
            <p>可以浏览其他{{ kind === 'category' ? '分类' : '标签' }}，或者返回全部文章。</p>
            <NuxtLink to="/posts">浏览全部文章</NuxtLink>
          </div>

          <nav v-if="totalPages > 1" class="collection-pager" aria-label="文章分页">
            <button type="button" class="page-dot" :disabled="currentPage <= 1" aria-label="上一页" @click="goToPage(currentPage - 1)">
              <UIcon name="i-lucide-chevron-left" />
            </button>
            <template v-for="item in visiblePageItems" :key="item.key">
              <span v-if="item.page === null" class="page-ellipsis" aria-hidden="true">…</span>
              <button
                v-else
                type="button"
                class="page-dot"
                :class="{ 'is-active': item.page === currentPage }"
                :aria-current="item.page === currentPage ? 'page' : undefined"
                @click="goToPage(item.page)"
              >{{ item.page }}</button>
            </template>
            <button type="button" class="page-dot" :disabled="currentPage >= totalPages" aria-label="下一页" @click="goToPage(currentPage + 1)">
              <UIcon name="i-lucide-chevron-right" />
            </button>
          </nav>
        </main>

        <PublicSidebar
          class="collection-sidebar"
          :site-name="siteName"
          :description="siteSettings.sidebar_description"
          :categories="categories"
          :tags="tags"
          :posts="posts"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult, PublicPostListPayload } from '~~/types/api'
import type { PostSummary } from '~~/types/dto/post'
import type { TaxonomyItem } from '~~/types/dto/taxonomy'

const props = defineProps<{
  kind: 'category' | 'tag'
  slug: string
}>()

const pageSize = 6
const currentPage = ref(1)
const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const query = computed(() => ({
  page: currentPage.value,
  pageSize,
  category: props.kind === 'category' ? props.slug : undefined,
  tag: props.kind === 'tag' ? props.slug : undefined
}))

const [{ data }, { data: categoryData }, { data: tagData }] = await Promise.all([
  useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query }),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/tags')
])

const posts = computed(() => data.value?.data.items || [])
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const visiblePageItems = computed(() => {
  const pages = totalPages.value
  if (pages <= 5) return Array.from({ length: pages }, (_, index) => ({ key: `page-${index + 1}`, page: index + 1 }))
  const visible = new Set([1, pages, currentPage.value - 1, currentPage.value, currentPage.value + 1])
  const sorted = [...visible].filter(page => page >= 1 && page <= pages).sort((a, b) => a - b)
  const items: Array<{ key: string, page: number | null }> = []
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1]
    if (previous !== undefined && page - previous > 1) items.push({ key: `ellipsis-${previous}-${page}`, page: null })
    items.push({ key: `page-${page}`, page })
  })
  return items
})
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const currentTaxonomy = computed(() => {
  const source = props.kind === 'category' ? categories.value : tags.value
  return source.find(item => item.slug === props.slug)
})
const kindLabel = computed(() => props.kind === 'category' ? '文章分类' : '文章标签')
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')

useSeoMeta({
  title: () => `${currentTaxonomy.value?.name || props.slug} - ${props.kind === 'category' ? '分类' : '标签'}`,
  description: () => `浏览${siteName.value}中${props.kind === 'category' ? '分类' : '标签'}“${currentTaxonomy.value?.name || props.slug}”下的文章。`
})

watch(() => [props.kind, props.slug], () => {
  currentPage.value = 1
})

function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatDate(value?: string | Date | null) {
  if (!value) return '未设置'
  const date = new Date(value)
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`
}

function formatViews(value?: number | null) {
  const views = value || 0
  return views >= 1000 ? `${(views / 1000).toFixed(1).replace('.0', '')}k` : String(views)
}

const coverFallbackClasses = ['cover-pink', 'cover-blue', 'cover-green', 'cover-orange', 'cover-gray', 'cover-coral']

function coverFallbackClass(id: number) {
  return coverFallbackClasses[id % coverFallbackClasses.length]
}

function coverWord(post: PostSummary) {
  return (post.category?.name || post.title).slice(0, 4)
}
</script>

<style scoped>
.collection-page { min-height: 100vh; color: var(--theme-text); }
.collection-shell { width: min(100% - 32px, 1290px); margin: 0 auto; padding: 56px 0 88px; }
.collection-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; align-items: start; }
.collection-main { min-width: 0; padding-right: 8px; }
.collection-heading { margin-bottom: 44px; border-bottom: 1px solid var(--theme-border); padding-bottom: 34px; }
.collection-kicker { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 14px; border-radius: 999px; background: var(--theme-success-soft); color: #647e73; padding: 7px 11px; font-size: 12px; font-weight: 850; letter-spacing: .04em; }
.collection-heading h1 { margin: 0; color: var(--theme-text); font-family: Georgia, "Times New Roman", "Noto Serif SC", serif; font-size: clamp(42px, 7vw, 56px); font-weight: 650; line-height: 1.1; }
.collection-heading p { margin: 16px 0 0; color: var(--theme-text-muted); font-size: 16px; line-height: 1.75; }
.collection-list { display: grid; min-width: 0; gap: 14px; }
.collection-item { display: flex; width: 100%; max-width: 100%; min-width: 0; gap: 22px; align-items: center; overflow: hidden; border: 1px solid color-mix(in srgb, var(--theme-border) 68%, transparent); border-radius: 24px; background: var(--theme-surface); padding: 12px; box-shadow: 0 4px 20px rgb(var(--theme-shadow) / 4%); transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease; }
.collection-item:hover { border-color: color-mix(in srgb, var(--theme-accent) 34%, var(--theme-border)); box-shadow: 0 15px 34px rgb(var(--theme-shadow) / 13%); transform: translateY(-4px) scale(1.005); }
.collection-thumb { display: grid; width: 160px; height: 120px; flex: 0 0 160px; place-items: center; overflow: hidden; border-radius: 16px; background: var(--theme-text); color: rgb(255 255 255 / 72%); font-size: 23px; font-weight: 900; box-shadow: 0 10px 24px rgb(var(--theme-shadow) / 8%); }
.collection-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 420ms ease; }
.collection-item:hover .collection-thumb img { transform: scale(1.05); }
.cover-pink { background: linear-gradient(135deg, #5c2348, #8b2f6a); }.cover-blue { background: linear-gradient(135deg, #18345f, #1f5d91); }.cover-green { background: linear-gradient(135deg, #29462c, #4e7433); }.cover-orange { background: linear-gradient(135deg, #5a3517, #9a5a1d); }.cover-gray { background: linear-gradient(135deg, var(--theme-text), #5d6470); }.cover-coral { background: linear-gradient(135deg, #68312e, #a9463e); }
.collection-copy { flex: 1 1 auto; min-width: 0; }
.collection-title-row { display: flex; min-width: 0; align-items: center; gap: 10px; }
.collection-copy h2 { overflow: hidden; margin: 0; color: var(--theme-text); font-size: 20px; font-weight: 850; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; transition: color 180ms ease; }
.collection-item:hover .collection-copy h2 { color: var(--theme-accent); }
.pin-badge { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; border: 1px solid #fde68a; border-radius: 999px; background: var(--theme-warning-soft); color: var(--theme-warning); padding: 4px 7px; font-size: 10px; font-weight: 850; }
.collection-copy > p { overflow: hidden; margin: 10px 0 0; color: var(--theme-text-muted); font-size: 14px; line-height: 1.6; text-overflow: ellipsis; white-space: nowrap; }
.collection-copy > p strong { color: var(--theme-text-soft); }
.collection-copy > p span { margin: 0 7px; color: var(--theme-text-faint); }
.collection-meta { display: flex; gap: 16px; align-items: center; margin-top: 12px; color: var(--theme-text-faint); font-size: 12px; font-weight: 750; }
.collection-meta > span { display: inline-flex; gap: 5px; align-items: center; }
.collection-meta svg { width: 14px; height: 14px; }
.collection-arrow { display: grid; width: 40px; height: 40px; flex: 0 0 40px; place-items: center; margin-right: 4px; border-radius: 999px; background: var(--theme-surface-muted); color: var(--theme-text-faint); transition: color 180ms ease, background-color 180ms ease, transform 180ms ease; }
.collection-arrow svg { width: 20px; height: 20px; }
.collection-item:hover .collection-arrow { background: color-mix(in srgb, var(--theme-accent) 12%, var(--theme-surface)); color: var(--theme-accent); transform: translateX(3px); }
.collection-pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 16px 0 0; }
.page-dot { display: grid; width: 38px; height: 38px; place-items: center; border: 1px solid var(--theme-border-soft); border-radius: 999px; background: var(--theme-surface); color: var(--theme-text-soft); font-weight: 800; cursor: pointer; transition: border-color 180ms ease, box-shadow 180ms ease; }
.page-dot svg { width: 16px; height: 16px; }
.page-dot:hover:not(:disabled):not(.is-active) { border-color: #4964f4; }
.page-dot:disabled { opacity: .4; cursor: default; }
.page-dot.is-active { background: #4964f4; color: white; }
.page-ellipsis { display: grid; width: 22px; height: 38px; place-items: center; color: #9097a5; font-size: 15px; font-weight: 800; user-select: none; }
.collection-empty { display: grid; min-height: 340px; place-items: center; align-content: center; gap: 9px; border: 1px solid var(--theme-border); border-radius: 20px; background: color-mix(in srgb, var(--theme-surface) 76%, transparent); color: var(--theme-text-muted); text-align: center; padding: 44px; }
.collection-empty > span { display: grid; width: 58px; height: 58px; place-items: center; border-radius: 18px; background: #eef2f4; color: var(--theme-text-muted); }.collection-empty strong { color: var(--theme-text); font-size: 18px; }.collection-empty p { margin: 0; font-size: 13px; }.collection-empty a { margin-top: 8px; border-radius: 999px; background: var(--theme-text); color: #fff; padding: 9px 16px; font-size: 12px; font-weight: 800; }
.collection-sidebar { position: sticky; top: 84px; display: grid; gap: 10px; }
@media (max-width: 980px) { .collection-layout { grid-template-columns: 1fr; }.collection-sidebar { position: static; } }
@media (max-width: 640px) { .collection-shell { width: min(100% - 20px, 1290px); padding: 34px 0 60px; }.collection-heading { margin-bottom: 24px; padding: 0 10px 26px; }.collection-heading h1 { font-size: 38px; }.collection-item { display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 14px; border-radius: 18px; padding: 9px; }.collection-thumb { width: 104px; height: 88px; border-radius: 13px; font-size: 17px; }.collection-copy h2 { font-size: 16px; }.collection-copy > p { margin-top: 6px; font-size: 12px; }.collection-meta { gap: 10px; margin-top: 7px; font-size: 10px; }.collection-meta svg { width: 12px; height: 12px; }.collection-arrow { display: none; }.pin-badge { padding: 3px 6px; }.collection-empty { min-height: 280px; padding: 28px 18px; } }
@media (max-width: 420px) { .collection-item { grid-template-columns: 86px minmax(0, 1fr); gap: 11px; }.collection-thumb { width: 86px; height: 78px; }.collection-copy > p { display: none; }.collection-copy h2 { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; white-space: normal; }.pin-badge { display: none; } }
</style>
