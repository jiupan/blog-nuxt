export const bookmarkCategories = {
  ARTICLE: '文章',
  TOOL: '在线工具',
  SITE: '网站'
} as const

export type BookmarkCategory = keyof typeof bookmarkCategories
export type BookmarkStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN'

export const friendLinkGroups = {
  RECOMMENDED: '博客与网站',
  LIFE: '生活',
  TECH: '技术'
} as const

export type FriendLinkGroup = keyof typeof friendLinkGroups

export type BookmarkFields = {
  title: string
  url: string
  category: BookmarkCategory
  note: string
  friendGroup?: FriendLinkGroup
  isSpotlight?: boolean
  avatar?: string
  cover?: string
}

export function bookmarkSection(item: Pick<BookmarkFields, 'category' | 'friendGroup'>) {
  return item.category === 'SITE' ? item.friendGroup ?? 'RECOMMENDED' : item.category
}

export function bookmarkSectionLabel(item: Pick<BookmarkFields, 'category' | 'friendGroup'>) {
  return item.category === 'SITE' ? friendLinkGroups[item.friendGroup ?? 'RECOMMENDED'] : bookmarkCategories[item.category]
}

export type PublicBookmark = BookmarkFields & {
  id: number
  publishedAt: string | null
}

export type AdminBookmark = PublicBookmark & {
  status: BookmarkStatus
}

export type BookmarkPageSettings = {
  title: string
  intro: string
  showRandom: boolean
  featuredId: number | null
  applicationEmail?: string
  reportUrl?: string
}

export type PublicBookmarksPayload = {
  settings: BookmarkPageSettings
  items: PublicBookmark[]
}

export type AdminBookmarksPayload = {
  settings: BookmarkPageSettings
  items: AdminBookmark[]
  revision: number
}

export type BookmarkAction =
  | { action: 'save'; id?: number; fields: BookmarkFields; status: 'DRAFT' | 'PUBLISHED' }
  | { action: 'hide'; id: number }
  | { action: 'reorder'; ids: number[] }
  | { action: 'settings'; settings: BookmarkPageSettings }
