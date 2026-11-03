<template>
  <Teleport to="body">
    <dialog id="site-search-dialog" ref="dialogRef" class="site-search-modal" aria-labelledby="site-search-title" @cancel.prevent="closeSearch" @click="dismissBackdrop" @keydown="trapTab">
      <header class="site-search-heading">
        <h2 id="site-search-title">搜索</h2>
        <div><kbd>Esc</kbd><button type="button" class="site-search-icon-button" aria-label="关闭搜索" @click="closeSearch"><XIcon :size="20" /></button></div>
      </header>

      <form class="site-search-form" role="search" @submit.prevent="runSearch()">
        <div class="site-search-input-wrap">
          <SearchIcon :size="21" aria-hidden="true" />
          <input ref="inputRef" v-model="query" type="search" :placeholder="selectedTag ? '在当前标签内搜索…' : '搜索文章标题或正文…'" aria-label="搜索文章标题或正文" autocomplete="off" maxlength="200" @keydown="handleInputKeydown">
          <button v-if="query" type="button" class="site-search-icon-button" aria-label="清空关键词" @click="clearQuery"><XIcon :size="17" /></button>
          <button type="submit" class="site-search-submit" :disabled="!hasFilters">搜索</button>
        </div>
      </form>

      <div ref="bodyRef" class="site-search-body" :aria-busy="loading" @keydown="handleResultKeydown">
        <div v-if="selectedTag" class="site-search-filter">
          <span>标签筛选</span>
          <button type="button" @click="selectedTag = null"><span># {{ selectedTag.name }}</span><XIcon :size="14" aria-hidden="true" /><span class="sr-only">取消标签筛选</span></button>
        </div>
        <section v-else-if="!query.trim() && tags.length" class="site-search-section">
          <h3>按标签浏览</h3>
          <div class="site-search-tags"><button v-for="tag in tags" :key="tag.slug" type="button" @click="selectTag(tag)"><span aria-hidden="true">#</span> {{ tag.name }}</button></div>
        </section>

        <section class="site-search-section">
          <div class="site-search-section-heading">
            <h3>{{ hasFilters ? '搜索结果' : '最近文章' }}</h3>
            <span v-if="hasFilters && !loading && !error" role="status">共 {{ total }} 篇</span>
          </div>

          <div v-if="loading" class="site-search-state" role="status"><LoaderCircleIcon :size="24" class="site-search-spinner" aria-hidden="true" /><p>{{ hasFilters ? '正在查找文章…' : '正在加载文章…' }}</p></div>
          <div v-else-if="error && !posts.length" class="site-search-state" role="alert"><CircleAlertIcon :size="28" aria-hidden="true" /><strong>{{ error }}</strong><button type="button" @click="retry">重新加载</button></div>
          <div v-else-if="!posts.length" class="site-search-state" role="status"><SearchIcon :size="28" aria-hidden="true" /><strong>{{ hasFilters ? '没有找到匹配的文章' : '还没有文章' }}</strong><p v-if="hasFilters">试试更简短的关键词，或调整标签筛选。</p><button v-if="hasFilters" type="button" @click="resetSearch">浏览最近文章</button></div>
          <div v-else class="site-search-results" :class="{ 'is-recent': !hasFilters }">
            <NuxtLink v-for="post in posts" :key="post.id" :to="postPath(post.slug)" class="site-search-result" data-search-result @click="closeSearch">
              <span class="site-search-cover"><img v-if="post.cover && !failedCovers.includes(post.id)" :src="post.cover" alt="" loading="lazy" @error="failedCovers.push(post.id)"><FileTextIcon v-else :size="24" aria-hidden="true" /></span>
              <span class="site-search-copy">
                <span class="site-search-meta"><span v-if="post.category">{{ post.category.name }}</span><time v-if="post.publishedAt" :datetime="new Date(post.publishedAt).toISOString()">{{ formatDate(post.publishedAt) }}</time></span>
                <strong><template v-for="(part, index) in searchTextParts(post.title, query)" :key="index"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></strong>
                <span v-if="hasFilters && post.summary" class="site-search-excerpt"><template v-for="(part, index) in searchTextParts(post.summary, query)" :key="index"><mark v-if="part.match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
              </span>
              <ArrowUpRightIcon :size="17" class="site-search-result-arrow" aria-hidden="true" />
            </NuxtLink>
          </div>
          <div v-if="posts.length && hasFilters && !loading" class="site-search-more">
            <p v-if="error" role="alert">{{ error }}</p>
            <button v-if="posts.length < total || error" type="button" :disabled="loadingMore" @click="runSearch(page + 1)">{{ loadingMore ? '正在加载…' : error ? '重试加载' : `加载更多（已显示 ${posts.length} 篇）` }}</button>
          </div>
        </section>
      </div>

      <footer class="site-search-foot"><span>搜索本站文章</span><span class="site-search-key-hints"><span><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 打开</span></span></footer>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { ArrowUpRight as ArrowUpRightIcon, CircleAlert as CircleAlertIcon, FileText as FileTextIcon, LoaderCircle as LoaderCircleIcon, Search as SearchIcon, X as XIcon } from '@lucide/vue'
import type { ApiResult, PostSummary, PublicPostListPayload, TaxonomyItem } from '~~/types/api'
import { searchTextParts } from '~/utils/search-highlight'

const open = defineModel<boolean>('open', { default: false })
const dialogRef = ref<HTMLDialogElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
const query = ref('')
const selectedTag = ref<TaxonomyItem | null>(null)
const searchResults = ref<PostSummary[]>([])
const searchError = ref('')
const searching = ref(false)
const loadingMore = ref(false)
const total = ref(0)
const page = ref(1)
const failedCovers = ref<number[]>([])
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let sequence = 0
let returnFocus: HTMLElement | null = null

