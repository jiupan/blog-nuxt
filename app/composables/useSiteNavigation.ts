import type { Component } from 'vue'
import type { ApiResult } from '~~/types/api'
import type { MenuGroup as ApiMenuGroup, MenuItem as ApiMenuItem } from '~~/types/dto/menu'
import type { PublicPostListPayload } from '~~/types/dto/post'
import type { TaxonomyItem as ApiTaxonomyItem } from '~~/types/dto/taxonomy'
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
  Newspaper as NewspaperIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Star as StarIcon,
  Tag as TagIcon,
  UserRound as UserRoundIcon
} from '@lucide/vue'

export type TaxonomyItem = ApiTaxonomyItem

export type MenuItem = Omit<ApiMenuItem, 'id' | 'sort'> & {
  id: number
  sort: number
}

export type MenuTreeItem = MenuItem & {
  children: MenuItem[]
}

export type MenuGroup = Omit<ApiMenuGroup, 'id' | 'items'> & {
  id: number
  items: MenuItem[]
}

export type FooterLink = {
  label: string
  to: string
}

export type FooterGroup = {
  title: string
  links: FooterLink[]
}

export type FooterActionLink = {
  label: string
  to: string
  icon: string
}

export type FooterCopyrightPart = {
  type: 'text' | 'siteName'
  text: string
}

export type MobileMenuItem = {
  key: string
  title: string
  to: string
  icon?: string
  fallbackIcon: string
  targetBlank?: boolean
}

const footerLinkLimit = 4

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

export async function useSiteNavigation() {
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

  const [{ data: categoryData }, { data: tagData }, { data: menuData }, { data: footerMenuData }, { data: postSummaryData }] = await Promise.all([
    useFetch<ApiResult<TaxonomyItem[]>>('/api/categories'),
    useFetch<ApiResult<TaxonomyItem[]>>('/api/tags'),
    useFetch<ApiResult<MenuGroup | null>>('/api/menus'),
    useFetch<ApiResult<MenuGroup | null>>('/api/menus/FOOTER'),
    useFetch<ApiResult<PublicPostListPayload>>('/api/posts', { query: { page: 1, pageSize: 1 } })
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
  const mobileMenuItems = computed<MobileMenuItem[]>(() => {
    return primaryMenuItems.value.flatMap((item) => {
      const root = {
        key: `root-${item.id}`,
        title: item.title,
        to: item.url || resolveMenuItemPath(item),
        icon: item.icon || undefined,
        fallbackIcon: iconForMenuItem(item),
        targetBlank: item.targetBlank
      }

      const children = item.children.map((child) => ({
        key: `child-${child.id}`,
        title: child.title,
        to: child.url || resolveMenuItemPath(child),
        icon: child.icon || undefined,
        fallbackIcon: iconForMenuItem(child),
        targetBlank: child.targetBlank
      }))

      return [root, ...children]
    })
  })

  const footerGroups = computed<FooterGroup[]>(() => {
    const items = (footerMenuData.value?.data?.items || []).slice().sort((a, b) => a.sort - b.sort)
    const roots = items.filter((item) => !item.parentId)
    return roots
      .map((root) => {
        const children = items.filter((item) => item.parentId === root.id)
        return {
          title: root.title,
          links: footerLinksFor(root, children, categories.value, tags.value)
        }
      })
      .filter((group) => group.links.length)
  })

  const footerCopyrightParts = computed(() => parseFooterCopyright(siteSettings.value.footer_copyright))
  const footerBottomLinks = computed(() => parseFooterBottomLinks(siteSettings.value.footer_bottom_links))
  const footerActionLinks = computed(() => parseFooterActions(siteSettings.value.footer_actions))
  const footerActionLeft = computed(() => footerActionLinks.value.slice(0, Math.ceil(footerActionLinks.value.length / 2)))
  const footerActionRight = computed(() => footerActionLinks.value.slice(Math.ceil(footerActionLinks.value.length / 2)))
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

  function footerActionIcon(icon?: string) {
    return footerActionIconMap[icon || ''] || LinkIcon
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

  function openMobilePanel() {
    mobilePanelOpen.value = true
  }

  function handleBrandClick() {
    if (route.path === '/') {
      window.dispatchEvent(new CustomEvent('home:reset'))
    }
  }

  function syncHeaderState() {
    isScrolled.value = window.scrollY > 24
  }

  return {
    siteSettings,
    siteSettingsLoaded,
    siteName,
    brandText,
    brandMarkStyle,
    categories,
    tags,
    totalPosts,
    cloudTags,
    primaryMenuItems,
    mobileMenuItems,
    footerGroups,
    footerCopyrightParts,
    footerBottomLinks,
    footerActionLeft,
    footerActionRight,
    footerActionIcon,
    mobilePanelOpen,
    isScrolled,
    isArticleRoute,
    scrollTitle,
    syncHeaderState,
    scrollToTop,
    closeMobilePanel,
    openMobilePanel,
    handleBrandClick
  }
}

function footerLinksFor(root: MenuItem, children: MenuItem[], categories: TaxonomyItem[], tags: TaxonomyItem[]) {
  const sourceItems = children.length ? children : [root]
  const links = sourceItems.flatMap((item) => expandedFooterLinks(item, categories, tags))
  return children.length ? links : links.slice(0, footerLinkLimit)
}

function expandedFooterLinks(item: MenuItem, categories: TaxonomyItem[], tags: TaxonomyItem[]) {
  if (item.type === 'CATEGORY' && !item.targetSlug && !item.url) {
    return categories.slice(0, footerLinkLimit).map((category) => ({
      label: category.name,
      to: `/categories/${category.slug}`
    }))
  }

  if (item.type === 'TAG' && !item.targetSlug && !item.url) {
    return tags.slice(0, footerLinkLimit).map((tag) => ({
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

function parseFooterCopyright(value: string): FooterCopyrightPart[] {
  const text = value || '©2026 {siteName}'
  const chunks = text.split('{siteName}')
  return chunks.flatMap((chunk, index) => [
    ...(chunk ? [{ type: 'text' as const, text: chunk }] : []),
    ...(index < chunks.length - 1 ? [{ type: 'siteName' as const, text: '' }] : [])
  ])
}
