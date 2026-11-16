<template>
  <UApp :scroll-body="{ padding: 0, margin: 0 }">
    <div class="route-progress" :class="{ 'is-visible': isLoading }" aria-hidden="true">
      <span />
    </div>
    <span class="sr-only" role="status">{{ isLoading ? '正在打开页面' : '' }}</span>
    <NuxtLayout>
      <NuxtPage v-slot="{ Component, route }">
        <component :is="Component" @vue:mounted="mountPage(route, $event)" />
      </NuxtPage>
    </NuxtLayout>
    <div v-if="failedRoute" class="route-retry">
      <span role="alert">页面暂时打不开</span>
      <button type="button" @click="retryRoute">重试</button>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import type { VNode } from 'vue'
import type { RouteLocationNormalized, RouteLocationNormalizedLoaded } from 'vue-router'
import { commitRouteContent, rememberLeavingPage } from '~/utils/route-navigation'

useSiteSeo()

if (import.meta.server) {
  const vary = useResponseHeader('Vary')
  const fields = String(vary.value ?? '').split(',').map(field => field.trim()).filter(Boolean)
  if (!fields.some(field => field === '*' || field.toLowerCase() === 'cookie')) {
    vary.value = [...fields, 'Cookie'].join(', ')
  }
  if (useUserSession().loggedIn.value) useResponseHeader('Cache-Control').value = 'private, no-store'
}

const router = useRouter()
const nuxtApp = useNuxtApp()
const renderedPath = useState<string | null>('rendered-route-path', () => null)
const failedRoute = shallowRef<{ path: string; chunk: boolean }>()
const isLoading = ref(false)
const chunkErrors = new Set<Error>()
const heldLeaves = new Set<() => void>()
let pendingRoute: RouteLocationNormalized | undefined
let interruptedRoute: RouteLocationNormalized | undefined
let progressTimer: ReturnType<typeof setTimeout> | undefined

function finishProgress() {
  clearTimeout(progressTimer)
  isLoading.value = false
  pendingRoute = undefined
}

function releaseOldContent() {
  for (const leave of heldLeaves) leave()
  heldLeaves.clear()
}

// Nuxt replaces its Suspense boundary when a pending page is superseded.
// In that case, retain the leaving DOM until the replacement mounts.
const interruptedTransition = {
  name: 'route-interrupted',
  mode: 'default' as const,
  onLeave(_element: Element, done: () => void) {
    if (router.currentRoute.value === interruptedRoute) heldLeaves.add(done)
    else done()
  }
}

function mountPage(route: RouteLocationNormalizedLoaded, vnode: VNode) {
  if (router.currentRoute.value.path !== route.path) return
  interruptedRoute = undefined
  releaseOldContent()
  renderedPath.value = route.path
  if (vnode.el instanceof HTMLElement) commitRouteContent(router, route.path, vnode.el)
  if (pendingRoute?.path === route.path) finishProgress()
}

async function retryRoute() {
  const failure = failedRoute.value
  if (!failure) return
  try {
    await router.push(failure.path)
  } catch (error) {
    if (failedRoute.value?.path !== failure.path || !navigator.onLine) return
    if (failure.chunk || (error instanceof Error && chunkErrors.has(error))) reloadAt(failure.path)
  }
}

function reloadAt(path: string) {
  nuxtApp.runWithContext(() => reloadNuxtApp({ path: router.resolve(path).href, persistState: true }))
}

if (import.meta.client) {
  let removeReloadGuard: (() => void) | undefined
  const removeChunkHandler = nuxtApp.hook('app:chunkError', ({ error }) => { chunkErrors.add(error) })
  const removeManifestHandler = nuxtApp.hook('app:manifest:update', () => {
    removeReloadGuard ??= router.beforeResolve(to => reloadAt(to.fullPath))
  })
  const removeGuard = router.beforeEach((to, from) => {
    chunkErrors.clear()
    failedRoute.value = undefined
    rememberLeavingPage(router, to)
    const displayedPath = renderedPath.value ?? from.path
    if (displayedPath !== from.path || heldLeaves.size) {
      interruptedRoute = to
      if (to.meta.pageTransition !== false) to.meta.pageTransition = interruptedTransition
      if (to.meta.layoutTransition !== false) to.meta.layoutTransition = interruptedTransition
    } else {
      interruptedRoute = undefined
    }
    if (to.path.replace(/\/$/, '') === displayedPath.replace(/\/$/, '')) {
      finishProgress()
      return
    }
    pendingRoute = to
    clearTimeout(progressTimer)
    progressTimer = setTimeout(() => { isLoading.value = true }, 160)
  })
  const removeAfterEach = router.afterEach((to, _from, failure) => {
    if (failure && to === pendingRoute) finishProgress()
  })
  const removeErrorHandler = router.onError((error, to, from) => {
    if (pendingRoute && to !== pendingRoute) return
    finishProgress()
    if (router.currentRoute.value === from) failedRoute.value = { path: to.fullPath, chunk: chunkErrors.has(error) }
  })
  onBeforeUnmount(() => {
    releaseOldContent()
    finishProgress()
    removeChunkHandler()
    removeManifestHandler()
    removeReloadGuard?.()
    removeGuard()
    removeAfterEach()
    removeErrorHandler()
  })
}
</script>
