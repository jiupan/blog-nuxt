import { describe, expect, it } from 'vitest'
import { postPath } from '../app/utils/post-path'

describe('postPath', () => {
  it('appends html suffix to plain slugs', () => {
    expect(postPath('hello-world')).toBe('/hello-world.html')
  })

  it('does not duplicate an existing html suffix', () => {
    expect(postPath('hello-world.html')).toBe('/hello-world.html')
  })

  it('normalizes html suffix case', () => {
    expect(postPath('hello-world.HTML')).toBe('/hello-world.html')
  })

  it('preserves nested slug segments', () => {
    expect(postPath('guides/hello-world')).toBe('/guides/hello-world.html')
  })

  it('keeps encoded characters untouched', () => {
    expect(postPath('%E5%89%8D%E7%AB%AF')).toBe('/%E5%89%8D%E7%AB%AF.html')
  })
})
