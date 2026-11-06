import { computed, inject, onMounted, provide, ref, toValue, watch, type InjectionKey, type MaybeRefOrGetter, type Ref } from 'vue'
import type {
  CommentSessionPayload,
  PublicCommentListPayload,
  PublicCommentRepliesPayload,
  PublicCommentReply,
  PublicCommentThread,
  SubmitCommentPayload
} from '~~/types/dto/comment'
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from '../utils/api-error'
import { COMMENT_BODY_MAX_LENGTH, countCommentCodePoints } from '../utils/comment'

export type CommentSort = 'newest' | 'oldest'

/**
 * 编辑器里的身份选择。
 *
 * account 走博客会话；guest-named 是访客署名；guest-anonymous 是匿名，昵称由服务端生成。
 * 两种访客身份在服务端都是 GUEST —— 不关联账户，但已登录时照样扣账户限额。
 */
export type CommentIdentityChoice = 'account' | 'guest-named' | 'guest-anonymous'

/** 当前打开的回复框指向的那条评论。 */
export type CommentReplyTarget = {
  /** 被回复评论所属的讨论。 */
  threadRootId: number
  /** 被回复的那条评论。 */
  commentId: number
  /** 被回复者的昵称。 */
  authorName: string
}

export type CommentFeedbackKind = 'idle' | 'network' | 'field' | 'rate' | 'pending' | 'success'

/**
 * 编辑器的反馈。
 *
 * 网络失败、字段错误、限流和待审是四件不同的事，各自有各的文案，不能共用一句「操作失败」。
 */
export type CommentFeedback = {
  kind: CommentFeedbackKind
  message: string
}

/**
 * 一份草稿。
 *
 * requestId 跟着草稿走：内容不变时重试复用同一个编号，内容变了就换新的，
 * 这样服务端才能区分「同一次提交的重试」和「一条新评论」。
 */
export type CommentDraft = {
  body: string
  requestId: string
  /** 昵称也是提交快照的一部分；旧草稿缺少时首次提交重新编号。 */
  displayName?: string
}

export type CommentExpandedReplies = {
  items: PublicCommentReply[]
  nextCursor: string | null
  loading: boolean
  failed: boolean
}

export type SubmitCommentInput = {
  body: string
  requestId: string
  identityChoice: CommentIdentityChoice
  guestDisplayName: string
  replyToId: number | null
}

export type SubmitCommentResult =
  | { ok: true, payload: SubmitCommentPayload }
  | { ok: false, feedback: CommentFeedback }

export type PostCommentsContext = {
  postId: Ref<number>
  postSlug: Ref<string>
  threads: Ref<PublicCommentThread[]>
  total: Ref<number>
  nextCursor: Ref<string | null>
  sort: Ref<CommentSort>
  loading: Ref<boolean>
  loadingMore: Ref<boolean>
  loadError: Ref<boolean>
  account: Ref<{ id: number, username: string } | null>
  guestName: Ref<string>
  identityChoice: Ref<CommentIdentityChoice>
  replyTarget: Ref<CommentReplyTarget | null>
  expandedReplies: Ref<Record<number, CommentExpandedReplies>>
  reload: () => Promise<void>
  loadMore: () => Promise<void>
  setSort: (sort: CommentSort) => Promise<void>
  toggleReply: (target: CommentReplyTarget | null) => void
  expandReplies: (thread: PublicCommentThread) => Promise<void>
  loadMoreReplies: (thread: PublicCommentThread) => Promise<void>
  submit: (input: SubmitCommentInput) => Promise<SubmitCommentResult>
  remove: (commentId: number) => Promise<CommentFeedback | null>
  ensureGuestSession: () => Promise<void>
  loadAccount: () => Promise<void>
  readDraft: (identity: CommentIdentityChoice, targetId: number | null, postId?: number) => CommentDraft | null
  writeDraft: (identity: CommentIdentityChoice, targetId: number | null, draft: CommentDraft) => void
  clearDraft: (identity: CommentIdentityChoice, targetId: number | null, postId?: number) => void
}

const COMMENT_CONTEXT_KEY = Symbol('post-comments') as InjectionKey<PostCommentsContext>

/**
 * 建立评论区上下文。
 *
 * 顶层组件调用它，子组件用 useCommentContext 取同一份状态。
 */
