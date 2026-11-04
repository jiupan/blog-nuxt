export type TaxonomySummary = {
  id: number
  name: string
  slug: string
  icon?: string | null
  sort?: number
  isFeatured?: boolean
}

export type TaxonomyItem = TaxonomySummary & {
  _count?: {
    posts: number
  }
}
