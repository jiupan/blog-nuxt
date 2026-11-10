export const bookmarkCategories = {
  ARTICLE: '文章',
  TOOL: '工具',
  SITE: '小站'
} as const

export type BookmarkCategory = keyof typeof bookmarkCategories
export type BookmarkStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN'

export type BookmarkFields = {
  title: string
  url: string
  category: BookmarkCategory
  note: string
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
