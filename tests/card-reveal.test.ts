import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readSource = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('article card progressive reveal', () => {
  it('keeps real cards visible in the server-rendered fallback', () => {
    const source = readSource('app/components/CardReveal.vue')

    expect(source).toContain('const revealed = ref(true)')
    expect(source).toContain('const placeholderVisible = ref(false)')
    expect(source).not.toContain(':aria-hidden="!revealed"')
    expect(source).not.toContain(':inert="!revealed"')
  })

  it('uses explicit component imports on every card collection page', () => {
    for (const path of ['app/pages/index.vue', 'app/pages/archive.vue', 'app/components/PostCollection.vue']) {
      const source = readSource(path)
      expect(source).toContain("import CardReveal from '~/components/CardReveal.vue'")
      expect(source).not.toContain('<LazyCardReveal')
    }
  })

  it('switches the home card layout with CSS instead of a client-only media query', () => {
    const source = readSource('app/pages/index.vue')

    expect(source).toContain('.home-archive-desktop { display: none; }')
    expect(source).toContain('.home-grid-mobile { display: grid; }')
    expect(source).not.toContain('isMobileCardViewport')
    expect(source).not.toContain('mobileCardMedia')
  })
})
