<template>
  <div>
    <header class="site-header" :class="{ 'is-scrolled': isScrolled, 'is-article-route': isArticleRoute }">
      <div class="header-inner">
        <NuxtLink to="/" class="brand" aria-label="返回博客主页" data-tooltip="返回博客主页" @click="handleBrandClick">
          <span
            v-if="siteSettings.site_favicon"
            class="brand-mark brand-mark-mask"
            :style="brandMarkStyle"
            aria-hidden="true"
          />
          <Icon v-else-if="siteSettingsLoaded" name="i-simple-icons-nuxtdotjs" class="brand-mark" aria-hidden="true" />
          <span>{{ brandText }}</span>
        </NuxtLink>

        <button class="scroll-title" aria-label="回到顶部" @click="scrollToTop">
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
            <NuxtLink to="/posts" aria-label="文库" data-tooltip="文库">
              <LibraryIcon aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/archive" aria-label="归档" data-tooltip="归档">
              <ArchiveIcon aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/posts" aria-label="站内搜索" data-tooltip="站内搜索">
              <SearchIcon aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/admin" aria-label="后台" data-tooltip="后台" class="desktop-admin-link">
              <LayoutDashboardIcon aria-hidden="true" />
            </NuxtLink>
            <button
              type="button"
              class="mobile-menu-button"
              aria-label="打开侧边菜单"
              :aria-expanded="mobilePanelOpen"
              @click="mobilePanelOpen = true"
            >
              <MenuIcon aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </header>
    <main>
      <slot />
    </main>

    <Teleport to="body">
      <Transition name="mobile-panel">
        <div v-if="mobilePanelOpen" class="mobile-sidebar-overlay" @click.self="closeMobilePanel">
          <aside class="mobile-sidebar-panel" aria-label="侧边信息">
            <section class="mobile-stats-card">
              <div>
                <span>文章</span>
                <strong>{{ totalPosts }}</strong>
              </div>
              <div>
                <span>标签</span>
                <strong>{{ tags.length }}</strong>
              </div>
              <div>
                <span>分类</span>
                <strong>{{ categories.length }}</strong>
              </div>
            </section>

            <NuxtLink to="/posts" class="mobile-green-card" @click="closeMobilePanel">
              <strong>文章</strong>
              <span>查看全部已发布内容</span>
            </NuxtLink>

            <div class="mobile-panel-group">
              <h3>博客</h3>
              <div class="mobile-panel-grid">
                <NuxtLink
                  v-for="item in mobileMenuItems"
                  :key="item.key"
                  :to="item.to"
                  :target="item.targetBlank ? '_blank' : undefined"
                  :rel="item.targetBlank ? 'noopener noreferrer' : undefined"
                  class="mobile-panel-row"
                  @click="closeMobilePanel"
                >
                  <Icon v-if="item.icon" :name="item.icon" class="mobile-row-icon" aria-hidden="true" />
                  <component v-else :is="footerActionIcon(item.fallbackIcon)" class="mobile-row-icon" aria-hidden="true" />
                  <span>{{ item.title }}</span>
                </NuxtLink>
              </div>
            </div>

            <div v-if="cloudTags.length" class="mobile-panel-group">
              <h3>热门标签</h3>
              <div class="mobile-tag-grid">
                <NuxtLink v-for="tag in cloudTags" :key="tag.name" :to="`/tags/${tag.slug}`" @click="closeMobilePanel">
                  # {{ tag.name }}
                </NuxtLink>
              </div>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <footer class="home-footer">
      <div class="footer-actions" aria-label="底部快捷入口">
        <div class="footer-action-side is-left">
          <NuxtLink
            v-for="link in footerActionLeft"
            :key="`${link.label}-${link.to}`"
            :to="link.to"
            class="footer-action"
            :aria-label="link.label"
            :data-tooltip="link.label"
          >
            <component :is="footerActionIcon(link.icon)" aria-hidden="true" />
          </NuxtLink>
        </div>
        <button class="back-top-button" type="button" aria-label="返回顶部" data-tooltip="返回顶部" @click="scrollToTop">
          <span class="footer-avatar" aria-hidden="true">
            <span class="footer-avatar-head"></span>
            <span class="footer-avatar-body"></span>
          </span>
        </button>
        <div class="footer-action-side is-right">
          <NuxtLink
            v-for="link in footerActionRight"
            :key="`${link.label}-${link.to}`"
            :to="link.to"
            class="footer-action"
            :aria-label="link.label"
            :data-tooltip="link.label"
          >
            <component :is="footerActionIcon(link.icon)" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <div class="footer-links">
        <div v-for="group in footerGroups" :key="group.title">
          <h3>{{ group.title }}</h3>
          <NuxtLink v-for="link in group.links" :key="link.label" :to="link.to">{{ link.label }}</NuxtLink>
        </div>
      </div>

      <div class="footer-bottom">
        <p>
          <template v-for="(part, index) in footerCopyrightParts" :key="`${part.type}-${index}`">
            <strong v-if="part.type === 'siteName'">{{ siteName }}</strong>
            <span v-else>{{ part.text }}</span>
          </template>
        </p>
        <nav>
          <NuxtLink v-for="link in footerBottomLinks" :key="`${link.label}-${link.to}`" :to="link.to">{{ link.label }}</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  Archive as ArchiveIcon,
  Clock3 as Clock3Icon,
  ExternalLink as ExternalLinkIcon,
  Folder as FolderIcon,
  House as HouseIcon,
  LayoutDashboard as LayoutDashboardIcon,
  Library as LibraryIcon,
  Link as LinkIcon,
  LogIn as LogInIcon,
  Mail as MailIcon,
  Menu as MenuIcon,
  Newspaper as NewspaperIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  Tag as TagIcon,
  UserRound as UserRoundIcon
} from '@lucide/vue'

