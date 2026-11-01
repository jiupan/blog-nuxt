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

export type CreateCategoryRequest = {
  name: string
  slug?: string
  icon?: string | null
  isFeatured?: boolean
}

export type UpdateCategoryRequest = CreateCategoryRequest & {
  slug: string
}

export type CreateTagRequest = {
  name: string
  slug?: string
}

export type UpdateTagRequest = CreateTagRequest & {
  slug: string
}