export function usePostComments(postSlug: MaybeRefOrGetter<string>, postId: MaybeRefOrGetter<number>) {
  const context = createPostCommentsContext({
    postSlug: computed(() => toValue(postSlug)),
    postId: computed(() => toValue(postId))
  })

  provide(COMMENT_CONTEXT_KEY, context)

  // 评论只在客户端加载，文章页的 SSR 与缓存策略不受影响。
  onMounted(() => {
    void context.loadAccount()
    void context.reload()
  })

  // 同一篇文章组件被复用时 slug 会变，重新拉一遍。
  watch(() => toValue(postSlug), () => {
    void context.reload()
  })

  return context
}

/** 取评论区上下文。 */
export function useCommentContext() {
  const context = inject(COMMENT_CONTEXT_KEY, null)
  if (!context) throw new Error('评论区上下文尚未初始化')
  return context
}

export function createPostCommentsContext(options: {
  postSlug: Ref<string>
  postId: Ref<number>
}): PostCommentsContext {
  const threads = ref<PublicCommentThread[]>([])
  const total = ref(0)
  const nextCursor = ref<string | null>(null)
  const sort = ref<CommentSort>('newest')
  const loading = ref(false)
  const loadingMore = ref(false)
  const loadError = ref(false)
  const account = ref<{ id: number, username: string } | null>(null)
  const guestName = ref('')
  const identityChoice = ref<CommentIdentityChoice>('guest-anonymous')
  const replyTarget = ref<CommentReplyTarget | null>(null)
  const expandedReplies = ref<Record<number, CommentExpandedReplies>>({})
  const guestSessionLoaded = ref(false)
  let guestSessionRequest: Promise<void> | null = null
  let listRequestVersion = 0

  async function loadAccount() {
    try {
      const response = await $fetch<{ data: { user: { id: number, username: string } | null } }>('/api/auth/me')
      account.value = response.data.user
    } catch {
      account.value = null
    }

    // 已登录默认用账号身份，访客身份要主动选。
    identityChoice.value = account.value ? 'account' : 'guest-anonymous'
  }

  /**
   * 建立访客凭证。
   *
   * 署名预填或访客提交前调用；请求合并，失败后可重试，成功前禁止发送评论。
   */
  async function ensureGuestSession() {
    if (guestSessionLoaded.value) return
    if (guestSessionRequest) return guestSessionRequest
    guestSessionRequest = (async () => {
      const response = await $fetch<{ data: CommentSessionPayload }>('/api/comments/session', { method: 'POST' })
      if (!response.data.guest.hasCredential) throw new Error('访客凭证建立失败')
      if (!guestName.value && response.data.guest.displayName) {
        guestName.value = response.data.guest.displayName
      }
      if (!account.value && response.data.account) {
        account.value = response.data.account
      }
      guestSessionLoaded.value = true
    })()
    try {
      await guestSessionRequest
    } finally {
      guestSessionRequest = null
    }
  }

  async function fetchThreads(cursor: string | null) {
    const response = await $fetch<{ data: PublicCommentListPayload }>(
      `/api/posts/${encodeURIComponent(options.postSlug.value)}/comments`,
      { query: { sort: sort.value, cursor: cursor || undefined } }
    )
    return response.data
  }

  async function loadThreads(append: boolean, cursor: string | null, background = false) {
    const version = ++listRequestVersion
    if (append) loadingMore.value = true
    else if (!background) loading.value = true
    if (!background) loadError.value = false

    try {
      const data = await fetchThreads(cursor)
      if (version !== listRequestVersion) return
      loadError.value = false
      if (background) expandedReplies.value = {}
      threads.value = append ? [...threads.value, ...data.items] : data.items
      total.value = data.total
      nextCursor.value = data.nextCursor
    } catch {
      if (version !== listRequestVersion || background) return
      loadError.value = true
      if (!append) {
        threads.value = []
        total.value = 0
        nextCursor.value = null
      }
    } finally {
      if (version === listRequestVersion) {
        loading.value = false
        loadingMore.value = false
      }
    }
  }

  async function reload() {
    expandedReplies.value = {}
    nextCursor.value = null
    await loadThreads(false, null)
  }

  async function loadMore() {
    if (!nextCursor.value || loading.value || loadingMore.value) return
    await loadThreads(true, nextCursor.value)
  }

  async function setSort(next: CommentSort) {
    if (sort.value === next) return
    sort.value = next
    await reload()
  }

  function toggleReply(target: CommentReplyTarget | null) {
    replyTarget.value = target
  }

  /**
   * 展开楼中楼。
   *
   * 游标由服务端给在预览最后一条之后，展开时原样传回去，
   * 客户端不自己拼游标，也不会把预览里的两条重复一遍。
   */
  async function expandReplies(thread: PublicCommentThread) {
    // 加载失败允许重试，其余情况不重复拉。
    if (expandedReplies.value[thread.id] && !expandedReplies.value[thread.id]!.failed) return
    if (!thread.repliesCursor) return

    expandedReplies.value = {
      ...expandedReplies.value,
      [thread.id]: { items: [], nextCursor: null, loading: true, failed: false }
    }

    try {
      const data = await fetchReplies(thread.id, thread.repliesCursor)
      expandedReplies.value = {
        ...expandedReplies.value,
        [thread.id]: { items: data.items, nextCursor: data.nextCursor, loading: false, failed: false }
      }
    } catch {
      expandedReplies.value = {
        ...expandedReplies.value,
        [thread.id]: { items: [], nextCursor: null, loading: false, failed: true }
      }
    }
  }

  async function loadMoreReplies(thread: PublicCommentThread) {
    const state = expandedReplies.value[thread.id]
    if (!state?.nextCursor || state.loading) return

    expandedReplies.value = {
      ...expandedReplies.value,
      [thread.id]: { ...state, loading: true }
    }

    try {
      const data = await fetchReplies(thread.id, state.nextCursor)
      expandedReplies.value = {
        ...expandedReplies.value,
        [thread.id]: {
          items: [...state.items, ...data.items],
          nextCursor: data.nextCursor,
          loading: false,
          failed: false
        }
      }
    } catch {
      expandedReplies.value = {
        ...expandedReplies.value,
        [thread.id]: { ...state, loading: false, failed: true }
      }
    }
  }

  async function fetchReplies(threadRootId: number, cursor: string | null) {
    const response = await $fetch<{ data: PublicCommentRepliesPayload }>(
      `/api/posts/${encodeURIComponent(options.postSlug.value)}/comments/${threadRootId}/replies`,
      { query: { cursor: cursor || undefined } }
    )
    return response.data
  }

  async function submit(input: SubmitCommentInput): Promise<SubmitCommentResult> {
    const body = input.body.trim()
    if (!body) {
      return { ok: false, feedback: { kind: 'field', message: '评论内容不能为空' } }
    }
    if (countCommentCodePoints(body) > COMMENT_BODY_MAX_LENGTH) {
      return {
        ok: false,
        feedback: { kind: 'field', message: `评论内容不能超过 ${COMMENT_BODY_MAX_LENGTH} 个字符` }
      }
    }

    const postSlug = options.postSlug.value
    const payload: Record<string, unknown> = {
      body,
      requestId: input.requestId,
      identityMode: input.identityChoice === 'account' ? 'ACCOUNT' : 'GUEST'
    }
    if (input.replyToId !== null) payload.replyToId = input.replyToId
    if (input.identityChoice === 'guest-named') payload.displayName = input.guestDisplayName.trim()

    try {
      if (input.identityChoice !== 'account') await ensureGuestSession()
      const response = await $fetch<{ data: SubmitCommentPayload }>(
        `/api/posts/${encodeURIComponent(postSlug)}/comments`,
        { method: 'POST', body: payload }
      )

      const result = response.data
      if (!result.pendingReview && options.postSlug.value === postSlug) {
        void loadThreads(false, null, true)
      }

      return { ok: true, payload: result }
    } catch (error) {
      return { ok: false, feedback: classifyCommentError(error) }
    }
  }

  /**
   * 作者自助删除。
   *
   * 服务端是软删除并清空正文，列表里留占位。失败时把原因带回去，由调用方决定显示在哪。
   */
  async function remove(commentId: number): Promise<CommentFeedback | null> {
    try {
      await $fetch(
        `/api/posts/${encodeURIComponent(options.postSlug.value)}/comments/${commentId}`,
        { method: 'DELETE' }
      )
      await reload()
      return null
    } catch (error) {
      return classifyCommentError(error)
    }
  }

  function draftStorageKey(identity: CommentIdentityChoice, targetId: number | null, postId = options.postId.value) {
    // 草稿按文章、身份和回复对象隔离。换身份或换回复对象时互不串味。
    return `blog-comment-draft:${postId}:${identity}:${targetId ?? 0}`
  }

  function readDraft(identity: CommentIdentityChoice, targetId: number | null, postId = options.postId.value): CommentDraft | null {
    if (typeof sessionStorage === 'undefined') return null

    try {
      const raw = sessionStorage.getItem(draftStorageKey(identity, targetId, postId))
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<CommentDraft>
      if (typeof parsed?.body !== 'string') return null
      return {
        body: parsed.body,
        requestId: typeof parsed.requestId === 'string' && parsed.requestId ? parsed.requestId : createRequestId(),
        displayName: typeof parsed.displayName === 'string' ? parsed.displayName : undefined
      }
    } catch {
      return null
    }
  }

  function writeDraft(identity: CommentIdentityChoice, targetId: number | null, draft: CommentDraft) {
    if (typeof sessionStorage === 'undefined') return

    try {
      sessionStorage.setItem(draftStorageKey(identity, targetId), JSON.stringify(draft))
    } catch {
      // 隐私模式下 sessionStorage 可能不可写，放弃保存草稿，不影响提交。
    }
  }

  function clearDraft(identity: CommentIdentityChoice, targetId: number | null, postId = options.postId.value) {
    if (typeof sessionStorage === 'undefined') return

    try {
      sessionStorage.removeItem(draftStorageKey(identity, targetId, postId))
    } catch {
      // 同上，忽略。
    }
  }

  return {
    postId: options.postId,
    postSlug: options.postSlug,
    threads,
    total,
    nextCursor,
    sort,
    loading,
    loadingMore,
    loadError,
    account,
    guestName,
    identityChoice,
    replyTarget,
    expandedReplies,
    reload,
    loadMore,
    setSort,
    toggleReply,
    expandReplies,
    loadMoreReplies,
    submit,
    remove,
    ensureGuestSession,
    readDraft,
    writeDraft,
    clearDraft,
    loadAccount
  }
}