const config = useRuntimeConfig()
const route = useRoute()
const isScrolled = ref(false)
const layoutScrollTitle = useState<string>('layoutScrollTitle', () => '')
const mobilePanelOpen = useState<boolean>('mobilePanelOpen', () => false)
const siteSettings = useSiteSettings()
const siteSettingsLoaded = useSiteSettingsLoaded()

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'HEO')
const brandText = computed(() => siteSettings.value.site_brand || 'DYU')
const brandMarkStyle = computed(() => {
  const url = siteSettings.value.site_favicon
  return url
    ? {
        maskImage: `url("${url}")`,
        WebkitMaskImage: `url("${url}")`
      }
    : undefined
})
const footerCopyrightParts = computed(() => parseFooterCopyright(siteSettings.value.footer_copyright))
const footerBottomLinks = computed(() => {
  return parseFooterBottomLinks(siteSettings.value.footer_bottom_links)
})
const footerActionLinks = computed(() => parseFooterActions(siteSettings.value.footer_actions))
const footerActionLeft = computed(() => footerActionLinks.value.slice(0, Math.ceil(footerActionLinks.value.length / 2)))
const footerActionRight = computed(() => footerActionLinks.value.slice(Math.ceil(footerActionLinks.value.length / 2)))

const footerActionIconMap: Record<string, Component> = {
  'i-lucide-library': LibraryIcon,
  'i-lucide-archive': ArchiveIcon,
  'i-lucide-user-round': UserRoundIcon,
  'i-lucide-settings': SettingsIcon,
  'i-lucide-newspaper': NewspaperIcon,
  'i-lucide-clock-3': Clock3Icon,
  'i-lucide-link': LinkIcon,
  'i-lucide-log-in': LogInIcon,
  'i-lucide-house': HouseIcon,
  'i-lucide-search': SearchIcon,
  'i-lucide-tag': TagIcon,
  'i-lucide-folder': FolderIcon,
  'i-lucide-layout-dashboard': LayoutDashboardIcon,
  'i-lucide-external-link': ExternalLinkIcon,
  'i-lucide-mail': MailIcon,
  'i-lucide-star': StarIcon
}

function footerActionIcon(icon?: string) {
  return footerActionIconMap[icon || ''] || LinkIcon
}

useHead({
  link: computed(() => {
    const links: Array<Record<string, string>> = []
    if (siteSettings.value.site_favicon) {
      links.push({ rel: 'icon', href: siteSettings.value.site_favicon })
    }
    return links
  }),
  meta: computed(() => {
    const meta: Array<Record<string, string>> = []
    if (siteSettings.value.seo_noindex === 'true') {
      meta.push({ name: 'robots', content: 'noindex' })
    }
    if (siteSettings.value.seo_keywords) {
      meta.push({ name: 'keywords', content: siteSettings.value.seo_keywords })
    }
    return meta
  })
})
const footerLinkLimit = 4

