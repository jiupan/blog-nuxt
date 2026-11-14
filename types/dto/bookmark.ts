export type BookmarkStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN'

export type BookmarkSectionFields = { name: string; description: string }
export type BookmarkSection = BookmarkSectionFields & { id: number }

export type BookmarkFields = {
  title: string
  url: string
  sectionId: number
  note: string
  isSpotlight?: boolean
  avatar?: string
  cover?: string
}

export type PublicBookmark = BookmarkFields & {
  id: number
  sectionName: string
  publishedAt: string | null
}

export function isBookmarkSpotlight(item: Pick<PublicBookmark, 'id' | 'isSpotlight'>, featuredId?: number | null) {
  return Boolean(item.isSpotlight || item.id === featuredId)
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
  sections: BookmarkSection[]
  items: PublicBookmark[]
}

export type AdminBookmarksPayload = Omit<PublicBookmarksPayload, 'items'> & {
  items: AdminBookmark[]
  revision: number
}

export type BookmarkAction =
  | { action: 'save'; id?: number; fields: BookmarkFields; status: 'DRAFT' | 'PUBLISHED' }
  | { action: 'hide'; id: number }
  | { action: 'delete'; id: number }
  | { action: 'spotlight'; id: number; enabled: boolean }
  | { action: 'reorder'; ids: number[] }
  | { action: 'saveSection'; id?: number; fields: BookmarkSectionFields }
  | { action: 'deleteSection'; id: number }
  | { action: 'reorderSections'; ids: number[] }
  | { action: 'settings'; settings: Omit<BookmarkPageSettings, 'featuredId'> & { featuredId?: number | null } }
