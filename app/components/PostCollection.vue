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
              <div class="collection-date-col">
                <time>{{ formatDate(post.publishedAt) }}</time>
                <span class="collection-thumb" :class="!post.cover && coverFallbackClass(post.id)">
                  <img v-if="post.cover" :src="post.cover" :alt="post.title" loading="lazy">
                  <span v-else>{{ coverWord(post) }}</span>
                </span>
              </div>
              <div class="collection-copy">
                <div class="collection-title-row">
                  <h2>{{ post.title }}</h2>
                  <span v-if="post.isPinned" class="pin-badge"><UIcon name="i-lucide-pin" class="size-3" />置顶</span>
                </div>
                <p>{{ post.summary || '这篇文章暂时没有摘要，点击阅读全文。' }}</p>
                <div class="collection-meta">
                  <span class="meta-details">
                    <span class="category-chip">{{ post.category?.name || '未分类' }}</span>
                    <span><UIcon name="i-lucide-eye" class="size-3.5" />{{ post.viewCount || 0 }} 次阅读</span>
                    <span v-for="tag in post.tags?.slice(0, 3)" :key="tag.id" class="tag-chip"># {{ tag.name }}</span>
                  </span>
                  <span class="read-more">阅读全文 <UIcon name="i-lucide-arrow-right" class="size-4" /></span>
                </div>
              </div>
            </NuxtLink>
          </div>

          <div v-else class="collection-empty">
            <span><UIcon :name="kind === 'category' ? 'i-lucide-folder-open' : 'i-lucide-tags'" class="size-7" /></span>
            <strong>暂无相关文章</strong>
            <p>可以浏览其他{{ kind === 'category' ? '分类' : '标签' }}，或者返回全部文章。</p>
            <NuxtLink to="/posts">浏览全部文章</NuxtLink>
          </div>

          <nav v-if="totalPages > 1" class="collection-pager" aria-label="文章分页">
            <button type="button" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">← 上一页</button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button type="button" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一页 →</button>
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
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
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
.collection-page { min-height: 100vh; color: #303137; }
.collection-shell { width: min(100% - 32px, 1290px); margin: 0 auto; padding: 56px 0 88px; }
.collection-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 36px; align-items: start; }
.collection-main { min-width: 0; padding-right: 8px; }
.collection-heading { margin-bottom: 44px; border-bottom: 1px solid #dbe2ea; padding-bottom: 34px; }
.collection-kicker { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 14px; border-radius: 999px; background: #eef4f0; color: #647e73; padding: 7px 11px; font-size: 12px; font-weight: 850; letter-spacing: .04em; }
.collection-heading h1 { margin: 0; color: #24313d; font-family: Georgia, "Times New Roman", "Noto Serif SC", serif; font-size: clamp(42px, 7vw, 56px); font-weight: 650; line-height: 1.1; }
.collection-heading p { margin: 16px 0 0; color: #697583; font-size: 16px; line-height: 1.75; }
.collection-list { display: grid; }
.collection-item { display: grid; position: relative; grid-template-columns: 128px minmax(0, 1fr); gap: 36px; align-items: start; border: 1px solid transparent; border-radius: 28px; padding: 30px 30px 34px; transition: background-color 220ms ease, border-color 220ms ease, box-shadow 220ms ease, transform 220ms ease; }
.collection-item::after { position: absolute; right: 30px; bottom: -1px; left: 158px; height: 1px; background: rgb(219 226 234 / 75%); content: ""; }
.collection-item:last-child::after { display: none; }
.collection-item:hover { border-color: rgb(226 232 240 / 90%); background: rgb(255 255 255 / 82%); box-shadow: 0 22px 44px rgb(38 50 56 / 6%); transform: translateY(-3px); }
.collection-item:hover::after { opacity: 0; }
.collection-date-col { display: grid; min-width: 0; align-content: start; gap: 16px; }
.collection-date-col time { padding-top: 7px; color: #9aa4ae; font-family: "SFMono-Regular", Consolas, monospace; font-size: 13px; font-weight: 750; letter-spacing: .04em; }
.collection-thumb { display: grid; width: 128px; aspect-ratio: 16 / 9; place-items: center; overflow: hidden; border-radius: 8px; background: #343941; color: rgb(255 255 255 / 72%); font-size: 18px; font-weight: 900; box-shadow: 0 10px 24px rgb(38 50 56 / 8%); }
.collection-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 420ms ease; }
.collection-item:hover .collection-thumb img { transform: scale(1.05); }
.cover-pink { background: linear-gradient(135deg, #5c2348, #8b2f6a); }.cover-blue { background: linear-gradient(135deg, #18345f, #1f5d91); }.cover-green { background: linear-gradient(135deg, #29462c, #4e7433); }.cover-orange { background: linear-gradient(135deg, #5a3517, #9a5a1d); }.cover-gray { background: linear-gradient(135deg, #343941, #5d6470); }.cover-coral { background: linear-gradient(135deg, #68312e, #a9463e); }
.collection-title-row { display: flex; align-items: flex-start; gap: 10px; }
.collection-copy h2 { margin: 0; color: #24313d; font-family: Georgia, "Times New Roman", "Noto Serif SC", serif; font-size: clamp(24px, 3vw, 30px); font-weight: 650; line-height: 1.45; }
.pin-badge { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; margin-top: 8px; border: 1px solid #fde68a; border-radius: 999px; background: #fffbeb; color: #b45309; padding: 4px 7px; font-size: 10px; font-weight: 850; }
.collection-copy > p { display: -webkit-box; overflow: hidden; margin: 16px 0 0; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: #697583; font-size: 15px; line-height: 1.9; }
.collection-meta { display: flex; position: relative; align-items: center; justify-content: space-between; gap: 18px; margin-top: 20px; color: #9aa4ae; font-size: 12px; font-weight: 750; }
.meta-details { display: flex; min-width: 0; flex-wrap: wrap; align-items: center; gap: 9px 14px; padding-right: 105px; }
.meta-details > span { display: inline-flex; align-items: center; gap: 5px; }
.category-chip { border-radius: 999px; background: rgb(244 246 248 / 90%); padding: 6px 10px; }
.tag-chip { color: #81909d; }
.read-more { position: absolute; right: 0; display: inline-flex; align-items: center; gap: 6px; color: #738392; opacity: 0; transform: translateX(-12px); transition: opacity 220ms ease, transform 220ms ease; }
.collection-item:hover .read-more { opacity: 1; transform: translateX(0); }
.collection-pager { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 18px; margin-top: 62px; border-top: 1px solid #dbe2ea; padding-top: 28px; color: #9aa4ae; font-size: 14px; font-weight: 750; }
.collection-pager button { border: 0; background: transparent; color: #5f6874; font: inherit; cursor: pointer; }.collection-pager button:first-child { justify-self: start; }.collection-pager button:last-child { justify-self: end; }.collection-pager button:disabled { opacity: .42; cursor: default; }
.collection-empty { display: grid; min-height: 340px; place-items: center; align-content: center; gap: 9px; border: 1px solid #dbe2ea; border-radius: 20px; background: rgb(255 255 255 / 76%); color: #7d8792; text-align: center; padding: 44px; }
.collection-empty > span { display: grid; width: 58px; height: 58px; place-items: center; border-radius: 18px; background: #eef2f4; color: #738392; }.collection-empty strong { color: #33404c; font-size: 18px; }.collection-empty p { margin: 0; font-size: 13px; }.collection-empty a { margin-top: 8px; border-radius: 999px; background: #24313d; color: #fff; padding: 9px 16px; font-size: 12px; font-weight: 800; }
.collection-sidebar { position: sticky; top: 84px; display: grid; gap: 10px; }
@media (max-width: 980px) { .collection-layout { grid-template-columns: 1fr; }.collection-sidebar { position: static; } }
@media (max-width: 640px) { .collection-shell { width: min(100% - 20px, 1290px); padding: 34px 0 60px; }.collection-heading { margin-bottom: 24px; padding: 0 10px 26px; }.collection-heading h1 { font-size: 38px; }.collection-item { grid-template-columns: 92px minmax(0, 1fr); gap: 16px; border-radius: 18px; padding: 20px 10px 24px; }.collection-item::after { right: 10px; left: 118px; }.collection-thumb { width: 92px; }.collection-date-col time { font-size: 11px; }.collection-copy h2 { font-size: 21px; }.collection-copy > p { margin-top: 10px; font-size: 13px; line-height: 1.7; }.collection-meta { margin-top: 13px; }.meta-details { padding-right: 0; }.tag-chip, .read-more { display: none !important; }.pin-badge { margin-top: 4px; }.collection-empty { min-height: 280px; padding: 28px 18px; } }
</style>
