import { seoPage } from '../utils/seo'

export function usePublicPagination(
  filters: () => Record<string, string | undefined> = () => ({})
) {
  const route = useRoute()
  const router = useRouter()
  function pageTo(page: number) {
    return {
      path: route.path,
      query: { ...route.query, ...filters(), page: page > 1 ? String(page) : undefined }
    }
  }
  const currentPage = computed({
    get: () => seoPage(route.query.page),
    set: (page: number) => {
      void router.push(pageTo(page))
    }
  })
  watch(currentPage, () => {
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
  })
  return { currentPage, pageTo }
}
