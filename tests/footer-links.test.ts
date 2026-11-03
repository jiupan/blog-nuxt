import { describe, expect, it } from 'vitest'
import { isPublicFooterLink, parseFooterBottomLinks } from '../app/utils/footer-links'

describe('public footer links', () => {
  it('hides legacy admin entries including absolute URLs and query strings', () => {
    for (const to of ['/admin', '/admin/', '/admin/login?redirect=/', 'https://blog.ittx.cn/admin', '//blog.ittx.cn/admin/login']) {
      expect(isPublicFooterLink(to)).toBe(false)
    }
    expect(parseFooterBottomLinks('关于|/about\n后台|/admin\n登录|/admin/login')).toEqual([
      { label: '关于', to: '/about' }
    ])
  })

  it('keeps explicitly configured public links in order', () => {
    expect(parseFooterBottomLinks('  文章 | /posts \n\n关于|/about\n友链|https://example.com/links')).toEqual([
      { label: '文章', to: '/posts' },
      { label: '关于', to: '/about' },
      { label: '友链', to: 'https://example.com/links' }
    ])
    expect(isPublicFooterLink('/administrator-guide')).toBe(true)
    expect(isPublicFooterLink('')).toBe(true)
  })

  it('allows the owner to clear all auxiliary links', () => {
    expect(parseFooterBottomLinks('')).toEqual([])
    expect(parseFooterBottomLinks(' \n\n ')).toEqual([])
  })
})
