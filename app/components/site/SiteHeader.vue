<template>
  <header class="site-header" :class="{ 'is-scrolled': isScrolled, 'is-article-route': isArticleRoute, 'has-page-gradient': pageGradient }">
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
        <div
          v-for="item in primaryMenuItems"
          :key="item.id"
          class="nav-item"
          :class="{ 'has-children': item.children.length, 'is-click-held': heldMenuItemId === item.id }"
          @pointerleave="releaseMenuClick(item.id)"
        >
          <NuxtLink
            :to="item.url || '/'"
            :target="item.targetBlank ? '_blank' : undefined"
            :rel="item.targetBlank ? 'noopener noreferrer' : undefined"
            @click="holdMenuClick(item.id)"
          >
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
          <NuxtLink to="/tools" class="tool-button tools-page-button" aria-label="工具" data-tooltip="工具">
            <WrenchIcon aria-hidden="true" />
          </NuxtLink>
          <button type="button" class="tool-button" aria-label="归档" data-tooltip="归档" @click="navigateTo('/archive')">
            <ArchiveIcon aria-hidden="true" />
          </button>
          <button type="button" class="tool-button search-trigger" aria-label="站内搜索" data-tooltip="站内搜索（Ctrl / ⌘ K）" aria-haspopup="dialog" aria-controls="site-search-dialog" :aria-expanded="searchOpen" aria-keyshortcuts="Control+K Meta+K" @click="openSearch">
            <SearchIcon aria-hidden="true" />
          </button>
          <button
            type="button"
            class="tool-button desktop-theme-toggle"
            :aria-label="themeToggleLabel"
            :data-tooltip="themeToggleLabel"
            @click="toggleColorMode"
          >
            <SunIcon class="theme-icon theme-icon-sun" aria-hidden="true" />
            <MoonIcon class="theme-icon theme-icon-moon" aria-hidden="true" />
          </button>
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

  <SiteSearch v-model:open="searchOpen" />
</template>

<script setup lang="ts">
import {
  Archive as ArchiveIcon,
  Menu as MenuIcon,
  Moon as MoonIcon,
  Search as SearchIcon,
  Sun as SunIcon,
  Wrench as WrenchIcon
} from '@lucide/vue'
import SiteSearch from './SiteSearch.vue'
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
  pageGradient?: boolean
}>()

defineEmits<{
  brandClick: []
  scrollTop: []
  openMobilePanel: []
}>()

const searchOpen = ref(false)
const heldMenuItemId = useState<number | null>('site-header-held-menu-item', () => null)
const colorMode = useColorMode()
const isDarkMode = computed(() => colorMode.value === 'dark')
const themeToggleLabel = computed(() => isDarkMode.value ? '切换到白天模式' : '切换到夜间模式')
let menuHoldTimer: ReturnType<typeof setTimeout> | undefined

function holdMenuClick(itemId: number) {
  heldMenuItemId.value = itemId
  if (menuHoldTimer) clearTimeout(menuHoldTimer)
  menuHoldTimer = setTimeout(() => {
    if (heldMenuItemId.value === itemId) heldMenuItemId.value = null
  }, 2000)
}

function releaseMenuClick(itemId: number) {
  if (heldMenuItemId.value === itemId) heldMenuItemId.value = null
}

function applyColorMode() {
  const currentMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  colorMode.preference = currentMode === 'dark' ? 'light' : 'dark'
}

function toggleColorMode(event: MouseEvent) {
  if (!import.meta.client) return

  const root = document.documentElement
  const target = event.currentTarget as HTMLElement | null
  const rect = target?.getBoundingClientRect()
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth * .95
  const y = rect ? rect.top + rect.height / 2 : 35
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = document.documentElement.clientHeight
  const radius = Math.ceil(Math.hypot(
    Math.max(x, viewportWidth - x),
    Math.max(y, viewportHeight - y)
  )) + 2
  root.style.setProperty('--theme-switch-x', `${x}px`)
  root.style.setProperty('--theme-switch-y', `${y}px`)
  root.style.setProperty('--theme-switch-radius', `${radius}px`)

  const startViewTransition = document.startViewTransition?.bind(document)
  if (startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    startViewTransition(async () => {
      applyColorMode()
      await nextTick()
    })
    return
  }

  root.classList.add('theme-switching')
  applyColorMode()
  window.setTimeout(() => root.classList.remove('theme-switching'), 280)
}

onBeforeUnmount(() => {
  if (menuHoldTimer) clearTimeout(menuHoldTimer)
  heldMenuItemId.value = null
})

function openSearch() {
  searchOpen.value = true
}
</script>
