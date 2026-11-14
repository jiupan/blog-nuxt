import { describe, expect, it } from 'vitest'
import { mergeFooterArchiveLinks, parseFooterBottomLinks } from '../app/utils/footer-links'

describe('footer links', () => {
  it('preserves explicitly configured admin destinations', () => {
    expect(parseFooterBottomLinks('关于|/about\n后台|/admin\n登录|https://example.com/admin/login?redirect=/')).toEqual([
      { label: '关于', to: '/about' },
      { label: '后台', to: '/admin' },
      { label: '登录', to: 'https://example.com/admin/login?redirect=/' }
    ])
  })

  it('keeps explicitly configured public links in order', () => {
    expect(parseFooterBottomLinks('  文章 | /posts \n\n关于|/about\n友链|https://example.com/links')).toEqual([
      { label: '文章', to: '/posts' },
      { label: '关于', to: '/about' },
      { label: '友链', to: 'https://example.com/links' }
    ])
  })

  it('allows the owner to clear all auxiliary links', () => {
    expect(parseFooterBottomLinks('')).toEqual([])
    expect(parseFooterBottomLinks(' \n\n ')).toEqual([])
  })

  it('merges old listing shortcuts while preserving other links', () => {
    expect(mergeFooterArchiveLinks(parseFooterBottomLinks(
      '文章|/posts\n归档|/archive/\n时间线|/archive\nNuxt|/posts?keyword=Nuxt&page=2\n关于|/about'
    ))).toEqual([
      { label: '归档', to: '/archive' },
      { label: 'Nuxt', to: '/archive?keyword=Nuxt&page=2' },
      { label: '关于', to: '/about' }
    ])
    expect(mergeFooterArchiveLinks([{ label: '文章', to: '/posts' }])).toEqual([
      { label: '文章', to: '/archive' }
    ])
  })
})
