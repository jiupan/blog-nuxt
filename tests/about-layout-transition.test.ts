import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const layoutSource = readFileSync(new URL('../app/layouts/default.vue', import.meta.url), 'utf8')
const aboutSource = readFileSync(new URL('../app/pages/about.vue', import.meta.url), 'utf8')

describe('about layout transition', () => {
  it('keeps layout state tied to the mounted About page instead of the route changing early', () => {
    expect(layoutSource).toContain("useState<boolean>('about-layout-active'")
    expect(layoutSource).not.toContain("computed(() => route.path === '/about')")
    expect(aboutSource).toMatch(/onMounted\(\(\) => \{[\s\S]*aboutLayoutActive\.value = true/)
    expect(aboutSource).toMatch(/onUnmounted\(\(\) => \{[\s\S]*aboutLayoutActive\.value = false/)
  })
})
