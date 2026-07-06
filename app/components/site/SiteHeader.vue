<template>
  <header class="site-header" :class="{ 'is-scrolled': isScrolled, 'is-article-route': isArticleRoute }">
    <div class="header-inner">
      <NuxtLink to="/" class="brand" aria-label="返回博客主页" data-tooltip="返回博客主页" @click="$emit('brandClick')">
        <span
          v-if="siteSettings.site_favicon"
          class="brand-mark brand-mark-mask"
          :style="brandMarkStyle"
          aria-hidden="true"
        />
        <Icon v-else-if="siteSettingsLoaded" name="i-simple-icons-nuxtdotjs" class="brand-mark" aria-hidden="true" />
        <span>{{ brandText }}</span>
      </NuxtLink>

      <button class="scroll-title" aria-label="回到顶部" @click="$emit('scrollTop')">
        <span class="scroll-title-text">{{ scrollTitle }}</span>
      </button>

      <nav class="main-nav" aria-label="主导航">
        <div v-for="item in primaryMenuItems" :key="item.id" class="nav-item" :class="{ 'has-children': item.children.length }">
          <NuxtLink :to="item.url || '/'" :target="item.targetBlank ? '_blank' : undefined" :rel="item.targetBlank ? 'noopener noreferrer' : undefined">
            {{ item.title }}
            <Icon v-if="item.children.length" name="i-lucide-chevron-down" aria-hidden="true" />
          </NuxtLink>
          <div v-if="item.children.length" class="nav-dropdown">
            <NuxtLink
              v-for="child in item.children"
              :key="child.id"
              :to="child.url || '/'"
              :target="child.targetBlank ? '_blank' : undefined"
              :rel="child.targetBlank ? 'noopener noreferrer' : undefined"
            >
              <Icon v-if="child.icon" :name="child.icon" aria-hidden="true" />
              <span>{{ child.title }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="header-actions">
        <nav class="tool-nav" aria-label="快捷入口">
          <button type="button" class="tool-button" aria-label="随机前往一个文章" data-tooltip="随机前往一个文章" @click="navigateToRandomPost">
            <LibraryIcon aria-hidden="true" />
          </button>
          <NuxtLink to="/archive" aria-label="归档" data-tooltip="归档">
            <ArchiveIcon aria-hidden="true" />
          </NuxtLink>
          <button type="button" class="tool-button search-trigger" aria-label="站内搜索" data-tooltip="站内搜索" @click="openSearch">
            <SearchIcon aria-hidden="true" />
          </button>
          <NuxtLink to="/admin" aria-label="后台" data-tooltip="后台" class="desktop-admin-link">
            <LayoutDashboardIcon aria-hidden="true" />
          </NuxtLink>
          <button
            type="button"
            class="mobile-menu-button"
            aria-label="打开侧边菜单"
            :aria-expanded="mobilePanelOpen"
            @click="$emit('openMobilePanel')"
          >
            <MenuIcon aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="site-search">
      <div v-if="searchOpen" class="site-search-overlay" @click.self="closeSearch">
        <section class="site-search-modal" role="dialog" aria-modal="true" aria-label="站内搜索">
          <form class="site-search-head" role="search" @submit.prevent>
            <SearchIcon aria-hidden="true" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="search"
              placeholder="搜索文章、标签或关键字..."
              aria-label="搜索文章、标签或关键字"
            >
            <kbd>ESC</kbd>
            <button type="button" aria-label="关闭搜索" @click="closeSearch">
              <XIcon aria-hidden="true" />
            </button>
          </form>

          <div class="site-search-body">
            <section v-if="tagSuggestions.length && !searchQuery.trim()" class="site-search-section">
              <h2>热门标签</h2>
              <div class="site-search-tags">
                <button v-for="tag in tagSuggestions" :key="tag.slug" type="button" @click="searchQuery = tag.name">
                  {{ tag.name }}
                </button>
              </div>
            </section>

            <section class="site-search-section">
              <h2>{{ searchQuery.trim() ? '搜索结果' : '最近文章' }}</h2>
              <div v-if="searchLoading" class="site-search-empty">正在搜索...</div>
              <div v-else-if="displaySearchPosts.length" class="site-search-results">
                <NuxtLink
                  v-for="post in displaySearchPosts"
                  :key="post.id"
                  :to="postPath(post.slug)"
                  class="site-search-result"
                  @click="closeSearch"
                >
                  <span class="site-search-result-icon">
                    <FileTextIcon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{{ post.title }}</strong>
                    <small>{{ formatSearchDate(post.publishedAt) || post.category?.name || '文章' }}</small>
                  </span>
                  <ChevronRightIcon class="site-search-result-arrow" aria-hidden="true" />
                </NuxtLink>
              </div>
              <div v-else class="site-search-empty">没有找到匹配的文章</div>
            </section>
          </div>

          <footer class="site-search-foot">
            <span>站内搜索</span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import {
  Archive as ArchiveIcon,
  ChevronRight as ChevronRightIcon,
  FileText as FileTextIcon,
  LayoutDashboard as LayoutDashboardIcon,
  Library as LibraryIcon,
  Menu as MenuIcon,
  Search as SearchIcon,
  X as XIcon
} from '@lucide/vue'
import type { ApiResult } from '~~/types/api'
import type { PostSummary, PublicPostListPayload } from '~~/types/dto/post'
import type { TaxonomyItem } from '~~/types/dto/taxonomy'
import type { MenuTreeItem } from '~/composables/useSiteNavigation'

defineProps<{
  isScrolled: boolean
  isArticleRoute: boolean
  siteSettings: Record<string, string>
  siteSettingsLoaded: boolean
  brandText: string
  brandMarkStyle?: Record<string, string>
  scrollTitle: string
  primaryMenuItems: MenuTreeItem[]
  mobilePanelOpen: boolean
}>()

defineEmits<{
  brandClick: []
  scrollTop: []
  openMobilePanel: []
}>()

const searchOpen = ref(false)
const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<PostSummary[]>([])
const searchInputRef = ref<HTMLInputElement | null>(null)
const randomPostLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

const [{ data: recentPostData }, { data: tagData }] = await Promise.all([
  useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query: { page: 1, pageSize: 4 } }),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/tags')
])

