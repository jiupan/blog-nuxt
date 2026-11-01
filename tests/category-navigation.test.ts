import { describe, expect, it } from 'vitest'
import { categoryNavigation } from '../app/utils/category-navigation'

const categories = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: `Category ${index + 1}`,
  slug: `category-${index + 1}`
}))

describe('public category navigation', () => {
  it('preserves the existing homepage and archive defaults before any recommendations', () => {
    expect(categoryNavigation(categories)).toEqual(categories)
    expect(categoryNavigation(categories, 6)).toEqual(categories.slice(0, 6))
    expect(categoryNavigation([])).toEqual([])
  })

  it('only displays recommended categories in manual order, including those beyond the old archive limit', () => {
    const items = categories.map((item) => ({ ...item, isFeatured: [3, 8].includes(item.id) }))
    expect(categoryNavigation(items).map((item) => item.id)).toEqual([3, 8])
    expect(categoryNavigation(items, 6).map((item) => item.id)).toEqual([3, 8])
    expect(items).toHaveLength(8)
  })

  it('shows every selected category and returns to defaults when all recommendations are removed', () => {
    const selected = categories.map((item) => ({ ...item, isFeatured: true }))
    expect(categoryNavigation(selected, 6)).toHaveLength(8)
    expect(categoryNavigation(selected.map((item) => ({ ...item, isFeatured: false })), 6)).toHaveLength(6)
  })
})
