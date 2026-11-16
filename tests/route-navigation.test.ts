// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { commitRouteContent, navigateScroll, rememberLeavingPage } from '../app/utils/route-navigation'

function setupRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/archive', '/link'].map(path => ({ path, component: {} }))
  })
}

function pageContent() {
  return document.body.appendChild(document.createElement('main'))
}

afterEach(() => {
  vi.restoreAllMocks()
  history.replaceState(null, '')
  document.body.replaceChildren()
})

describe('route scroll handoff', () => {
  it('starts section animations after the destination mounts and scroll resets', async () => {
    const router = setupRouter()
    const scroll = vi.spyOn(window, 'scrollTo')
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    const content = pageContent()
    const animate = vi.fn(() => {
      expect(scroll).toHaveBeenCalledWith({ left: 0, top: 0, behavior: 'instant' })
    })
    const section = content.appendChild(document.createElement('section'))
    section.dataset.pageEnter = '2'
    Object.assign(section, { animate })

    await router.push('/archive')
    navigateScroll(router, router.currentRoute.value, null)
    expect(animate).not.toHaveBeenCalled()
    commitRouteContent(router, '/archive', content)
    expect(animate).toHaveBeenCalledExactlyOnceWith(
      [{ opacity: .7, translate: '0 12px' }, { opacity: 1, translate: 'none' }],
      expect.objectContaining({ duration: 300, delay: 90 })
    )
  })

  it.each(['position', 'hash', 'reduced motion'])('skips section animation for %s', async (reason) => {
    const router = setupRouter()
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reason === 'reduced motion' } as MediaQueryList)
    const content = pageContent()
    const animate = vi.fn()
    const section = content.appendChild(document.createElement('section'))
    section.dataset.pageEnter = '0'
    Object.assign(section, { animate })

    await router.push(reason === 'hash' ? '/archive#topic' : '/archive')
    commitRouteContent(router, '/archive', content)
    navigateScroll(router, router.currentRoute.value, reason === 'position' ? { left: 0, top: 480 } : null)
    expect(animate).not.toHaveBeenCalled()
  })

  it('keeps the old scroll position until the destination mounts', async () => {
    const router = setupRouter()
    const scroll = vi.spyOn(window, 'scrollTo')
    const content = pageContent()
    const onReady = vi.fn(() => {
      expect(scroll).toHaveBeenCalledWith({ left: 0, top: 0, behavior: 'instant' })
    })
    await router.push('/')
    commitRouteContent(router, '/', pageContent())

    await router.push('/archive')
    navigateScroll(router, router.currentRoute.value, null, onReady)
    expect(scroll).not.toHaveBeenCalled()
    expect(onReady).not.toHaveBeenCalled()

    commitRouteContent(router, '/archive', content)
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ left: 0, top: 0, behavior: 'instant' })
    expect(onReady).toHaveBeenCalledExactlyOnceWith(content)
  })

  it('ignores a superseded page and restores the latest history position', async () => {
    const router = setupRouter()
    const scroll = vi.spyOn(window, 'scrollTo')
    const stale = vi.fn()
    const content = pageContent()
    const onReady = vi.fn(() => {
      expect(scroll).toHaveBeenCalledWith({ left: 0, top: 480, behavior: 'instant' })
    })
    await router.push('/archive')
    navigateScroll(router, router.currentRoute.value, null, stale)
    await router.push('/link')
    navigateScroll(router, router.currentRoute.value, { left: 0, top: 480 }, onReady)
    commitRouteContent(router, '/archive', pageContent())
    expect(scroll).not.toHaveBeenCalled()

    commitRouteContent(router, '/link', content)
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ left: 0, top: 480, behavior: 'instant' })
    expect(stale).not.toHaveBeenCalled()
    expect(onReady).toHaveBeenCalledExactlyOnceWith(content)
  })

  it('restores the active layout’s scroll container for a history entry', async () => {
    const router = setupRouter()
    const container = pageContent()
    container.dataset.routeScrollContainer = ''
    const content = container.appendChild(document.createElement('section'))
    const scroll = vi.spyOn(container, 'scrollTo')

    await router.push('/archive')
    history.replaceState({ position: 1 }, '')
    commitRouteContent(router, '/archive', content)
    container.scrollTop = 600
    router.beforeEach(to => rememberLeavingPage(router, to))
    await router.push('/link')
    history.replaceState({ position: 2 }, '')
    commitRouteContent(router, '/link', content)
    navigateScroll(router, router.currentRoute.value, null)
    expect(scroll).toHaveBeenLastCalledWith({ left: 0, top: 0, behavior: 'instant' })

    await router.push('/archive')
    history.replaceState({ position: 1 }, '')
    navigateScroll(router, router.currentRoute.value, { left: 0, top: 0 })
    commitRouteContent(router, '/archive', content)
    expect(scroll).toHaveBeenLastCalledWith({ left: 0, top: 600, behavior: 'instant' })
  })
})
