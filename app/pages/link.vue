<template>
  <div class="walk-page">
    <header class="walk-intro">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="page?.settings.intro">{{ page.settings.intro }}</p>
      </div>
      <div class="walk-trail" aria-hidden="true">
        <span class="trail-start" />
        <span class="trail-turn" />
        <span class="trail-return" />
        <span class="trail-end" />
        <span class="trail-caption">走走停停</span>
      </div>
    </header>

    <div v-if="error" class="walk-unavailable">
      <p role="status">书签暂时没能加载。</p>
      <UButton variant="outline" color="neutral" :loading="status === 'pending'" @click="refresh()">
        重新加载
      </UButton>
    </div>

    <template v-else-if="page">
      <article v-if="featured" class="walk-feature">
        <div class="feature-label">
          <Icon name="i-lucide-bookmark" aria-hidden="true" />
          <span>最近捡到</span>
          <time v-if="featured.publishedAt" :datetime="featured.publishedAt">{{ formatDate(featured.publishedAt) }}</time>
        </div>
        <h2>{{ featured.title }}</h2>
        <p>{{ featured.note }}</p>
        <a :href="featured.url" target="_blank" rel="noopener noreferrer" class="feature-link">
          去看看 <Icon name="i-lucide-arrow-up-right" aria-hidden="true" />
        </a>
      </article>

      <section class="walk-drawer" aria-labelledby="bookmark-drawer-title">
        <div class="drawer-heading">
          <h2 id="bookmark-drawer-title">书签抽屉</h2>
          <UButton
            v-if="page.settings.showRandom && page.items.length > 1"
            variant="outline"
            color="neutral"
            icon="i-lucide-shuffle"
            class="random-button"
            :disabled="!interactive"
            @click="pickBookmark"
          >
            随便逛一个
          </UButton>
        </div>
        <div v-if="availableCategories.length > 1" class="bookmark-filters" role="group" aria-label="按分类浏览">
          <button
            v-for="category in filters"
            :key="category"
            type="button"
            :aria-pressed="activeCategory === category"
            :disabled="!interactive"
            @click="selectCategory(category)"
          >
            {{ category === 'all' ? '全部' : bookmarkCategories[category] }}
          </button>
        </div>
        <div v-if="picked" class="walk-pick">
          <span>散步去向</span>
          <a :href="picked.url" target="_blank" rel="noopener noreferrer">
            {{ picked.title }} <Icon name="i-lucide-arrow-up-right" aria-hidden="true" />
          </a>
        </div>
        <p class="sr-only" role="status">{{ announcement }}</p>

        <ul v-if="visibleItems.length" class="bookmark-list">
          <li v-for="item in visibleItems" :key="item.id">
            <a :href="item.url" target="_blank" rel="noopener noreferrer" class="bookmark-link">
              <span class="bookmark-category">{{ bookmarkCategories[item.category] }}</span>
              <span class="bookmark-copy">
                <strong>{{ item.title }}</strong>
                <span>{{ item.note }}</span>
              </span>
              <span class="bookmark-source">
                <span>{{ domain(item.url) }}</span>
                <Icon name="i-lucide-arrow-up-right" aria-hidden="true" />
              </span>
            </a>
          </li>
        </ul>
        <p v-else-if="!featured" class="walk-empty">书签抽屉还空着，等下次散步带点东西回来。</p>
        <p v-else class="walk-empty">这次先留下一条主推荐。</p>
      </section>

      <p v-if="page.items.length" class="walk-footer">沿途留下 {{ page.items.length }} 条书签</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import { bookmarkCategories } from '~~/types/dto/bookmark'
import type { BookmarkCategory, PublicBookmarksPayload } from '~~/types/dto/bookmark'

type CategoryFilter = BookmarkCategory | 'all'

const { data, error, status, refresh } = await useFetch<ApiResult<PublicBookmarksPayload>>('/api/bookmarks')
const page = computed(() => data.value?.data)
const title = computed(() => page.value?.settings.title || '站外散步')
const featured = computed(() => page.value?.items.find(item => item.id === page.value?.settings.featuredId))
const list = computed(() => page.value?.items.filter(item => item.id !== featured.value?.id) ?? [])
const availableCategories = computed(() => (Object.keys(bookmarkCategories) as BookmarkCategory[])
  .filter(category => list.value.some(item => item.category === category)))