type TaxonomyItem = {
  id: number
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

type MenuItem = {
  id: number
  parentId?: number | null
  title: string
  url?: string | null
  type?: string
  targetSlug?: string | null
  badge?: string
  icon?: string
  targetBlank?: boolean
  sort: number
}

type MenuTreeItem = MenuItem & {
  children: MenuItem[]
}

type MenuGroup = {
  id: number
  name: string
  description?: string
  location?: string
  isActive?: boolean
  items: MenuItem[]
}

type PostsPayload = {
  items: unknown[]
  total: number
  pageSize: number
}

const [{ data: categoryData }, { data: tagData }, { data: menuData }, { data: footerMenuData }, { data: postSummaryData }] = await Promise.all([
  useFetch<{ data: TaxonomyItem[] }>('/api/categories'),
  useFetch<{ data: TaxonomyItem[] }>('/api/tags'),
  useFetch<{ data: MenuGroup | null }>('/api/menus'),
  useFetch<{ data: MenuGroup | null }>('/api/menus/FOOTER'),
  useFetch<{ data: PostsPayload }>('/api/posts', { query: { page: 1, pageSize: 1 } })
])

const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const totalPosts = computed(() => postSummaryData.value?.data.total || 0)
const cloudTags = computed(() => tags.value.slice(0, 12))
const primaryMenuItems = computed<MenuTreeItem[]>(() => {
  const items = (menuData.value?.data?.items || []).slice().sort((a, b) => a.sort - b.sort)
  return items
    .filter((item) => !item.parentId)
    .map((item) => ({
      ...item,
      children: items.filter((child) => child.parentId === item.id)
    }))
})
const mobileMenuItems = computed(() => {
  return primaryMenuItems.value.flatMap((item) => {
    const root = {
      key: `root-${item.id}`,
      title: item.title,
      to: item.url || resolveMenuItemPath(item),
      icon: item.icon,
      fallbackIcon: iconForMenuItem(item),
      targetBlank: item.targetBlank
    }

    const children = item.children.map((child) => ({
      key: `child-${child.id}`,
      title: child.title,
      to: child.url || resolveMenuItemPath(child),
      icon: child.icon,
      fallbackIcon: iconForMenuItem(child),
      targetBlank: child.targetBlank
    }))

    return [root, ...children]
  })
})

const footerGroups = computed(() => {
  const items = (footerMenuData.value?.data?.items || []).slice().sort((a, b) => a.sort - b.sort)
  const roots = items.filter((item) => !item.parentId)
  return roots
    .map((root) => {
      const children = items.filter((item) => item.parentId === root.id)
      return {
        title: root.title,
        links: footerLinksFor(root, children)
      }
    })
    .filter((group) => group.links.length)
})

function footerLinksFor(root: MenuItem, children: MenuItem[]) {
  const sourceItems = children.length ? children : [root]
  const links = sourceItems.flatMap((item) => expandedFooterLinks(item))
  return children.length ? links : links.slice(0, footerLinkLimit)
}

function expandedFooterLinks(item: MenuItem) {
  if (item.type === 'CATEGORY' && !item.targetSlug && !item.url) {
    return categories.value.slice(0, footerLinkLimit).map((category) => ({
      label: category.name,
      to: `/categories/${category.slug}`
    }))
  }

  if (item.type === 'TAG' && !item.targetSlug && !item.url) {
    return tags.value.slice(0, footerLinkLimit).map((tag) => ({
      label: tag.name,
      to: `/tags/${tag.slug}`
    }))
  }

  return [{
    label: item.title,
    to: item.url || resolveFooterItemPath(item)
  }]
}

function resolveFooterItemPath(item: MenuItem) {
  if (item.type === 'HOME') return '/'
  if (item.type === 'ARCHIVE') return '/archive'
  if (item.type === 'CATEGORY' && item.targetSlug) return `/categories/${item.targetSlug}`
  if (item.type === 'TAG' && item.targetSlug) return `/tags/${item.targetSlug}`
  if ((item.type === 'POST' || item.type === 'PAGE') && item.targetSlug) return `/${item.targetSlug}`
  return '/'
}

function resolveMenuItemPath(item: MenuItem) {
  return resolveFooterItemPath(item)
}

function iconForMenuItem(item: MenuItem) {
  if (item.type === 'HOME') return 'i-lucide-house'
  if (item.type === 'ARCHIVE') return 'i-lucide-archive'
  if (item.type === 'CATEGORY') return 'i-lucide-folder'
  if (item.type === 'TAG') return 'i-lucide-tag'
  if (item.type === 'POST') return 'i-lucide-newspaper'
  if (item.type === 'PAGE') return 'i-lucide-link'
  if (item.url?.startsWith('/posts')) return 'i-lucide-library'
  if (item.url?.startsWith('/archive')) return 'i-lucide-archive'
  if (item.url === '/') return 'i-lucide-house'
  return 'i-lucide-link'
}

function parseFooterBottomLinks(value: string) {
  const fallback = '文章|/posts\n归档|/archive\n关于|/about\n后台|/admin'
  return (value || fallback)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, to] = line.split('|').map((part) => part?.trim())
      return {
        label: label || '',
        to: to || '/'
      }
    })
    .filter((link) => link.label)
}