const recentPosts = computed(() => recentPostData.value?.data.items || [])
const totalPublishedPosts = computed(() => recentPostData.value?.data.total || recentPosts.value.length)
const tagSuggestions = computed(() => (tagData.value?.data || []).slice(0, 4))
const displaySearchPosts = computed(() => searchQuery.value.trim() ? searchResults.value : recentPosts.value)

watch(searchQuery, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  const keyword = value.trim()

  if (!keyword) {
    searchResults.value = []
    searchLoading.value = false
    return
  }

  searchLoading.value = true
  searchTimer = setTimeout(async () => {
    try {
      const response = await $fetch<ApiResult<PublicPostListPayload>>('/api/posts', {
        query: { keyword, page: 1, pageSize: 5 }
      })
      searchResults.value = response.data.items
    } catch {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 180)
})

watch(searchOpen, (open) => {
  if (!import.meta.client) return
  document.body.classList.toggle('site-search-lock', open)
  if (open) {
    nextTick(() => searchInputRef.value?.focus())
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleSearchKeydown)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
  document.body.classList.remove('site-search-lock')
  window.removeEventListener('keydown', handleSearchKeydown)
})

function openSearch() {
  searchOpen.value = true
}

function closeSearch() {
  searchOpen.value = false
}

async function navigateToRandomPost() {
  if (randomPostLoading.value) return
  const total = totalPublishedPosts.value
  if (!total) return

  randomPostLoading.value = true
  try {
    const page = Math.floor(Math.random() * total) + 1
    const response = await $fetch<ApiResult<PublicPostListPayload>>('/api/posts', {
      query: { page, pageSize: 1 }
    })
    const post = response.data.items[0]
    if (post) {
      await navigateTo(postPath(post.slug))
    }
  } finally {
    randomPostLoading.value = false
  }
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && searchOpen.value) {
    closeSearch()
  }
}

function formatSearchDate(value?: string | Date | null) {
  return value ? `发布于 ${new Date(value).toLocaleDateString('zh-CN')}` : ''
}
</script>
