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

      <nav ref="mainNav" class="main-nav" aria-label="主导航">
        <div
          v-for="item in primaryMenuItems"
          :key="item.id"
          class="nav-item"
          :class="{ 'has-children': item.children.length, 'is-click-held': heldMenuItemId === item.id, 'is-current': activeMenuId === item.id }"
          @pointerleave="releaseMenuClick(item.id)"
        >
          <NuxtLink
            :to="item.url || '/'"
            :aria-current="activeMenuId === item.id ? (menuPath(item.url) === currentPath ? 'page' : 'location') : undefined"
            :target="item.targetBlank ? '_blank' : undefined"
            :rel="item.targetBlank ? 'noopener noreferrer' : undefined"
            @click="holdMenuClick(item.id)"
          >
            {{ menuPath(item.url) === '/about' && item.title === '我的' ? '关于作者' : item.title }}
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
        <span
          v-show="markerPosition !== null"
          class="main-nav-marker"
          :style="{ transform: `translateX(${markerPosition ?? 0}px)` }"
          aria-hidden="true"
        />
      </nav>

      <div class="header-actions">
        <nav class="tool-nav" :class="{ 'has-no-shortcuts': shortcuts.length === 0 }" aria-label="快捷入口">
          <template v-for="item in shortcuts" :key="item.id">
            <NuxtLink
              v-if="item.id === 'tools' || item.id === 'archive'"
              :to="item.id === 'tools' ? '/tools' : '/archive'"
              class="tool-button"
              :class="{ 'desktop-shortcut': !isMobileHeaderShortcut(item.id) }"
              :aria-label="item.label"
              :data-tooltip="item.label"
            >
              <Icon :name="item.icon" aria-hidden="true" />
            </NuxtLink>
            <SiteAccountMenu v-else-if="item.id === 'account'" :label="item.label" :icon="item.icon" :follow-avatar="item.followAvatar" />
            <button
              v-else-if="item.id === 'search'"
              type="button"
              class="tool-button search-trigger"
              :aria-label="item.label"
              :data-tooltip="`${item.label}（Ctrl / ⌘ K）`"
              aria-haspopup="dialog"
              aria-controls="site-search-dialog"
              :aria-expanded="searchOpen"
              aria-keyshortcuts="Control+K Meta+K"
              @click="openSearch"
            >
              <Icon :name="item.icon" aria-hidden="true" />
            </button>
            <button
              v-else
              type="button"
              class="tool-button desktop-theme-toggle"
              :aria-label="isDarkMode ? item.darkLabel : item.label"
              :data-tooltip="isDarkMode ? item.darkLabel : item.label"
              @click="toggleColorMode"
            >
              <Icon :name="item.darkIcon" class="theme-icon theme-icon-sun" aria-hidden="true" />
              <Icon :name="item.icon" class="theme-icon theme-icon-moon" aria-hidden="true" />
            </button>
          </template>
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

  <ClientOnly>
    <SiteSearch v-model:open="searchOpen" />
  </ClientOnly>
</template>

<script setup lang="ts">
import { Menu as MenuIcon } from '@lucide/vue'
import { isMobileHeaderShortcut, readHeaderShortcuts } from '~~/shared/header-shortcuts'
import SiteSearch from './SiteSearch.vue'
import SiteAccountMenu from './SiteAccountMenu.vue'
import type { MenuTreeItem } from '~/composables/useSiteNavigation'

const props = defineProps<{
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
const shortcuts = computed(() => readHeaderShortcuts(props.siteSettings.header_shortcuts).filter(item => item.enabled))
const route = useRoute()
const renderedPath = useState<string | null>('rendered-route-path', () => null)
const mainNav = useTemplateRef<HTMLElement>('mainNav')
const markerPosition = ref<number | null>(null)
const currentPath = computed(() => menuPath(renderedPath.value ?? route.path))
const activeMenuId = computed(() => {
  const matches = (item: MenuTreeItem | MenuTreeItem['children'][number], path: string) =>
    !item.targetBlank && menuPath(item.url) === path
  const items = props.primaryMenuItems
  const path = currentPath.value
  if (!path) return
  return (
    items.find(item => matches(item, path)) ??
    items.find(item => item.children.some(child => matches(child, path))) ??
    (path.endsWith('.html') ? items.find(item => matches(item, '/archive')) : undefined)
  )?.id
})
const heldMenuItemId = useState<number | null>('site-header-held-menu-item', () => null)
const colorMode = useColorMode()
const isDarkMode = computed(() => colorMode.value === 'dark')
let menuHoldTimer: ReturnType<typeof setTimeout> | undefined
let navResizeObserver: ResizeObserver | undefined

function menuPath(url?: string | null) {
  if (!url?.startsWith('/') || url.startsWith('//')) return
  return url.split(/[?#]/, 1)[0]?.replace(/\/$/, '') || '/'
}

function positionMarker() {
  const active = mainNav.value?.querySelector<HTMLElement>('.nav-item.is-current')
  markerPosition.value = active?.offsetWidth ? active.offsetLeft + active.offsetWidth / 2 - 11 : null
}

watch([activeMenuId, () => props.primaryMenuItems], positionMarker, { flush: 'post' })

onMounted(() => {
  if (!mainNav.value) return
  navResizeObserver = new ResizeObserver(positionMarker)
  navResizeObserver.observe(mainNav.value)
  positionMarker()
})

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
  navResizeObserver?.disconnect()
  if (menuHoldTimer) clearTimeout(menuHoldTimer)
  heldMenuItemId.value = null
})

function openSearch() {
  searchOpen.value = true
}
</script>