function parseFooterActions(value: string) {
  const fallback = [
    { label: '文章', to: '/posts', icon: 'i-lucide-library' },
    { label: '归档', to: '/archive', icon: 'i-lucide-archive' },
    { label: '我的', to: '/about', icon: 'i-lucide-user-round' },
    { label: '后台', to: '/admin', icon: 'i-lucide-settings' },
    { label: '全部文章', to: '/posts', icon: 'i-lucide-newspaper' },
    { label: '时间线', to: '/archive', icon: 'i-lucide-clock-3' },
    { label: '友链', to: '/link', icon: 'i-lucide-link' },
    { label: '登录', to: '/admin/login', icon: 'i-lucide-log-in' }
  ]

  try {
    const parsed = JSON.parse(value || '[]')
    if (!Array.isArray(parsed)) return fallback
    const links = parsed
      .map((item) => ({
        label: String(item?.label || '').trim(),
        to: String(item?.to || '/').trim() || '/',
        icon: String(item?.icon || 'i-lucide-link').trim() || 'i-lucide-link'
      }))
      .filter((item) => item.label)
    return links.length ? links : fallback
  } catch {
    return fallback
  }
}

function parseFooterCopyright(value: string) {
  const text = value || '©2026 {siteName}'
  const chunks = text.split('{siteName}')
  return chunks.flatMap((chunk, index) => [
    ...(chunk ? [{ type: 'text', text: chunk }] : []),
    ...(index < chunks.length - 1 ? [{ type: 'siteName', text: '' }] : [])
  ])
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function closeMobilePanel() {
  mobilePanelOpen.value = false
}

function handleBrandClick() {
  if (route.path === '/') {
    window.dispatchEvent(new CustomEvent('home:reset'))
  }
}

const isArticleRoute = computed(() => route.name === 'slug')

const scrollTitle = computed(() => {
  if (route.name === 'slug') {
    return layoutScrollTitle.value || '文章'
  }

  if (route.path.startsWith('/posts')) {
    return '文库'
  }

  if (route.path.startsWith('/archive')) {
    return '专栏'
  }

  if (route.path.startsWith('/link')) {
    return '友链'
  }

  if (route.path.startsWith('/about')) {
    return '我的'
  }

  return `${siteName.value} - 个人博客`
})

function syncHeaderState() {
  isScrolled.value = window.scrollY > 24
}

onMounted(() => {
  syncHeaderState()
  window.addEventListener('scroll', syncHeaderState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncHeaderState)
})
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-top: 1px solid #f3d8d3;
  background: rgb(247 249 253 / 86%);
  backdrop-filter: blur(18px);
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.site-header.is-scrolled {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.site-header.is-article-route:not(.is-scrolled) {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.header-inner {
  position: relative;
  display: flex;
  width: min(100% - 32px, 1290px);
  height: 70px;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto;
}

.brand {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 5px 10px;
  border-radius: 999px;
  background: transparent;
  color: #303137;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0;
  transition: background .18s ease, box-shadow .18s ease, color .18s ease;
}

.brand:hover,
.brand:focus-visible {
  background: #4f67f5;
  box-shadow: 0 14px 28px rgb(79 103 245 / 24%);
  color: #fff;
  outline: none;
}

.brand-mark {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  font-size: 22px;
  line-height: 1;
}

.brand-mark-mask {
  background: currentColor;
  filter:
    drop-shadow(.45px 0 0 currentColor)
    drop-shadow(-.45px 0 0 currentColor)
    drop-shadow(0 .45px 0 currentColor)
    drop-shadow(0 -.45px 0 currentColor);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
  -webkit-mask-position: center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: contain;
}

.main-nav {
  position: absolute;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 9px;
  transform: translateX(-50%);
  color: #303137;
  font-size: 16px;
  font-weight: 900;
  opacity: 1;
  transition: opacity .18s ease, transform .18s ease;
}

.nav-item {
  position: relative;
}

.nav-item > a {
  display: inline-flex;
  min-width: 58px;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 999px;
  padding: 0 16px;
  color: inherit;
  line-height: 1;
  transition: background .18s ease, box-shadow .18s ease, color .18s ease, transform .18s ease;
}

.nav-item > a:hover,
.nav-item > a:focus-visible,
.nav-item:hover > a {
  background: #4f67f5;
  box-shadow: 0 14px 28px rgb(79 103 245 / 24%);
  color: #fff;
  outline: none;
}

.nav-item > a svg {
  width: 14px;
  height: 14px;
}

.nav-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  display: grid;
  min-width: 180px;
  gap: 4px;
  border: 1px solid #dfe5f2;
  border-radius: 18px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 18px 36px rgb(31 43 68 / 14%);
  padding: 8px;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -6px);
  transition: opacity .16s ease, transform .16s ease;
}

.nav-item:hover .nav-dropdown,
.nav-item:focus-within .nav-dropdown {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, 0);
}