const filters = computed<CategoryFilter[]>(() => ['all', ...availableCategories.value])
const activeCategory = ref<CategoryFilter>('all')
const visibleItems = computed(() => list.value.filter(item => activeCategory.value === 'all' || item.category === activeCategory.value))
const randomPool = computed(() => activeCategory.value === 'all' ? page.value?.items ?? [] : visibleItems.value)
const pickedId = ref<number>()
const lastPickedId = ref<number>()
const picked = computed(() => randomPool.value.find(item => item.id === pickedId.value))
const announcement = ref('')
const interactive = ref(false)

onMounted(() => { interactive.value = true })

watch(availableCategories, (categories) => {
  if (activeCategory.value !== 'all' && !categories.includes(activeCategory.value)) selectCategory('all')
})

function selectCategory(category: CategoryFilter) {
  activeCategory.value = category
  pickedId.value = undefined
  announcement.value = `${category === 'all' ? '全部' : bookmarkCategories[category]}，${visibleItems.value.length} 条书签`
}

function pickBookmark() {
  const pool = randomPool.value
  const candidates = pool.length > 1 ? pool.filter(item => item.id !== lastPickedId.value) : pool
  const item = candidates[Math.floor(Math.random() * candidates.length)]
  if (!item) return
  pickedId.value = item.id
  lastPickedId.value = item.id
  announcement.value = `选中了 ${item.title}，可在散步去向打开。`
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai'
})
const formatDate = (date: string) => dateFormatter.format(new Date(date)).replaceAll('/', '.')
const domain = (url: string) => new URL(url).hostname.replace(/^www\./, '')

useSeoMeta({
  title: () => title.value,
  description: () => page.value?.settings.intro.replace(/\s+/g, ' ').trim() || '沿途捡到的文章、工具和小站。'
})
</script>

<style scoped>
.walk-page {
  --walk-ink: var(--theme-text-strong);
  --walk-muted: var(--theme-text-soft);
  --walk-blue: color-mix(in srgb, var(--theme-accent) 80%, var(--walk-ink));
  --walk-wash: var(--theme-accent-soft);
  --walk-serif: "Songti SC", "Noto Serif SC", SimSun, serif;
  width: min(calc(100% - 32px), 930px);
  margin: clamp(24px, 5vw, 52px) auto clamp(36px, 7vw, 72px);
  padding: clamp(16px, 5vw, 54px);
  border: 1px solid var(--theme-border-soft);
  border-radius: 16px;
  background: var(--theme-surface);
  color: var(--walk-ink);
}

.walk-intro {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
  align-items: center;
  gap: 16px;
  padding: 4px 0 clamp(25px, 4vw, 44px);
}

.walk-intro h1 {
  font: 700 clamp(38px, 6.6vw, 68px)/1.12 var(--walk-serif);
  letter-spacing: -.045em;
  overflow-wrap: anywhere;
}

.walk-intro p {
  margin: 14px 0 0;
  color: var(--walk-muted);
  font-size: clamp(14px, 2vw, 17px);
  line-height: 1.65;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.walk-trail {
  position: relative;
  height: clamp(68px, 14vw, 116px);
  color: var(--walk-blue);
  background-image: radial-gradient(circle, color-mix(in srgb, currentColor 30%, transparent) 1px, transparent 1.2px);
  background-size: 13px 13px;
  mask-image: linear-gradient(90deg, transparent, #000 15%, #000 90%, transparent);
}

.trail-turn,
.trail-return {
  position: absolute;
  border: 2px dashed currentColor;
}

.trail-turn {
  inset: 52% 43% 23% 13%;
  border-top: 0;
  border-right: 0;
  border-radius: 0 0 0 22px;
}

.trail-return {
  inset: 19% 13% 23% 56%;
  border-left: 0;
  border-radius: 0 32px 29px 0;
}

.trail-start,
.trail-end {
  position: absolute;
  z-index: 1;
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-radius: 50%;
  background: var(--theme-surface);
}

.trail-start { top: calc(52% - 5px); left: calc(13% - 4px); }
.trail-end {
  top: calc(19% - 4px);
  left: calc(56% - 6px);
  background: currentColor;
  box-shadow: 0 0 0 5px var(--walk-wash);
}

.trail-caption {
  position: absolute;
  top: 28%;
  left: 24%;
  padding: 0 4px;
  background: var(--theme-surface);
  font-size: 12px;
  letter-spacing: .12em;
}

.walk-feature {
  padding: clamp(15px, 3.2vw, 27px) clamp(16px, 3.5vw, 31px);
  border-inline-start: 3px solid var(--walk-blue);
  border-radius: 5px 15px 15px 5px;
  background: var(--walk-wash);
}

.feature-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--walk-blue);
  font-size: 12px;
}

