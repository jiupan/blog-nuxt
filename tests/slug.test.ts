import { describe, expect, it } from 'vitest'
import { createRandomPostSlug, normalizePostSlug, normalizeSlug } from '../server/utils/slug'

describe('normalizeSlug', () => {
  it('normalizes ascii text into lowercase dash-separated slugs', () => {
    expect(normalizeSlug('  Hello, Nuxt Blog!  ')).toBe('hello-nuxt-blog')
  })

  it('keeps chinese characters and removes quotes', () => {
    expect(normalizeSlug('前端 "性能" 优化')).toBe('前端-性能-优化')
  })

  it('collapses unsafe separators and trims edge dashes', () => {
    expect(normalizeSlug('---React___Vue+++Nuxt---')).toBe('react-vue-nuxt')
  })
})

describe('normalizePostSlug', () => {
  it('removes an html suffix before normalizing', () => {
    expect(normalizePostSlug('Hello-World.HTML')).toBe('hello-world')
  })

  it('decodes url-encoded slugs', () => {
    expect(normalizePostSlug('%E5%89%8D%E7%AB%AF%20Guide.html')).toBe('前端-guide')
  })

  it('falls back to the original value when url decoding fails', () => {
    expect(normalizePostSlug('%E0%A4%A.html')).toBe('e0-a4-a')
  })

  it('returns an empty string when no valid slug characters remain', () => {
    expect(normalizePostSlug('///***.html')).toBe('')
  })
})

describe('createRandomPostSlug', () => {
  it('creates an 8 character slug by default', () => {
    expect(createRandomPostSlug()).toMatch(/^[a-z0-9]{8}$/)
  })

  it('respects a custom length', () => {
    expect(createRandomPostSlug(12)).toMatch(/^[a-z0-9]{12}$/)
  })
})