.nav-dropdown a {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  padding: 10px 12px;
  color: #303137;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.nav-dropdown a:hover,
.nav-dropdown a:focus-visible {
  background: #eef2ff;
  color: #4f67f5;
  outline: none;
}

.nav-dropdown svg {
  width: 16px;
  height: 16px;
  color: #64748b;
}

.scroll-title {
  position: absolute;
  left: 50%;
  display: inline-flex;
  max-width: min(520px, 42vw);
  min-height: 44px;
  align-items: center;
  justify-content: center;
  overflow: visible;
  padding: 0 28px;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  color: #303137;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
  opacity: 0;
  transform-origin: center;
  translate: -50% -8px;
  transition: opacity .18s ease, translate .18s ease, color .18s ease;
  white-space: nowrap;
  pointer-events: none;
}

.scroll-title::before {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
  content: "";
  transform: scale(1);
  transform-origin: center;
  transition: box-shadow .18s ease, transform .18s ease;
}

.scroll-title-text {
  position: relative;
  z-index: 1;
  display: block;
  max-width: 100%;
  overflow: hidden;
  line-height: inherit;
  text-overflow: ellipsis;
}

.scroll-title:hover,
.scroll-title:focus-visible {
  color: #4f67f5;
  outline: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  padding: 6px 6px;
  border-radius: 999px;
  background: transparent;
  color: #2f3339;
  font-size: 22px;
  font-weight: 900;
  transition: background .2s ease, box-shadow .2s ease, color .2s ease;
}

.tool-nav a {
  position: relative;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 999px;
  color: inherit;
  transition: background .18s ease, box-shadow .18s ease, color .18s ease, transform .18s ease;
}

.mobile-menu-button {
  display: none;
}

.tool-nav a:hover,
.tool-nav a:focus-visible,
.mobile-menu-button:hover,
.mobile-menu-button:focus-visible {
  background: #4f67f5;
  box-shadow: 0 14px 28px rgb(79 103 245 / 24%);
  color: #fff;
  outline: none;
  transform: translateY(-1px);
}

.brand::after,
.tool-nav a::after,
.mobile-menu-button::after {
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  z-index: 1;
  min-width: max-content;
  padding: 9px 14px;
  border: 1px solid #dfe5f2;
  border-radius: 14px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 12px 28px rgb(31 43 68 / 12%);
  color: #303137;
  content: attr(data-tooltip);
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -6px);
  transition: opacity .16s ease, transform .16s ease;
  white-space: nowrap;
}

