import type { RouteLocationNormalizedLoaded } from 'vue-router'

type SiteHeaderPage = {
  path: string
  isArticle: boolean
  articleTitle: string
  isScrolled: boolean
}

const scrollThreshold = 24

export function useSiteHeaderPage() {
  const route = useRoute()
  const router = useRouter()
  const page = useState<SiteHeaderPage>('site-header-page', () => ({
    path: route.path,
    isArticle: route.name === 'slug',
    articleTitle: '',
    isScrolled: false
  }))

  function showPage(to: RouteLocationNormalizedLoaded, element: HTMLElement) {
    page.value = {
      path: to.path,
      isArticle: to.name === 'slug',
      articleTitle: element.dataset.articleTitle ?? '',
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