.feature-label time { margin-inline-start: auto; }
.walk-feature h2 {
  margin: 7px 0 0;
  font-size: clamp(20px, 3.2vw, 28px);
  font-weight: 700;
  letter-spacing: -.025em;
  overflow-wrap: anywhere;
}

.walk-feature p {
  max-width: 58ch;
  margin: 5px 0 0;
  color: var(--walk-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.feature-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  margin-top: 6px;
  color: var(--walk-blue);
  font-weight: 650;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.walk-drawer { margin-top: clamp(22px, 4vw, 36px); }
.walk-intro + .walk-drawer { margin-top: 0; }
.drawer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.drawer-heading h2 {
  font: 700 clamp(22px, 3.3vw, 28px)/1.3 var(--walk-serif);
  letter-spacing: -.025em;
}

.random-button {
  background: var(--theme-surface);
  color: var(--walk-blue);
  box-shadow: inset 0 0 0 1px var(--theme-border);
}
.random-button:hover:not(:disabled) { background: var(--walk-wash); }
.bookmark-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 10px;
}

.bookmark-filters button {
  min-height: 34px;
  padding: 3px 11px;
  border-radius: 7px;
  color: var(--walk-muted);
  font-size: 14px;
  cursor: pointer;
}

.bookmark-filters button:hover:not(:disabled),
.bookmark-filters button[aria-pressed="true"] {
  background: var(--walk-wash);
  color: var(--walk-blue);
}

.walk-pick {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  background: var(--walk-wash);
  color: var(--walk-muted);
  overflow-wrap: anywhere;
}

.walk-pick a { color: var(--walk-blue); text-decoration: underline; text-underline-offset: 3px; }
.walk-pick .iconify,
.bookmark-source .iconify { vertical-align: -.15em; }
.bookmark-list { margin: 0; padding: 0; list-style: none; }
.bookmark-link {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 66px;
  padding: 10px 3px;
  border-top: 1px solid var(--theme-border);
  text-decoration: none;
}

.bookmark-link:hover,
.bookmark-link:focus-visible { background: var(--theme-surface-muted); }
.bookmark-link:hover strong,
.bookmark-link:focus-visible strong { color: var(--walk-blue); text-decoration: underline; text-underline-offset: 3px; }
.bookmark-category, .bookmark-source { color: var(--walk-muted); font-size: 12px; }
.bookmark-copy strong, .bookmark-copy span { display: block; overflow-wrap: anywhere; }
.bookmark-copy strong { font-size: 16px; font-weight: 650; }
.bookmark-copy span { color: var(--walk-muted); font-size: 14px; }
.bookmark-source { display: flex; align-items: center; gap: 12px; }
.bookmark-source span:not(.iconify) { max-width: 18ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bookmark-source .iconify { flex: none; font-size: 16px; }
.walk-empty { padding: 8px 0 14px; color: var(--walk-muted); }
.walk-footer {
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid var(--theme-border);
  color: var(--walk-muted);
  font-size: 12px;
}
.walk-unavailable { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; color: var(--walk-muted); }
.walk-page :is(a, button):focus-visible { outline: 2px solid var(--walk-blue); outline-offset: 3px; }

@media (max-width: 600px) {
  .bookmark-source span:not(.iconify) { display: none; }
}

@media (max-width: 460px) {
  .walk-page { width: calc(100% - 24px); }
  .walk-intro { grid-template-columns: minmax(0, 1fr) 60px; gap: 4px; }
  .trail-caption { display: none; }
  .bookmark-link { grid-template-columns: 30px minmax(0, 1fr) auto; gap: 8px; }
}

@media (pointer: coarse) {
  .bookmark-filters button, .feature-link, .random-button { min-height: 44px; }
}
</style>
