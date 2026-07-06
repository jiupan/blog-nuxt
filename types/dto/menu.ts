export type MenuLocation = 'PRIMARY' | 'FOOTER' | 'MOBILE' | 'CUSTOM'

export type MenuItemType = 'CUSTOM' | 'POST' | 'CATEGORY' | 'TAG' | 'PAGE' | 'ARCHIVE' | 'HOME'

export type MenuItem = {
  id: number | null
  parentId?: number | null
  title: string
  url?: string | null
  type?: MenuItemType | string
  targetId?: number | null
  targetSlug?: string | null
  targetBlank?: boolean
  badge?: string | null
  icon?: string | null
  sort: number
  isVisible?: boolean
}

export type MenuGroup = {
  id: number | null
  name: string
  slug?: string | null
  description?: string | null
  location?: MenuLocation | string
  isActive?: boolean
  items: MenuItem[]
}

export type SaveMenuItemRequest = Omit<MenuItem, 'id'> & {
  id?: number | null
}

export type SaveMenuRequest = Omit<MenuGroup, 'id' | 'items'> & {
  id?: number | null
  items: SaveMenuItemRequest[]
}
