import { describe, expect, it, vi } from 'vitest'
import { computed, reactive, watch } from 'vue'
import { absoluteSiteUrl, canonicalSiteUrl, seoPage, serializeJsonLd } from '../app/utils/seo'
import { assertPublicPageExists, usePublicPagination } from '../app/composables/usePublicPagination'

const base = 'https://blog.ittx.cn'
describe('public SEO URLs', () => {
  it('keeps each page canonical while dropping tracking parameters and fragments', () => {
    expect(canonicalSiteUrl('/categories/ai', { page: '2', utm_source: 'share' }, base)).toBe(
      base + '/categories/ai?page=2'
    )
    expect(canonicalSiteUrl('/archive#heading', { page: '1', keyword: 'Nuxt' }, base)).toBe(
      base + '/archive?keyword=Nuxt'
    )
  })
  it.each(['0', '-2', '1.5', 'abc', 'Infinity', '999999999999999999999'])(
    'normalizes invalid page %s before querying posts',
    (value) => expect(seoPage(value)).toBe(1)
  )
  it('supports valid query arrays and absolute share images', () => {
    expect(seoPage(['3', '4'])).toBe(3)
    expect(absoluteSiteUrl('/uploads/cover.webp', base)).toBe(base + '/uploads/cover.webp')
    expect(absoluteSiteUrl('https://cdn.example.com/image.webp', base)).toBe(
      'https://cdn.example.com/image.webp'
    )
    expect(absoluteSiteUrl('javascript:alert(1)', base)).toBe(base + '/')
  })
  it('serializes user titles safely inside JSON-LD script tags', () => {
    const value = { headline: '</script><script>alert(1)</script>' }
    const json = serializeJsonLd(value)
    expect(json).not.toContain('<')
    expect(JSON.parse(json)).toEqual(value)
  })
})

describe('URL driven pagination', () => {
  it('allows the first empty page and rejects pages beyond the final result', () => {
    vi.stubGlobal('createError', (details: object) => Object.assign(new Error(), details))
    try {
      expect(() => assertPublicPageExists({ page: 1, pageSize: 10, total: 0 })).not.toThrow()
      expect(() => assertPublicPageExists({ page: 2, pageSize: 10, total: 11 })).not.toThrow()
      expect(() => assertPublicPageExists({ page: 3, pageSize: 10, total: 11 })).toThrow(
        expect.objectContaining({ statusCode: 404 })
      )
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reads SSR page numbers, retains filters in links, and follows history changes', () => {
    const route = reactive({ path: '/archive', query: { page: '2', category: 'ai', year: '2026' } })
    const push = vi.fn()
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('useRoute', () => route)
    vi.stubGlobal('useRouter', () => ({ push }))
    const { currentPage, pageTo } = usePublicPagination()
    expect(currentPage.value).toBe(2)
    expect(pageTo(3)).toEqual({
      path: '/archive',
      query: { page: '3', category: 'ai', year: '2026' }
    })
    currentPage.value = 1
    expect(push).toHaveBeenCalledWith({
      path: '/archive',
      query: { page: undefined, category: 'ai', year: '2026' }
    })
    route.query.page = '4'
    expect(currentPage.value).toBe(4)
    vi.unstubAllGlobals()
  })
})
