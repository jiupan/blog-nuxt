import type { RouteLocationNormalized, RouteLocationNormalizedLoaded, Router } from 'vue-router'

type Position = { left: number; top: number }
type ContainerPosition = { path: string; position: Position }

type RouteScroll = {
  to: RouteLocationNormalizedLoaded
  savedPosition: Position | null
  keyboard: boolean
  onReady?: (element: HTMLElement) => void
}

// The browser's scroll request and Nuxt's page mount can arrive in either order.
const pages = new WeakMap<Router, { path: string; element: HTMLElement; historyIndex?: number }>()
const requests = new WeakMap<Router, RouteScroll>()
const keyboardRoutes = new WeakSet<RouteLocationNormalized>()
const containerPositions = new WeakMap<Router, Map<number, ContainerPosition>>()

function scrollContainer(element: HTMLElement) {
  return element.closest<HTMLElement>('[data-route-scroll-container]')
}

function historyIndex(): number | undefined {
  const position: unknown = window.history.state?.position
  return typeof position === 'number' ? position : undefined
}

export function rememberLeavingPage(router: Router, to: RouteLocationNormalized) {
  if (document.activeElement?.matches(':focus-visible')) keyboardRoutes.add(to)

  const page = pages.get(router)
  if (page?.historyIndex === undefined || !page.element.isConnected) return
  const container = scrollContainer(page.element)
  if (!container) return

  const entries = containerPositions.get(router) ?? new Map<number, ContainerPosition>()
  entries.set(page.historyIndex, { path: page.path, position: { left: container.scrollLeft, top: container.scrollTop } })
  containerPositions.set(router, entries)
}

export function updateRouteHistory(router: Router, to: RouteLocationNormalizedLoaded) {
  const page = pages.get(router)
  if (page && page.path === to.path && router.currentRoute.value === to) page.historyIndex = historyIndex()
}

export function scrollToRouteAnchor(hash: string, behavior: ScrollBehavior) {
  const el = document.getElementById(hash.slice(1))
  if (!el) return false
  const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  const header = document.querySelector<HTMLElement>('.site-header, .admin-topbar')
  return { el, top: margin || (header ? header.offsetHeight + 12 : 0), behavior }
}

function applyScroll(router: Router, element: HTMLElement, request: RouteScroll) {
  if (router.currentRoute.value !== request.to) return

  // Measure anchor positions with the destination sections in their final positions.
  if (request.savedPosition || request.to.hash) element.dataset.routeSkipEnter = ''

  const container = scrollContainer(element)
  const scroller = container ?? window
  const anchor = request.to.hash && scrollToRouteAnchor(request.to.hash, 'instant')
  if (request.savedPosition) {
    const index = historyIndex()
    const entry = index === undefined ? undefined : containerPositions.get(router)?.get(index)
    const position = container ? (entry?.path === request.to.path ? entry.position : { left: 0, top: 0 }) : request.savedPosition
    scroller.scrollTo({ ...position, behavior: 'instant' })
  } else if (anchor) {
    const viewportTop = container?.getBoundingClientRect().top ?? 0
    scroller.scrollTo({
      top: (container?.scrollTop ?? window.scrollY) + anchor.el.getBoundingClientRect().top - viewportTop - anchor.top,
      behavior: 'instant'
    })
  } else {
    scroller.scrollTo({ left: 0, top: 0, behavior: 'instant' })
  }

  if (request.keyboard && !request.savedPosition) {
    const target = (anchor && anchor.el) || element.querySelector<HTMLElement>('h1, [role="heading"][aria-level="1"]') || element
    if (target.tabIndex < 0 && !target.hasAttribute('tabindex')) target.tabIndex = -1
    target.dataset.routeFocus = ''
    target.focus({ preventScroll: true })
  }

  request.onReady?.(element)
}

export function navigateScroll(
  router: Router,
  to: RouteLocationNormalizedLoaded,
  savedPosition: RouteScroll['savedPosition'],
  onReady?: RouteScroll['onReady']
) {
  if (router.currentRoute.value !== to) return
  const request = { to, savedPosition, keyboard: keyboardRoutes.has(to) || !!document.activeElement?.matches(':focus-visible'), onReady }
  const page = pages.get(router)
  if (page?.path === to.path && page.element.isConnected) {
    requests.delete(router)
    applyScroll(router, page.element, request)
  } else {
    requests.set(router, request)
  }
}

export function commitRouteContent(router: Router, path: string, element: HTMLElement) {
  if (router.currentRoute.value.path !== path) return
  pages.set(router, { path, element, historyIndex: historyIndex() })
  const request = requests.get(router)
  if (!request) return
  requests.delete(router)
  if (path === request.to.path) applyScroll(router, element, request)
}
