// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PostCommentsContext } from '../app/composables/usePostComments'
import { createPostCommentsContext } from '../app/composables/usePostComments'
import type { PublicCommentThread, SubmitCommentPayload } from '../types/dto/comment'
import CommentComposer from '../app/components/comment/CommentComposer.vue'
import CommentThread from '../app/components/comment/CommentThread.vue'

const holder = vi.hoisted(() => ({ context: null as PostCommentsContext | null }))
vi.mock('../app/composables/usePostComments', async (original) => ({
  ...await original<typeof import('../app/composables/usePostComments')>(),
  useCommentContext: () => holder.context!
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const receipt: SubmitCommentPayload = {
  id: 10, status: 'PENDING', pendingReview: true, authorName: 'Guest', authorKind: 'GUEST', createdAt: '2026-11-05'
}
function thread(id = 1): PublicCommentThread {
  return { id, authorName: 'A', authorKind: 'ACCOUNT', isOfficial: false, createdAt: '2026-11-05',
    bodyHtml: '<p>root</p>', replyCount: 0, replies: [], repliesCursor: null, canDelete: false, isDeleted: false }
}
const session = { data: { guest: { hasCredential: true, displayName: 'Guest' }, account: null } }
const empty = { data: { items: [], total: 0, nextCursor: null } }
const fetchMock = vi.fn<(url: string, options?: { method?: string, body?: Record<string, unknown>, query?: Record<string, unknown> }) => Promise<unknown>>()
const unmounts: Array<() => void> = []
const flush = async () => { await new Promise(resolve => setTimeout(resolve, 0)); await nextTick() }

function context() {
  return createPostCommentsContext({ postId: ref(1), postSlug: ref('demo') })
}
function mount(component: typeof CommentComposer | typeof CommentThread, props: Record<string, unknown>) {
  const el = document.createElement('div')
  document.body.append(el)
  const app = createApp(component, props)
  const stub = defineComponent({ render: () => h('span') })
  for (const name of ['Icon', 'CommentAvatar', 'CommentBody', 'CommentComposer']) app.component(name, stub)
  app.mount(el)
  unmounts.push(() => { app.unmount(); el.remove() })
  return el
}
function input(el: HTMLElement, selector: string, value: string) {
  const field = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
}
function send(el: HTMLElement) {
  el.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

beforeEach(() => {
  sessionStorage.clear()
  fetchMock.mockReset().mockImplementation(async url => url === '/api/comments/session' ? session : empty)
  vi.stubGlobal('$fetch', fetchMock)
})
afterEach(() => {
  unmounts.splice(0).forEach(unmount => unmount())
  vi.unstubAllGlobals()
})

describe('comment request lifecycle', () => {
  it('establishes one guest session before concurrent anonymous submissions', async () => {
    const state = context()
    const credential = deferred<unknown>()
    fetchMock.mockImplementation(async (url, options) => {
      if (url === '/api/comments/session') return credential.promise
      if (options?.method === 'POST') return { data: receipt }
      return empty
    })
    const payload = { body: 'hello', requestId: crypto.randomUUID(), identityChoice: 'guest-anonymous' as const, guestDisplayName: '', replyToId: null }
    const first = state.submit(payload)
    const second = state.submit({ ...payload, requestId: crypto.randomUUID() })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    credential.resolve(session)
    await Promise.all([first, second])
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/comments/session')).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(3)
  })

  it('does not submit without a credential and retries failed session setup', async () => {
    const state = context()
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    const payload = { body: 'hello', requestId: crypto.randomUUID(), identityChoice: 'guest-anonymous' as const, guestDisplayName: '', replyToId: null }
    expect((await state.submit(payload)).ok).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fetchMock.mockImplementation(async (url, options) => url === '/api/comments/session' ? session : options?.method === 'POST' ? { data: receipt } : empty)
    expect((await state.submit(payload)).ok).toBe(true)
    const posted = fetchMock.mock.calls.find(([, options]) => options?.body)?.[1]?.body
    expect(posted?.requestId).toBe(payload.requestId)
  })

  it.each([false, true])('ignores obsolete sort responses, including failures: %s', async (fail) => {
    const state = context()
    const old = deferred<unknown>()
    const current = deferred<unknown>()
    fetchMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise)
    const initial = state.reload()
    const sorted = state.setSort('oldest')
    current.resolve({ data: { items: [thread(2)], total: 1, nextCursor: 'oldest-cursor' } })
    await sorted
    if (fail) old.reject(new Error('old failure'))
    else old.resolve({ data: { items: [thread(1)], total: 99, nextCursor: 'newest-cursor' } })
    await initial
    expect(state.threads.value.map(item => item.id)).toEqual([2])
    expect(state.nextCursor.value).toBe('oldest-cursor')
    expect(state.loadError.value).toBe(false)
    expect(state.loading.value).toBe(false)
  })

  it('discards an old append request after sorting changes', async () => {
    const state = context()
    state.threads.value = [thread(1)]
    state.nextCursor.value = 'newest-cursor'
    const append = deferred<unknown>()
    fetchMock.mockReturnValueOnce(append.promise).mockResolvedValueOnce({
      data: { items: [thread(3)], total: 1, nextCursor: null }
    })
    const more = state.loadMore()
    await state.setSort('oldest')
    append.resolve({ data: { items: [thread(2)], total: 2, nextCursor: 'stale' } })
    await more
    expect(state.threads.value.map(item => item.id)).toEqual([3])
    expect(state.nextCursor.value).toBeNull()
    expect(state.loadingMore.value).toBe(false)
  })
})

describe('comment editor snapshots', () => {
  it('reuses unchanged retries but changes the request ID when a nickname changes', async () => {
    const state = context()
    holder.context = state
    state.identityChoice.value = 'guest-named'
    state.guestName.value = 'Alice'
    const submit = vi.spyOn(state, 'submit').mockResolvedValue({ ok: false, feedback: { kind: 'network', message: 'offline' } })
    const el = mount(CommentComposer, { variant: 'root' })
    input(el, 'textarea', 'hello')
    send(el); await flush()
    send(el); await flush()
    expect(submit.mock.calls[1]![0].requestId).toBe(submit.mock.calls[0]![0].requestId)
    input(el, 'input', 'Bob')
    send(el); await flush()
    expect(submit.mock.calls[2]![0].requestId).not.toBe(submit.mock.calls[0]![0].requestId)
    expect(submit.mock.calls[2]![0].guestDisplayName).toBe('Bob')
  })

  it.each(['same', 'different'])('preserves the new identity draft while an old submission finishes: %s text', async (text) => {
    const state = context()
    holder.context = state
    state.identityChoice.value = 'account'
    const response = deferred<{ ok: true, payload: SubmitCommentPayload }>()
    vi.spyOn(state, 'submit').mockReturnValue(response.promise)
    const el = mount(CommentComposer, { variant: 'root' })
    input(el, 'textarea', 'same')
    send(el)
    state.identityChoice.value = 'guest-anonymous'
    input(el, 'textarea', text)
    response.resolve({ ok: true, payload: receipt })
    await flush()
    expect(el.querySelector('textarea')!.value).toBe(text)
    expect(state.readDraft('guest-anonymous', null)?.body).toBe(text)
    expect(state.readDraft('account', null)).toBeNull()
  })

  it('preserves edits made while the same draft is being submitted', async () => {
    const state = context()
    holder.context = state
    const response = deferred<{ ok: true, payload: SubmitCommentPayload }>()
    vi.spyOn(state, 'submit').mockReturnValue(response.promise)
    const el = mount(CommentComposer, { variant: 'root' })
    input(el, 'textarea', 'first')
    send(el)
    input(el, 'textarea', 'second')
    response.resolve({ ok: true, payload: receipt })
    await flush()
    expect(state.readDraft('guest-anonymous', null)?.body).toBe('second')
    expect(el.querySelector('textarea')!.value).toBe('second')
  })

  it('restores an existing draft when switching reply targets during submission', async () => {
    const state = context()
    holder.context = state
    state.replyTarget.value = { threadRootId: 1, commentId: 2, authorName: 'A' }
    state.writeDraft('guest-anonymous', 3, { body: 'saved for B', displayName: '', requestId: crypto.randomUUID() })
    const response = deferred<{ ok: true, payload: SubmitCommentPayload }>()
    vi.spyOn(state, 'submit').mockReturnValue(response.promise)
    const el = mount(CommentComposer, { variant: 'reply' })
    input(el, 'textarea', 'send to A')
    send(el)
    state.replyTarget.value = { threadRootId: 1, commentId: 3, authorName: 'B' }
    response.resolve({ ok: true, payload: receipt })
    await flush()
    expect(el.querySelector('textarea')!.value).toBe('saved for B')
    expect(state.readDraft('guest-anonymous', 3)?.body).toBe('saved for B')
    expect(state.readDraft('guest-anonymous', 2)).toBeNull()
  })
})

it('keeps loading replies until the last page, without repeating previews', async () => {
  const state = context()
  holder.context = state
  const root = thread()
  const reply = (id: number) => ({ ...thread(id), replyTo: null })
  root.replies = [reply(2), reply(3)]
  root.replyCount = 5
  root.repliesCursor = 'after-preview'
  fetchMock.mockResolvedValueOnce({ data: { items: [reply(4), reply(5)], nextCursor: 'last-page' } })
    .mockResolvedValueOnce({ data: { items: [reply(6)], nextCursor: null } })
  const el = mount(CommentThread, { thread: root })
  el.querySelector<HTMLButtonElement>('.comment-expand')!.click()
  await flush()
  expect(el.querySelector('.comment-expand')!.textContent).toContain('加载更多回复')
  el.querySelector<HTMLButtonElement>('.comment-expand')!.click()
  await flush()
  expect(el.querySelectorAll('.is-reply')).toHaveLength(5)
  expect(el.querySelector('.comment-expand')).toBeNull()
  expect(fetchMock.mock.calls.map(([, options]) => options?.query?.cursor)).toEqual(['after-preview', 'last-page'])
})