const { data: recentData, error: recentError, status: recentStatus, refresh: refreshRecent } = useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query: { page: 1, pageSize: 4 } })
const { data: tagData } = useFetch<ApiResult<TaxonomyItem[]>>('/api/tags')
const tags = computed(() => (tagData.value?.data || []).slice(0, 6))
const hasFilters = computed(() => Boolean(query.value.trim() || selectedTag.value))
const posts = computed(() => hasFilters.value ? searchResults.value : recentData.value?.data.items || [])
const loading = computed(() => hasFilters.value ? searching.value : recentStatus.value === 'pending')
const error = computed(() => hasFilters.value ? searchError.value : recentError.value ? '文章暂时无法加载' : '')

function stopRequest() {
  sequence++
  if (timer) clearTimeout(timer)
  controller?.abort()
  searching.value = false
  loadingMore.value = false
}

watch([query, selectedTag], () => {
  stopRequest()
  searchResults.value = []
  searchError.value = ''
  total.value = 0
  page.value = 1
  bodyRef.value?.scrollTo({ top: 0, behavior: 'instant' })
  if (!hasFilters.value || !open.value) return
  searching.value = true
  timer = setTimeout(() => void runSearch(), 200)
})

async function runSearch(nextPage = 1) {
  stopRequest()
  if (!hasFilters.value || !open.value) return
  const requestId = sequence
  controller = new AbortController()
  searching.value = nextPage === 1
  loadingMore.value = nextPage > 1
  searchError.value = ''
  if (nextPage === 1) {
    searchResults.value = []
    total.value = 0
    page.value = 1
  }
  try {
    const response = await $fetch<ApiResult<PublicPostListPayload>>('/api/posts', {
      query: { keyword: query.value.trim() || undefined, tag: selectedTag.value?.slug, page: nextPage, pageSize: 6 },
      signal: controller.signal
    })
    if (requestId !== sequence) return
    searchResults.value = nextPage === 1 ? response.data.items : [...searchResults.value, ...response.data.items]
    total.value = response.data.total
    page.value = nextPage
  } catch {
    if (requestId === sequence) searchError.value = nextPage === 1 ? '搜索暂时不可用，请重试' : '更多文章加载失败，请重试'
  } finally {
    if (requestId === sequence) {
      searching.value = false
      loadingMore.value = false
    }
  }
}

function selectTag(tag: TaxonomyItem) {
  selectedTag.value = tag
  inputRef.value?.focus()
}

function clearQuery() {
  query.value = ''
  inputRef.value?.focus()
}

function resetSearch() {
  query.value = ''
  selectedTag.value = null
  inputRef.value?.focus()
}

function retry() {
  if (hasFilters.value) void runSearch()
  else void refreshRecent()
}

function closeSearch() {
  open.value = false
}

function dismissBackdrop(event: MouseEvent) {
  const dialog = dialogRef.value
  if (!dialog || event.target !== dialog) return
  const rect = dialog.getBoundingClientRect()
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSearch()
}

function focusResult(index: number) {
  const links = bodyRef.value?.querySelectorAll<HTMLAnchorElement>('[data-search-result]')
  if (!links?.length) return
  if (index < 0) inputRef.value?.focus()
  else links[Math.min(index, links.length - 1)]?.focus()
}

function handleInputKeydown(event: KeyboardEvent) {
  if (event.isComposing || event.key !== 'ArrowDown') return
  event.preventDefault()
  focusResult(0)
}

function trapTab(event: KeyboardEvent) {
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return
  const elements = [...dialogRef.value!.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href]')].filter(element => element.getClientRects().length)
  const first = elements[0]
  const last = elements.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

function handleResultKeydown(event: KeyboardEvent) {
  if (event.isComposing || !['ArrowDown', 'ArrowUp'].includes(event.key)) return
  const links = [...bodyRef.value!.querySelectorAll<HTMLAnchorElement>('[data-search-result]')]
  const index = links.indexOf(event.target as HTMLAnchorElement)
  if (index < 0) return
  event.preventDefault()
  focusResult(index + (event.key === 'ArrowDown' ? 1 : -1))
}

function handleShortcut(event: KeyboardEvent) {
  if (event.isComposing || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
  if (!open.value && ((event.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]') || document.querySelector('dialog[open]'))) return
  event.preventDefault()
  open.value = !open.value
}

function syncViewport() {
  const viewport = window.visualViewport
  dialogRef.value?.style.setProperty('--search-viewport-height', `${viewport?.height || window.innerHeight}px`)
  dialogRef.value?.style.setProperty('--search-viewport-top', `${viewport?.offsetTop || 0}px`)
}

watch(open, async (value) => {
  if (!import.meta.client) return
  await nextTick()
  if (value) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    syncViewport()
    dialogRef.value?.showModal()
    document.body.classList.add('site-search-lock')
    inputRef.value?.focus()
    if (hasFilters.value) void runSearch()
  } else {
    stopRequest()
    dialogRef.value?.close()
    document.body.classList.remove('site-search-lock')
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  }
}, { flush: 'post' })

onMounted(() => {
  window.addEventListener('keydown', handleShortcut)
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
})

onBeforeUnmount(() => {
  stopRequest()
  dialogRef.value?.close()
  document.body.classList.remove('site-search-lock')
  window.removeEventListener('keydown', handleShortcut)
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
})

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('zh-CN')
}
</script>
