<template>
  <div class="collection-page">
    <section class="collection-shell">
      <div class="collection-layout">
        <main class="collection-main">
          <header class="collection-heading" data-page-enter style="--page-enter-order: 0">
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

          <div
            v-if="showListSkeleton"
            class="collection-list"
            role="status"
            aria-label="正在加载文章"
            data-page-enter
            style="--page-enter-order: 1"
          >
            <PostCardSkeleton variant="archive" :count="pageSize" />
          </div>

          <div v-else-if="listError" class="collection-empty is-error" role="alert" data-page-enter style="--page-enter-order: 1">
            <span><UIcon name="i-lucide-cloud-alert" class="size-7" /></span>
            <strong>文章加载失败</strong>
            <p>网络似乎开了个小差，请稍后重试。</p>
            <button type="button" @click="refreshPosts()">重新加载</button>
          </div>

          <div v-else-if="posts.length" class="collection-list" :aria-busy="listPending" data-page-enter style="--page-enter-order: 1">
            <CardReveal v-for="post in posts" :key="post.id" variant="archive">
              <ArchivePostCard :post="post" />
            </CardReveal>
          </div>

          <div v-else class="collection-empty" data-page-enter style="--page-enter-order: 1">
            <span><UIcon :name="kind === 'category' ? 'i-lucide-folder-open' : 'i-lucide-tags'" class="size-7" /></span>
            <strong>暂无相关文章</strong>
            <p>可以浏览其他{{ kind === 'category' ? '分类' : '标签' }}，或者返回全部文章。</p>
            <NuxtLink to="/archive">浏览全部文章</NuxtLink>
          </div>

          <SeoPagination v-if="!listError" :page="currentPage" :total="totalPages" :page-to="pageTo" />
        </main>

        <PublicSidebar
          class="collection-sidebar"
          data-page-enter
          style="--page-enter-order: 1"
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
import type { TaxonomyItem } from '~~/types/dto/taxonomy'
import CardReveal from '~/components/CardReveal.vue'

const props = defineProps<{
  kind: 'category' | 'tag'
  slug: string
}>()

const pageSize = 6
const { currentPage, pageTo } = usePublicPagination()
const config = useRuntimeConfig()
const siteSettings = useSiteSettings()
const query = computed(() => ({
  page: currentPage.value,
  pageSize,
  category: props.kind === 'category' ? props.slug : undefined,
  tag: props.kind === 'tag' ? props.slug : undefined
}))

const [{ data, status: listStatus, error: listError, refresh: refreshPosts }, { data: categoryData, error: categoryError }, { data: tagData, error: tagError }] = await Promise.all([
  useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query }),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/tags')
])

const posts = computed(() => data.value?.data.items || [])
const listPending = computed(() => listStatus.value === 'pending')
const showListSkeleton = useDelayedPending(listPending)
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const currentTaxonomy = computed(() => {
  const source = props.kind === 'category' ? categories.value : tags.value
  return source.find(item => item.slug === props.slug)
})
const taxonomyError = props.kind === 'category' ? categoryError.value : tagError.value
if (taxonomyError) throw taxonomyError
if (!currentTaxonomy.value) {
  throw createError({ statusCode: 404, message: '分类或标签不存在', fatal: true })
}
assertPublicPageExists(data.value?.data)

const kindLabel = computed(() => props.kind === 'category' ? '文章分类' : '文章标签')
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')

useSeoMeta({
  title: () => `${currentTaxonomy.value?.name || props.slug} - ${props.kind === 'category' ? '分类' : '标签'} - ${siteName.value}`,
  description: () => `浏览${siteName.value}中${props.kind === 'category' ? '分类' : '标签'}“${currentTaxonomy.value?.name || props.slug}”下的文章。`
})





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
.collection-empty { display: grid; min-height: 340px; place-items: center; align-content: center; gap: 9px; border: 1px solid var(--theme-border); border-radius: 20px; background: color-mix(in srgb, var(--theme-surface) 76%, transparent); color: var(--theme-text-muted); text-align: center; padding: 44px; }
.collection-empty > span { display: grid; width: 58px; height: 58px; place-items: center; border-radius: 18px; background: #eef2f4; color: var(--theme-text-muted); }.collection-empty strong { color: var(--theme-text); font-size: 18px; }.collection-empty p { margin: 0; font-size: 13px; }.collection-empty a { margin-top: 8px; border-radius: 999px; background: var(--theme-text); color: #fff; padding: 9px 16px; font-size: 12px; font-weight: 800; }
.collection-empty button { margin-top: 8px; border: 0; border-radius: 999px; background: var(--theme-text); color: var(--theme-surface); padding: 9px 16px; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
.collection-sidebar { position: sticky; top: 84px; display: grid; gap: 10px; }
@media (max-width: 980px) { .collection-layout { grid-template-columns: 1fr; }.collection-sidebar { position: static; } }
@media (max-width: 640px) { .collection-shell { width: min(100% - 20px, 1290px); padding: 34px 0 60px; }.collection-heading { margin-bottom: 24px; padding: 0 10px 26px; }.collection-heading h1 { font-size: 38px; }.collection-empty { min-height: 280px; padding: 28px 18px; } }
</style>
