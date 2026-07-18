import type { RouterConfig } from 'nuxt/schema'
import { START_LOCATION } from 'vue-router'

export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition

    if (to.hash) {
      return {
        el: to.hash,
        behavior: from === START_LOCATION ? 'instant' : 'smooth'
      }
    }

    // On a hard refresh the browser restores its previous scroll position
    // before Nuxt finishes hydrating. Nuxt's default START_LOCATION behavior
    // then scrolls to the top a second time; returning false preserves the
    // native restored position instead.
    if (from === START_LOCATION) return false

    if (to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')) return false

    return { left: 0, top: 0 }
  }
}