/**
 * 把接口错误翻译成编辑器的反馈。
 *
 * 限流、字段错误、权限问题和网络故障要分开说 —— 访客需要知道是「等一会儿」还是「改一下」。
 */
export function classifyCommentError(error: unknown): CommentFeedback {
  const status = getApiErrorStatus(error)
  const code = getApiErrorCode(error)

  if (status === 429 || code === 'RATE_LIMITED') {
    const retryAfter = readRetryAfter(error)
    return {
      kind: 'rate',
      message: retryAfter
        ? `评论太频繁，请 ${retryAfter} 秒后再试。草稿已保留。`
        : '评论太频繁，请稍后再试。草稿已保留。'
    }
  }

  if (status === 401 || code === 'AUTH_REQUIRED') {
    return { kind: 'field', message: getApiErrorMessage(error, { fallback: '登录状态已过期，请重新登录后再评论' }) }
  }

  if (status === 403) {
    return { kind: 'field', message: getApiErrorMessage(error, { fallback: '当前身份不能发表评论' }) }
  }

  if (status === 409 || code === 'CONFLICT') {
    return { kind: 'field', message: getApiErrorMessage(error, { fallback: '评论状态已变化，请刷新后重试' }) }
  }

  if (status === 400 || code === 'VALIDATION_ERROR' || code === 'BAD_REQUEST') {
    return { kind: 'field', message: getApiErrorMessage(error, { fallback: '评论内容不合法，请检查后重试' }) }
  }

  return { kind: 'network', message: '网络连接失败，草稿已保留，请检查网络后重试。' }
}

/** 429 的 Retry-After。优先读响应头，读不到就用错误体里的字段。 */
function readRetryAfter(error: unknown) {
  const value = error as {
    response?: { headers?: { get?: (name: string) => string | null } }
    data?: { data?: { retryAfter?: unknown } }
  }

  const header = value?.response?.headers?.get?.('retry-after')
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds)

  const detail = value?.data?.data?.retryAfter
  if (typeof detail === 'number' && detail > 0) return Math.ceil(detail)

  return null
}

/** 生成一个 UUID 形态的请求编号。非安全上下文里没有 randomUUID，用随机数兜底。 */
export function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