.brand:hover::after,
.brand:focus-visible::after,
.tool-nav a:hover::after,
.tool-nav a:focus-visible::after,
.mobile-menu-button:hover::after,
.mobile-menu-button:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.tool-nav svg,
.tool-nav span,
.mobile-menu-button svg,
.mobile-menu-button span {
  width: 20px;
  height: 20px;
}

.site-header.is-article-route:not(.is-scrolled) .brand,
.site-header.is-article-route:not(.is-scrolled) .main-nav,
.site-header.is-article-route:not(.is-scrolled) .tool-nav {
  color: white;
}

.site-header.is-scrolled .brand {
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
}

.site-header.is-scrolled .brand:hover,
.site-header.is-scrolled .brand:focus-visible {
  background: #4f67f5;
  box-shadow: 0 14px 28px rgb(79 103 245 / 24%);
  color: #fff;
}

.site-header.is-scrolled .main-nav {
  opacity: 0;
  transform: translate(-50%, -8px);
  pointer-events: none;
}

.site-header.is-scrolled .scroll-title {
  opacity: 1;
  translate: -50% 0;
  pointer-events: auto;
}

.site-header.is-scrolled .scroll-title:hover,
.site-header.is-scrolled .scroll-title:focus-visible {
  color: #4f67f5;
}

.site-header.is-scrolled .scroll-title:hover::before,
.site-header.is-scrolled .scroll-title:focus-visible::before {
  box-shadow: 0 16px 34px rgb(31 43 68 / 16%);
  transform: scale(1.04);
}

.site-header.is-scrolled .tool-nav {
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
}

