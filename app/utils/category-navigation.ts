import type { TaxonomySummary } from '~~/types/dto/taxonomy'

// The API's complete list remains available to article editors and category pages.
// Filtering only applies to the homepage and archive navigation.
export function categoryNavigation<T extends TaxonomySummary>(
  categories: readonly T[],
  fallbackLimit?: number
): T[] {
  const featured = categories.filter((category) => category.isFeatured)
  return featured.length ? featured : categories.slice(0, fallbackLimit)
}
