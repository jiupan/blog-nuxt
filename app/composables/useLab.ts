import { labFeatures } from '~/components/lab/lab-features'
import type {
  AskResult,
  DraftOrganizerResult,
  DraftPriority,
  LabFeature,
  LinkCheckResult,
  LinkCheckStatus,
  MonthlyReviewResult,
  RecommendResultItem,
  SemanticSearchResult,
  SeoCheckResult,
  SiteInsightsResult,
  SummaryPost,
  SummaryResult,
  WritingAssistantResult
} from '~/components/lab/lab.types'
import { getApiErrorMessage } from '~/utils/api-error'

export function useLab() {
  const features = labFeatures
  const selectedFeature = ref<LabFeature | null>(null)
  const modalLoading = ref(false)
  const summaryPostId = ref('')
  const summaryLoading = ref(false)
  const summaryError = ref('')
  const summaryResult = ref<SummaryResult | null>(null)
  const recommendLoading = ref(false)
  const recommendError = ref('')
  const recommendResult = ref<RecommendResultItem[]>([])
  const writingLoading = ref(false)
  const writingError = ref('')
  const writingResult = ref<WritingAssistantResult | null>(null)
  const seoCheckLoading = ref(false)
  const seoCheckError = ref('')
  const seoCheckResult = ref<SeoCheckResult | null>(null)
  const askQuestion = ref('')
  const askLoading = ref(false)
  const askError = ref('')
  const askResult = ref<AskResult | null>(null)
  const linkCheckLoading = ref(false)
  const linkCheckError = ref('')
  const linkCheckResult = ref<LinkCheckResult | null>(null)
  const draftOrganizerLoading = ref(false)
  const draftOrganizerError = ref('')
  const draftOrganizerResult = ref<DraftOrganizerResult | null>(null)
  const siteInsightsLoading = ref(false)
  const siteInsightsError = ref('')
  const siteInsightsResult = ref<SiteInsightsResult | null>(null)
  const monthlyReviewMonth = ref(currentMonthValue())
  const monthlyReviewLoading = ref(false)
  const monthlyReviewError = ref('')
  const monthlyReviewResult = ref<MonthlyReviewResult | null>(null)
  const monthlyCopied = ref(false)
  const monthlyCopyError = ref('')
  const semanticQuery = ref('')
  const semanticLoading = ref(false)
  const semanticError = ref('')
  const semanticResults = ref<SemanticSearchResult[]>([])
  const summarySelectOpen = ref(false)
  const summarySelectRef = ref<HTMLElement | null>(null)
  let modalTimer: ReturnType<typeof setTimeout> | undefined

  const { data: sessionData } = useFetch<{ data: { user: { role?: string, username?: string } | null } }>('/api/auth/me')
  const { data: summaryPostData } = useFetch<{ data: { items: SummaryPost[] } }>('/api/posts', {
    query: { page: 1, pageSize: 50 }
  })

  const summaryPosts = computed(() => summaryPostData.value?.data.items || [])
  const isAdmin = computed(() => sessionData.value?.data.user?.role === 'ADMIN')
  const selectedSummaryPost = computed(() => {
    return summaryPosts.value.find((post) => String(post.id) === summaryPostId.value)
  })
  const seoCheckProblems = computed(() => seoCheckResult.value?.issues.filter((issue) => issue.type !== 'success') || [])
  const askQuestionLength = computed(() => askQuestion.value.trim().length)
  const primaryActionLabel = computed(() => {
    if (selectedFeature.value?.id === 'ask-blog' && askLoading.value) return '正在回答'
    if (selectedFeature.value?.id === 'ask-blog') return '开始提问'
    if (selectedFeature.value?.id === 'semantic-search') return '开始搜索'
    if (selectedFeature.value?.id === 'article-summary') return '生成摘要'
    if (selectedFeature.value?.id === 'writing-assistant') return '开始分析'
    if (selectedFeature.value?.id === 'article-recommend') return '生成推荐'
    if (selectedFeature.value?.id === 'seo-checker') return '开始检查'
    if (selectedFeature.value?.id === 'dead-link-checker' && linkCheckLoading.value) return '正在检查'
    if (selectedFeature.value?.id === 'dead-link-checker') return '检查外链'
    if (selectedFeature.value?.id === 'draft-organizer' && draftOrganizerLoading.value) return '正在整理'
    if (selectedFeature.value?.id === 'draft-organizer') return '整理草稿'
    if (selectedFeature.value?.id === 'site-insights' && siteInsightsLoading.value) return '正在分析'
    if (selectedFeature.value?.id === 'site-insights') return '生成洞察'
    if (selectedFeature.value?.id === 'monthly-review' && monthlyReviewLoading.value) return '正在生成'
    if (selectedFeature.value?.id === 'monthly-review') return '生成月报'
    return '启动功能'
  })
  const isPrimaryActionDisabled = computed(() => {
    if (selectedFeature.value?.id === 'ask-blog') {
      return askQuestionLength.value < 5 || askQuestionLength.value > 300 || askLoading.value
    }

    if (selectedFeature.value?.id === 'article-summary') {
      return !summaryPostId.value || summaryLoading.value
    }

    if (selectedFeature.value?.id === 'article-recommend') {
      return !summaryPostId.value || recommendLoading.value
    }

    if (selectedFeature.value?.id === 'writing-assistant') {
      return !summaryPostId.value || writingLoading.value
    }

    if (selectedFeature.value?.id === 'seo-checker') {
      return !summaryPostId.value || seoCheckLoading.value
    }

    if (selectedFeature.value?.id === 'dead-link-checker') {
      return !summaryPostId.value || linkCheckLoading.value
    }

    if (selectedFeature.value?.id === 'draft-organizer') {
      return draftOrganizerLoading.value
    }

    if (selectedFeature.value?.id === 'site-insights') {
      return siteInsightsLoading.value
    }

    if (selectedFeature.value?.id === 'monthly-review') {
      return !monthlyReviewMonth.value || monthlyReviewLoading.value
    }

    if (selectedFeature.value?.id === 'semantic-search') {
      return !semanticQuery.value.trim() || semanticLoading.value
    }

    return false
  })

  function resetFeatureResults() {
    summaryError.value = ''
    summaryResult.value = null
    recommendError.value = ''
    recommendResult.value = []
    writingError.value = ''
    writingResult.value = null
    seoCheckError.value = ''
    seoCheckResult.value = null
    askError.value = ''
    askResult.value = null
    linkCheckError.value = ''
    linkCheckResult.value = null
    draftOrganizerError.value = ''
    draftOrganizerResult.value = null
    siteInsightsError.value = ''
    siteInsightsResult.value = null
    monthlyReviewError.value = ''
    monthlyReviewResult.value = null
    monthlyCopied.value = false
    monthlyCopyError.value = ''
    semanticError.value = ''
    semanticResults.value = []
  }

  function openFeature(feature: LabFeature) {
    selectedFeature.value = feature
    resetFeatureResults()

    if (features.some((item) => item.id === feature.id)) {
      modalLoading.value = false
      clearTimeout(modalTimer)
      return
    }

    modalLoading.value = true
    clearTimeout(modalTimer)
    modalTimer = setTimeout(() => {
      modalLoading.value = false
    }, 1500)
  }

  function closeFeature() {
    selectedFeature.value = null
    modalLoading.value = false
    summaryLoading.value = false
    recommendLoading.value = false
    writingLoading.value = false
    seoCheckLoading.value = false
    askLoading.value = false
    linkCheckLoading.value = false
    draftOrganizerLoading.value = false
    siteInsightsLoading.value = false
    monthlyReviewLoading.value = false
    semanticLoading.value = false
    summarySelectOpen.value = false
    resetFeatureResults()
    clearTimeout(modalTimer)
  }

  function selectSummaryPost(post: SummaryPost) {
    summaryPostId.value = String(post.id)
    summaryResult.value = null
    summaryError.value = ''
    recommendResult.value = []
    recommendError.value = ''
    writingResult.value = null
    writingError.value = ''
    seoCheckResult.value = null
    seoCheckError.value = ''
    linkCheckResult.value = null
    linkCheckError.value = ''
    summarySelectOpen.value = false
  }

  function handlePrimaryAction() {
    if (selectedFeature.value?.id === 'ask-blog') {
      askBlogQuestion()
    } else if (selectedFeature.value?.id === 'article-summary') {
      generateSummary()
    } else if (selectedFeature.value?.id === 'semantic-search') {
      runSemanticSearch()
    } else if (selectedFeature.value?.id === 'article-recommend') {
      generateRecommendation()
    } else if (selectedFeature.value?.id === 'writing-assistant') {
      generateWritingAnalysis()
    } else if (selectedFeature.value?.id === 'seo-checker') {
      generateSeoCheck()
    } else if (selectedFeature.value?.id === 'dead-link-checker') {
      checkExternalLinks()
    } else if (selectedFeature.value?.id === 'draft-organizer') {
      organizeDrafts()
    } else if (selectedFeature.value?.id === 'site-insights') {
      generateSiteInsights()
    } else if (selectedFeature.value?.id === 'monthly-review') {
      generateMonthlyReview()
    }
  }

  async function askBlogQuestion() {
    const question = askQuestion.value.trim()
    if (question.length < 5 || question.length > 300 || askLoading.value) return

    askLoading.value = true
    askError.value = ''
    askResult.value = null

    try {
      const response = await $fetch<{ data: AskResult }>('/api/ai/ask', {
        method: 'POST',
        body: { question }
      })
      askResult.value = response.data
    } catch (error: any) {
      askError.value = getLabApiErrorMessage(error, '问答生成失败，请检查 AI 配置和索引状态', '请先登录后再使用问问博客')
    } finally {
      askLoading.value = false
    }
  }

  async function runSemanticSearch() {
    const query = semanticQuery.value.trim()
    if (!query || semanticLoading.value) return

    semanticLoading.value = true
    semanticError.value = ''
    semanticResults.value = []

    try {
      const response = await $fetch<{ data: { items: SemanticSearchResult[] } }>('/api/ai/search', {
        query: { q: query, limit: 8 }
      })
      semanticResults.value = response.data.items
      if (!semanticResults.value.length) {
        semanticError.value = '没有找到相关内容，请先确认已在后台重建 AI 索引。'
      }
    } catch (error: any) {
      semanticError.value = getLabApiErrorMessage(error, '语义搜索失败，请检查 Embedding 配置和索引状态')
    } finally {
      semanticLoading.value = false
    }
  }

  async function generateSummary() {
    if (!summaryPostId.value || summaryLoading.value) return

    summaryLoading.value = true
    summaryError.value = ''
    summaryResult.value = null

    try {
      const response = await $fetch<{ data: { result: SummaryResult } }>('/api/ai/summarize', {
        method: 'POST',
        body: { postId: Number(summaryPostId.value) }
      })
      summaryResult.value = response.data.result
    } catch (error: any) {
      summaryError.value = getLabApiErrorMessage(error, '摘要生成失败，请稍后重试', '请先登录后再使用 AI 摘要功能')
    } finally {
      summaryLoading.value = false
    }
  }

  async function generateRecommendation() {
    if (!summaryPostId.value || recommendLoading.value) return

    recommendLoading.value = true
    recommendError.value = ''
    recommendResult.value = []

    try {
      const response = await $fetch<{ data: { items: RecommendResultItem[] } }>('/api/ai/related-posts', {
        method: 'POST',
        body: { postId: Number(summaryPostId.value) }
      })
      recommendResult.value = response.data.items
    } catch (error: any) {
      recommendError.value = getLabApiErrorMessage(error, '关联推荐生成失败，请稍后重试', '请先登录后再使用 AI 推荐功能')
    } finally {
      recommendLoading.value = false
    }
  }

  async function generateWritingAnalysis() {
    if (!summaryPostId.value || writingLoading.value) return

    writingLoading.value = true
    writingError.value = ''
    writingResult.value = null

    try {
      const response = await $fetch<{ data: WritingAssistantResult }>('/api/ai/writing-assistant', {
        method: 'POST',
        body: { postId: Number(summaryPostId.value) }
      })
      writingResult.value = response.data
    } catch (error: any) {
      writingError.value = getLabApiErrorMessage(error, '写作分析失败，请稍后重试', '请先登录后再使用 AI 写作助手')
    } finally {
      writingLoading.value = false
    }
  }

  async function generateSeoCheck() {
    if (!summaryPostId.value || seoCheckLoading.value) return

    seoCheckLoading.value = true
    seoCheckError.value = ''
    seoCheckResult.value = null

    try {
      const response = await $fetch<{ data: SeoCheckResult }>('/api/ai/seo-check', {
        method: 'POST',
        body: { postId: Number(summaryPostId.value) }
      })
      seoCheckResult.value = response.data
    } catch (error: any) {
      seoCheckError.value = getLabApiErrorMessage(error, 'SEO 检查失败，请稍后重试', '请先登录后再使用 AI SEO 检查')
    } finally {
      seoCheckLoading.value = false
    }
  }

  onBeforeUnmount(() => {
    clearTimeout(modalTimer)
    document.removeEventListener('pointerdown', handleSummaryOutsideClick)
  })

  onMounted(() => {
    document.addEventListener('pointerdown', handleSummaryOutsideClick)
  })

  function handleSummaryOutsideClick(event: PointerEvent) {
    if (!summarySelectOpen.value) return

    const target = event.target
    if (target instanceof Node && summarySelectRef.value?.contains(target)) return

    summarySelectOpen.value = false
  }

  async function checkExternalLinks() {
    if (!summaryPostId.value || linkCheckLoading.value) return

    linkCheckLoading.value = true
    linkCheckError.value = ''
    linkCheckResult.value = null

    try {
      const response = await $fetch<{ data: LinkCheckResult }>('/api/ai/link-checker', {
        method: 'POST',
        body: { postId: Number(summaryPostId.value) }
      })
      linkCheckResult.value = response.data
    } catch (error: any) {
      linkCheckError.value = getLabApiErrorMessage(error, '外链检查失败，请稍后重试', '请先登录后再使用外链检查助手')
    } finally {
      linkCheckLoading.value = false
    }
  }

  async function organizeDrafts() {
    if (draftOrganizerLoading.value) return

    draftOrganizerLoading.value = true
    draftOrganizerError.value = ''
    draftOrganizerResult.value = null

    try {
      const response = await $fetch<{ data: DraftOrganizerResult }>('/api/admin/ai/draft-organizer')
      draftOrganizerResult.value = response.data
    } catch (error: any) {
      draftOrganizerError.value = getLabApiErrorMessage(error, '草稿整理失败，请稍后重试', '请先登录后台账号后再使用草稿整理助手')
    } finally {
      draftOrganizerLoading.value = false
    }
  }

  async function generateSiteInsights() {
    if (siteInsightsLoading.value) return

    siteInsightsLoading.value = true
    siteInsightsError.value = ''
    siteInsightsResult.value = null

    try {
      const response = await $fetch<{ data: SiteInsightsResult }>('/api/admin/ai/site-insights')
      siteInsightsResult.value = response.data
    } catch (error: any) {
      siteInsightsError.value = getLabApiErrorMessage(error, '站点洞察生成失败，请稍后重试', '请先登录后台账号后再使用站点洞察')
    } finally {
      siteInsightsLoading.value = false
    }
  }

  async function generateMonthlyReview() {
    if (!monthlyReviewMonth.value || monthlyReviewLoading.value) return

    monthlyReviewLoading.value = true
    monthlyReviewError.value = ''
    monthlyReviewResult.value = null
    monthlyCopied.value = false
    monthlyCopyError.value = ''

    try {
      const response = await $fetch<{ data: MonthlyReviewResult }>('/api/admin/ai/monthly-review', {
        query: { month: monthlyReviewMonth.value }
      })
      monthlyReviewResult.value = response.data
    } catch (error: any) {
      monthlyReviewError.value = getLabApiErrorMessage(error, '月度内容回顾生成失败，请稍后重试', '请先登录后台账号后再使用月度内容回顾')
    } finally {
      monthlyReviewLoading.value = false
    }
  }

  async function copyMonthlyMarkdown() {
    if (!monthlyReviewResult.value?.markdown) return

    monthlyCopyError.value = ''

    try {
      await navigator.clipboard.writeText(monthlyReviewResult.value.markdown)
      monthlyCopied.value = true
      window.setTimeout(() => {
        monthlyCopied.value = false
      }, 1600)
    } catch {
      monthlyCopyError.value = '复制失败，请手动选中 Markdown 内容。'
    }
  }

  function getLabApiErrorMessage(error: unknown, fallback: string, authMessage?: string) {
    return getApiErrorMessage(error, {
      fallback,
      unauthorized: authMessage,
      forbidden: authMessage
    })
  }

  function relationTypeLabel(type: string) {
    const labels: Record<string, string> = {
      PREREQUISITE: '前置阅读',
      EXTENSION: '延伸阅读',
      SAME_TOPIC: '同主题',
      PRACTICE: '实战补充',
      BACKGROUND: '背景知识'
    }

    return labels[type] || '推荐'
  }

  function formatMonthDate(value: string) {
    if (!value) return '-'
    const date = new Date(value)
    return `${date.getMonth() + 1}.${date.getDate()}`
  }

  function currentMonthValue() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  function trendBarHeight(count: number) {
    const values = siteInsightsResult.value?.publishingTrend.map((item) => item.count) || []
    const max = Math.max(1, ...values)
    return Math.max(8, Math.round((count / max) * 100))
  }

  function draftPriorityLabel(priority: DraftPriority) {
    const labels: Record<DraftPriority, string> = {
      READY_TO_POLISH: '快完成',
      NEEDS_METADATA: '补信息',
      NEEDS_STRUCTURE: '补结构',
      EARLY_IDEA: '早期想法'
    }

    return labels[priority]
  }

  function linkStatusLabel(status: LinkCheckStatus) {
    const labels: Record<LinkCheckStatus, string> = {
      OK: '正常',
      REDIRECT: '跳转',
      BROKEN: '失效',
      TIMEOUT: '超时',
      BLOCKED: '已跳过',
      UNKNOWN: '未知'
    }

    return labels[status]
  }

  return {
    features,
    selectedFeature,
    modalLoading,
    summaryPostId,
    summaryLoading,
    summaryError,
    summaryResult,
    recommendLoading,
    recommendError,
    recommendResult,
    writingLoading,
    writingError,
    writingResult,
    seoCheckLoading,
    seoCheckError,
    seoCheckResult,
    askQuestion,
    askLoading,
    askError,
    askResult,
    linkCheckLoading,
    linkCheckError,
    linkCheckResult,
    draftOrganizerLoading,
    draftOrganizerError,
    draftOrganizerResult,
    siteInsightsLoading,
    siteInsightsError,
    siteInsightsResult,
    monthlyReviewMonth,
    monthlyReviewLoading,
    monthlyReviewError,
    monthlyReviewResult,
    monthlyCopied,
    monthlyCopyError,
    semanticQuery,
    semanticLoading,
    semanticError,
    semanticResults,
    summarySelectOpen,
    summarySelectRef,
    sessionData,
    summaryPosts,
    isAdmin,
    selectedSummaryPost,
    seoCheckProblems,
    askQuestionLength,
    primaryActionLabel,
    isPrimaryActionDisabled,
    openFeature,
    closeFeature,
    selectSummaryPost,
    handlePrimaryAction,
    askBlogQuestion,
    relationTypeLabel,
    formatMonthDate,
    trendBarHeight,
    draftPriorityLabel,
    linkStatusLabel,
    copyMonthlyMarkdown
  }
}