@media (max-width: 760px) {
  .header-inner {
    width: min(100% - 32px, 1290px);
    height: 58px;
  }

  .brand {
    min-height: 38px;
    padding: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: #303137;
    font-size: 26px;
    font-weight: 950;
  }

  .brand-mark {
    display: none;
  }

  .main-nav {
    display: none;
  }

  .scroll-title {
    display: none;
  }

  .header-actions {
    gap: 0;
  }

  .tool-nav {
    display: flex;
    min-height: 38px;
    gap: 16px;
    padding: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    color: #303137;
  }

  .site-header.is-scrolled .tool-nav {
    background: transparent;
    box-shadow: none;
  }

  .site-header.is-scrolled .brand {
    background: transparent;
    box-shadow: none;
  }

  .brand:hover,
  .brand:focus-visible {
    background: transparent;
    box-shadow: none;
    color: #303137;
    transform: none;
  }

  .tool-nav a {
    width: 30px;
    height: 38px;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .tool-nav a:hover,
  .tool-nav a:focus-visible,
  .mobile-menu-button:hover,
  .mobile-menu-button:focus-visible {
    background: transparent;
    box-shadow: none;
    color: #303137;
    transform: none;
  }

  .tool-nav .desktop-admin-link {
    display: none !important;
  }

  .mobile-menu-button {
    position: relative;
    display: grid;
    width: 30px;
    height: 38px;
    place-items: center;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0;
  }

  .brand::after,
  .tool-nav a::after,
  .mobile-menu-button::after {
    display: none;
  }

  .tool-nav svg,
  .tool-nav span,
  .mobile-menu-button svg,
  .mobile-menu-button span {
    width: 24px;
    height: 24px;
  }

  .mobile-sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: block;
    background: transparent;
  }

  .mobile-sidebar-panel {
    position: fixed;
    top: 20px;
    right: 12px;
    width: min(76vw, 438px);
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
    border: 1px solid #dfe5f2;
    border-radius: 14px;
    background:
      radial-gradient(circle at 38% 18%, rgb(99 102 241 / 12%), transparent 34%),
      linear-gradient(180deg, #f8f9ff 0%, #fff4ee 58%, #f8fbff 100%);
    box-shadow: 0 22px 46px rgb(30 41 59 / 14%);
    padding: 18px 16px 20px;
    transform-origin: top right;
  }

  .mobile-panel-enter-active,
  .mobile-panel-leave-active {
    transition: opacity .16s ease;
  }

  .mobile-panel-enter-active .mobile-sidebar-panel {
    transition: opacity .2s ease, transform .24s cubic-bezier(.2, .9, .2, 1);
  }

  .mobile-panel-leave-active .mobile-sidebar-panel {
    transition: opacity .14s ease, transform .14s ease;
  }

  .mobile-panel-enter-from,
  .mobile-panel-leave-to {
    opacity: 0;
  }

  .mobile-panel-enter-from .mobile-sidebar-panel,
  .mobile-panel-leave-to .mobile-sidebar-panel {
    opacity: 0;
    transform: translate(10px, -8px) scale(.92);
  }

  .mobile-stats-card {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    border: 1px solid #dfe5f2;
    border-radius: 12px;
    background: rgb(255 255 255 / 88%);
    box-shadow: 0 12px 26px rgb(40 58 90 / 8%);
    padding: 12px 10px;
  }

  .mobile-stats-card div {
    display: grid;
    gap: 3px;
    justify-items: center;
    min-width: 0;
  }

  .mobile-stats-card span {
    color: #69717e;
    font-size: 12px;
    line-height: 1;
  }

  .mobile-stats-card strong {
    color: #303137;
    font-size: 22px;
    font-weight: 900;
    line-height: 1;
  }

  .mobile-green-card {
    display: grid;
    gap: 8px;
    min-height: 118px;
    align-content: center;
    margin-top: 18px;
    overflow: hidden;
    border-radius: 10px;
    background: linear-gradient(135deg, #91d855, #54b93d);
    box-shadow: 0 16px 28px rgb(74 170 54 / 18%);
    color: #fff;
    padding: 20px 32px;
  }

  .mobile-green-card strong {
    font-size: 24px;
    font-weight: 900;
    line-height: 1;
  }

  .mobile-green-card span {
    font-size: 13px;
    font-weight: 800;
  }

  .mobile-panel-group {
    margin-top: 18px;
  }

  .mobile-panel-group h3 {
    margin: 0 0 12px;
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
  }

  .mobile-panel-grid,
  .mobile-tag-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .mobile-panel-row,
  .mobile-tag-grid a {
    display: flex;
    min-width: 0;
    min-height: 54px;
    align-items: center;
    gap: 10px;
    border: 1px solid #dfe5f2;
    border-radius: 10px;
    background: rgb(255 255 255 / 88%);
    color: #303137;
    font-size: 14px;
    font-weight: 600;
    padding: 0 12px;
  }

  .mobile-panel-row span,
  .mobile-tag-grid a {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-row-icon {
    width: 24px;
    height: 24px;
    flex: 0 0 auto;
  }
}

@media (max-width: 420px) {
  .header-inner {
    width: min(100% - 28px, 1290px);
  }

  .brand {
    font-size: 24px;
  }

  .tool-nav {
    gap: 12px;
  }

  .tool-nav a {
    width: 27px;
  }

  .mobile-menu-button {
    width: 27px;
  }

  .tool-nav svg,
  .tool-nav span,
  .mobile-menu-button svg,
  .mobile-menu-button span {
    width: 22px;
    height: 22px;
  }
}

/* ---- footer ---- */

.home-footer {
  margin-top: 40px;
  background: linear-gradient(180deg, #f3f6fc 0%, #fff 26%);
}

.footer-actions {
  display: flex;
  width: min(100% - 32px, 860px);
  align-items: center;
  justify-content: center;
  gap: 46px;
  margin: 0 auto;
  padding: 10px 0 54px;
}

.footer-action-side {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  gap: 46px;
}

.footer-action-side.is-left {
  justify-content: flex-end;
}

.footer-action-side.is-right {
  justify-content: flex-start;
}

.footer-action,
.back-top-button {
  position: relative;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: #3d3f45;
  box-shadow: 0 10px 22px rgb(34 38 46 / 12%);
  color: white;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  transition: background .18s ease, box-shadow .18s ease, transform .18s ease;
}

.footer-action:hover,
.footer-action:focus-visible,
.back-top-button:hover,
.back-top-button:focus-visible {
  background: #4f67f5;
  box-shadow: 0 14px 28px rgb(79 103 245 / 22%);
  outline: none;
  transform: scale(1.12);
}

.footer-action::after,
.back-top-button::after {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  z-index: 1;
  min-width: max-content;
  padding: 7px 11px;
  border: 1px solid #dfe5f2;
  border-radius: 12px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 12px 28px rgb(31 43 68 / 12%);
  color: #303137;
  content: attr(data-tooltip);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 6px);
  transition: opacity .16s ease, transform .16s ease;
  white-space: nowrap;
}

.footer-action:hover::after,
.footer-action:focus-visible::after,
.back-top-button:hover::after,
.back-top-button:focus-visible::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.footer-action :deep(svg),
.footer-action :deep(span) {
  width: 17px;
  height: 17px;
}

.back-top-button {
  position: relative;
  width: 48px;
  height: 48px;
  margin: 0;
  background: linear-gradient(135deg, #ff777c, #f23842);
  box-shadow: 0 14px 28px rgb(242 56 66 / 28%);
  cursor: pointer;
}

.back-top-button:hover,
.back-top-button:focus-visible {
  background: linear-gradient(135deg, #ff777c, #f23842);
  box-shadow: 0 14px 28px rgb(242 56 66 / 28%);
}

.back-top-button::before {
  position: absolute;
  top: 5px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: white;
  content: "";
}

.footer-avatar {
  position: relative;
  display: grid;
  width: 32px;
  height: 36px;
  place-items: center;
}

.footer-avatar-head {
  position: absolute;
  top: 6px;
  width: 12px;
  height: 12px;
  border: 3px solid #fff;
  border-radius: 999px;
  background: #19191d;
}

.footer-avatar-body {
  position: absolute;
  bottom: 2px;
  width: 25px;
  height: 25px;
  border-radius: 999px 999px 10px 10px;
  background: #111217;
}

.footer-avatar-body::before {
  position: absolute;
  top: 9px;
  left: 7px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: white;
  box-shadow: 8px 0 0 white;
  content: "";
}

.footer-links {
  display: grid;
  width: min(100% - 32px, 1180px);
  grid-template-columns: repeat(auto-fit, 160px);
  justify-content: center;
  gap: 92px;
  margin: 0 auto;
  padding: 0 0 50px;
  text-align: center;
}

.footer-links h3 {
  margin: 0 0 12px;
  color: #383a40;
  font-size: 16px;
  font-weight: 900;
}

.footer-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 14px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  color: #626873;
  font-weight: 500;
  transition: background .18s ease, color .18s ease;
}

.footer-links a:hover,
.footer-links a:focus-visible {
  background: #e9edff;
  color: #4f67f5;
  outline: none;
}

.footer-bottom {
  display: flex;
  width: 100%;
  height: 82px;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto;
  padding: 0 max(16px, calc((100% - 1290px) / 2));
  background: #f4f6fa;
  color: #444a55;
}

.footer-bottom p {
  margin: 0;
  line-height: 1;
}

.footer-bottom nav {
  display: flex;
  align-items: center;
  gap: 22px;
  font-weight: 800;
  line-height: 1;
}

@media (max-width: 1100px) {
  .footer-links {
    grid-template-columns: repeat(3, 150px);
    gap: 54px;
  }
}

@media (max-width: 760px) {
  .footer-actions {
    display: grid;
    width: min(100% - 96px, 360px);
    grid-template-columns: repeat(4, 36px);
    justify-content: space-between;
    gap: 24px 18px;
    padding: 8px 0 44px;
  }

  .footer-action-side {
    display: contents;
  }

  .back-top-button {
    display: none;
  }

  .footer-action {
    width: 36px;
    height: 36px;
    background: #303137;
    box-shadow: 0 10px 22px rgb(34 38 46 / 10%);
  }

  .footer-action:hover,
  .footer-action:focus-visible {
    background: #303137;
    box-shadow: 0 10px 22px rgb(34 38 46 / 10%);
    transform: none;
  }

  .footer-action::after {
    display: none;
  }

  .footer-action :deep(svg),
  .footer-action :deep(span) {
    width: 19px;
    height: 19px;
  }

  .footer-links {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    gap: 28px;
  }

  .footer-bottom {
    display: grid;
    height: auto;
    align-items: center;
    justify-content: center;
    justify-items: center;
    gap: 16px;
    padding: 28px 16px 30px;
    color: #303137;
    text-align: center;
  }

  .footer-bottom p {
    font-size: 15px;
    font-weight: 500;
    line-height: 1.4;
  }

  .footer-bottom p strong {
    font-weight: 900;
  }

  .footer-bottom nav {
    justify-content: center;
    flex-wrap: wrap;
    gap: 16px 24px;
    font-size: 16px;
    font-weight: 900;
    line-height: 1.2;
  }
}
</style>
