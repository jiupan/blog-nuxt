import type { RouteLocationNormalizedLoaded } from 'vue-router'

type SiteHeaderPage = {
  path: string
  isArticle: boolean
  title: string | null
  isScrolled: boolean
}

const scrollThreshold = 24

export function useSiteHeaderPage() {
  const route = useRoute()
  const router = useRouter()
  const page = useState<SiteHeaderPage>('site-header-page', () => ({
    path: route.path,
    isArticle: route.name === 'slug',
    title: null,
    isScrolled: false
  }))

  function showPage(to: RouteLocationNormalizedLoaded, element: HTMLElement) {
    const heading = element.dataset.scrollTitle?.trim() || element.dataset.articleTitle || element.querySelector('h1')?.textContent
    page.value = {
      path: to.path,
      isArticle: to.name === 'slug',
      title: to.path === '/' ? null : (heading || '').replace(/\s+/g, ' ').trim(),
      isScrolled: window.scrollY > scrollThreshold
    }
  }

  function syncScroll() {
    if (router.currentRoute.value.path.replace(/\/$/, '') !== page.value.path.replace(/\/$/, '')) return
    const isScrolled = window.scrollY > scrollThreshold
    if (page.value.isScrolled !== isScrolled) page.value = { ...page.value, isScrolled }
  }

  return { page, showPage, syncScroll }
}
