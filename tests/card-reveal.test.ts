import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('article card layouts', () => {
  it('renders archive cards directly when filters change', () => {
    const source = readSource('app/pages/archive.vue')

    expect(source).toContain('<ArchivePostCard v-for="post in posts"')
    expect(source).not.toMatch(/<(?:Lazy)?CardReveal\b/)
  })

  it('switches the home card layout with CSS instead of a client-only media query', () => {
    const source = readSource('app/pages/index.vue')

    expect(source).toContain('.home-archive-desktop { display: none; }')
    expect(source).toContain('.home-grid-mobile { display: grid; }')
    expect(source).not.toContain('isMobileCardViewport')
    expect(source).not.toContain('mobileCardMedia')
  })
})
