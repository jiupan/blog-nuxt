import type { RouterConfig } from 'nuxt/schema'
import { START_LOCATION } from 'vue-router'
import { useSiteHeaderPage } from './composables/useSiteHeaderPage'
import { navigateScroll, scrollToRouteAnchor, updateRouteHistory } from './utils/route-navigation'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // On a hard refresh the browser restores its previous scroll position
    // before Nuxt finishes hydrating. Nuxt's default START_LOCATION behavior
    // then scrolls to the top a second time; returning false preserves the
    // native restored position instead.
    if (from === START_LOCATION) {
      if (savedPosition) return { ...savedPosition, behavior: 'instant' }
      return to.hash ? scrollToRouteAnchor(to.hash, 'instant') : false
    }

    const router = useRouter()
    updateRouteHistory(router, to)
    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) {
      if (savedPosition) {
        navigateScroll(router, to, savedPosition)
        return false
      }
      if (to.hash) {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
        return scrollToRouteAnchor(to.hash, reduced ? 'instant' : 'smooth')
      }
      return false
    }

    const { showPage } = useSiteHeaderPage()
    navigateScroll(router, to, savedPosition, (element) => showPage(to, element))
    return false
  }
}
