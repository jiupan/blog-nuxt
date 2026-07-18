<template>
  <section id="comments" class="twikoo-section">
    <header class="twikoo-heading">
      <div class="twikoo-heading-title">
        <Icon name="i-lucide-message-circle" />
        <h2>评论</h2>
        <span class="twikoo-count-badge">{{ commentCount }}</span>
      </div>
      <p>友善交流，理性表达</p>
    </header>

    <div v-if="!envId" class="twikoo-state">
      <Icon name="i-lucide-message-square-warning" />
      <strong>评论服务尚未配置</strong>
      <span>请设置 NUXT_PUBLIC_TWIKOO_ENV_ID。</span>
    </div>
    <div v-else-if="loading" class="twikoo-state is-loading">
      <Icon name="i-lucide-loader-circle" />
      <span>正在加载评论…</span>
    </div>
    <div v-else-if="loadError" class="twikoo-state">
      <Icon name="i-lucide-circle-alert" />
      <strong>评论区加载失败</strong>
      <button type="button" @click="initialize">重新加载</button>
    </div>

    <div ref="container" class="twikoo-comment-host" :class="identityClasses" />

    <Teleport v-if="identityTarget" :to="identityTarget">
      <div class="comment-identity-bar" :class="`is-${identityMode || 'chooser'}`">
        <template v-if="!identityMode">
          <button type="button" class="identity-choice is-account" @click="chooseAccountIdentity">
            <Icon name="i-lucide-circle-user-round" />
            {{ currentUser ? `使用 ${currentUser.username} 账号发表评论` : '登录博客账号发表评论' }}
          </button>
          <button type="button" class="identity-choice" @click="chooseManualIdentity">其他方式</button>
          <button type="button" class="identity-choice" @click="chooseAnonymousIdentity">匿名评论</button>
        </template>

        <template v-else-if="identityMode === 'account'">
          <div class="identity-profile">
            <span class="identity-avatar is-account"><Icon name="i-lucide-user-round-check" /></span>
            <strong>{{ currentUser?.username }}</strong>
            <span class="identity-verified" title="博客账号"><Icon name="i-lucide-badge-check" /></span>
          </div>
          <div class="identity-links">
            <NuxtLink to="/lab">用户中心</NuxtLink>
            <button type="button" @click="logoutAccountIdentity">注销</button>
          </div>
        </template>

        <template v-else-if="identityMode === 'anonymous'">
          <div class="identity-profile">
            <span class="identity-avatar is-anonymous"><Icon name="i-lucide-user-round" /></span>
            <strong>{{ anonymousIdentity.nick }}</strong>
          </div>
          <div class="identity-links">
            <button type="button" class="identity-switch" @click="regenerateAnonymousIdentity">
              <Icon name="i-lucide-refresh-cw" />换一个
            </button>
            <button type="button" @click="resetIdentity">注销</button>
          </div>
        </template>

        <template v-else>
          <div class="identity-manual-hint">
            <Icon name="i-lucide-contact-round" />
            <span>使用昵称和邮箱发表评论</span>
          </div>
          <button type="button" class="identity-switch-button" @click="resetIdentity">切换方式</button>
        </template>

        <button v-if="identityMode" type="button" class="identity-send" :disabled="!canSendComment" @click="sendComment">
          发送 <span>Ctrl ↵</span>
        </button>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import 'twikoo/dist/twikoo.css'

const props = defineProps<{ postSlug: string }>()
const config = useRuntimeConfig()
const route = useRoute()
const envId = computed(() => String(config.public.twikooEnvId || '').trim())
const region = computed(() => String(config.public.twikooRegion || '').trim())
const container = ref<HTMLElement | null>(null)
const loading = ref(Boolean(envId.value))
const loadError = ref(false)
const commentCount = ref(0)
type IdentityMode = 'account' | 'anonymous' | 'manual' | null
type CommentUser = { id: number, username: string, email: string | null }
const identityMode = ref<IdentityMode>(null)
const identityTarget = ref<HTMLElement | null>(null)
const currentUser = ref<CommentUser | null>(null)
const commentDraft = ref('')
const manualMeta = reactive({ nick: '', mail: '' })
const anonymousIdentity = reactive(createAnonymousIdentity())
const identityClasses = computed(() => [
  { 'is-ready': !loading.value && !loadError.value },
  `identity-${identityMode.value || 'chooser'}`
])
const canSendComment = computed(() => {
  if (!commentDraft.value.trim() || !identityMode.value) return false
  if (identityMode.value !== 'manual') return true
  return Boolean(manualMeta.nick.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualMeta.mail.trim()))
})
let generation = 0
let countObserver: MutationObserver | undefined
let editorObserver: MutationObserver | undefined
let editorKeydownHandler: ((event: KeyboardEvent) => void) | undefined
let editorInputHandler: ((event: Event) => void) | undefined

onMounted(() => {
  initialize()
  loadCurrentUser()
})
watch(() => props.postSlug, () => initialize())
onBeforeUnmount(() => cleanupObservers())

async function initialize() {
  if (!envId.value || !container.value) return
  const currentGeneration = ++generation
  loading.value = true
  loadError.value = false
  commentCount.value = 0
  cleanupObservers()
  container.value.replaceChildren()
  const mountPoint = document.createElement('div')
  mountPoint.id = 'twikoo-comment-mount'
  container.value.append(mountPoint)

  try {
    const module = await import('twikoo/dist/twikoo.min.js')
    const init = resolveTwikooInit(module)
    await init({
      envId: envId.value,
      el: '#twikoo-comment-mount',
      path: `/${props.postSlug}`,
      lang: 'zh-CN',
      ...(region.value ? { region: region.value } : {})
    })
    if (currentGeneration !== generation) return
    observeCommentCount()
    setupEditorEnhancements()
  } catch (error) {
    console.error('[twikoo] initialization failed', error)
    if (currentGeneration === generation) loadError.value = true
  } finally {
    if (currentGeneration === generation) loading.value = false
  }
}

function cleanupObservers() {
  countObserver?.disconnect()
  editorObserver?.disconnect()
  if (container.value && editorKeydownHandler) container.value.removeEventListener('keydown', editorKeydownHandler)
  if (container.value && editorInputHandler) container.value.removeEventListener('input', editorInputHandler)
  countObserver = undefined
  editorObserver = undefined
  editorKeydownHandler = undefined
  editorInputHandler = undefined
  identityTarget.value = null
}

function observeCommentCount() {
  if (!container.value) return
  const updateCount = () => {
    const value = container.value?.querySelector('.tk-comments-count > span:first-child')?.textContent
    const parsed = Number.parseInt(value || '0', 10)
    commentCount.value = Number.isFinite(parsed) ? parsed : 0
  }
  updateCount()
  countObserver = new MutationObserver(updateCount)
  countObserver.observe(container.value, { childList: true, subtree: true, characterData: true })
}

type MarkdownAction = 'bold' | 'italic' | 'code' | 'link' | 'quote'

const markdownActions: Array<{ action: MarkdownAction, label: string, title: string }> = [
  { action: 'bold', label: 'B', title: '加粗（Ctrl+B）' },
  { action: 'italic', label: 'I', title: '斜体（Ctrl+I）' },
  { action: 'code', label: '</>', title: '行内代码（Ctrl+`）' },
  { action: 'link', label: '链接', title: '插入链接（Ctrl+K）' },
  { action: 'quote', label: '引用', title: '引用文本（Ctrl+Shift+Q）' }
]

function setupEditorEnhancements() {
  if (!container.value) return

  const enhanceEditors = () => {
    if (!container.value) return
    const topLevelSubmit = container.value.querySelector<HTMLElement>('.tk-comments>.tk-submit')
    if (topLevelSubmit) {
      const isFirstIdentityMount = !identityTarget.value
      identityTarget.value = topLevelSubmit
      const textarea = topLevelSubmit.querySelector<HTMLTextAreaElement>('textarea')
      if (textarea) commentDraft.value = textarea.value
      if (isFirstIdentityMount) {
        requestAnimationFrame(syncSelectedIdentity)
      }
    }
    for (const submit of container.value.querySelectorAll<HTMLElement>('.tk-submit')) {
      const actionStart = submit.querySelector<HTMLElement>('.tk-row-actions-start')
      const editorInput = submit.querySelector<HTMLElement>('.tk-input')
      if (!actionStart || !editorInput) continue

      let toolbar = editorInput.querySelector<HTMLElement>('.twikoo-format-toolbar')
      if (!toolbar) {
        toolbar = document.createElement('div')
        toolbar.className = 'twikoo-format-toolbar'
        toolbar.setAttribute('aria-label', '评论格式工具')
        for (const item of markdownActions) {
          const button = document.createElement('button')
          button.type = 'button'
          button.className = `twikoo-format-button is-${item.action}`
          button.textContent = item.label
          button.title = item.title
          button.setAttribute('aria-label', item.title)
          button.addEventListener('mousedown', event => event.preventDefault())
          button.addEventListener('click', () => {
            const textarea = submit.querySelector<HTMLTextAreaElement>('textarea')
            if (textarea) applyMarkdownAction(textarea, item.action)
          })
          toolbar.append(button)
        }
        editorInput.append(toolbar)
      }

      const emotionButton = actionStart.querySelector<HTMLElement>('.tk-submit-action-icon.OwO')
      if (emotionButton) toolbar.append(emotionButton)
    }
  }

  editorKeydownHandler = (event) => {
    if (!(event.ctrlKey || event.metaKey) || !(event.target instanceof HTMLTextAreaElement)) return
    const key = event.key.toLowerCase()
    const action = key === 'b'
      ? 'bold'
      : key === 'i'
        ? 'italic'
        : key === 'k'
          ? 'link'
          : key === '`'
            ? 'code'
            : key === 'q' && event.shiftKey
              ? 'quote'
              : null
    if (!action) return
    event.preventDefault()
    applyMarkdownAction(event.target, action)
  }

  editorInputHandler = (event) => {
    const target = event.target
    if (!(target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement)) return
    const topLevelSubmit = container.value?.querySelector<HTMLElement>('.tk-comments>.tk-submit')
    if (!topLevelSubmit?.contains(target)) return
    if (target instanceof HTMLTextAreaElement) commentDraft.value = target.value
    if (target instanceof HTMLInputElement && target.name === 'nick') manualMeta.nick = target.value
    if (target instanceof HTMLInputElement && target.name === 'mail') manualMeta.mail = target.value
  }

  enhanceEditors()
  container.value.addEventListener('keydown', editorKeydownHandler)
  container.value.addEventListener('input', editorInputHandler)
  editorObserver = new MutationObserver(enhanceEditors)
  editorObserver.observe(container.value, { childList: true, subtree: true })
}

async function loadCurrentUser() {
  const response = await $fetch<{ data: { user: CommentUser | null } }>('/api/auth/me').catch(() => null)
  currentUser.value = response?.data.user || null
  if (currentUser.value && !identityMode.value) {
    identityMode.value = 'account'
    await nextTick()
    syncSelectedIdentity()
  }
}

async function chooseAccountIdentity() {
  if (!currentUser.value) {
    await navigateTo({ path: '/login', query: { redirect: `${route.path}#comments` } })
    return
  }
  identityMode.value = 'account'
  await nextTick()
  syncSelectedIdentity()
}

async function logoutAccountIdentity() {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
  currentUser.value = null
  resetIdentity()
}

function chooseAnonymousIdentity() {
  identityMode.value = 'anonymous'
  regenerateAnonymousIdentity()
}

function regenerateAnonymousIdentity() {
  Object.assign(anonymousIdentity, createAnonymousIdentity())
  nextTick(() => setTwikooMeta(anonymousIdentity))
}

function chooseManualIdentity() {
  identityMode.value = 'manual'
  manualMeta.nick = ''
  manualMeta.mail = ''
  nextTick(() => {
    setTwikooMeta({ nick: '', mail: '', link: '' })
    getTopLevelSubmit()?.querySelector<HTMLInputElement>('input[name="nick"]')?.focus()
  })
}

function resetIdentity() {
  identityMode.value = null
  manualMeta.nick = ''
  manualMeta.mail = ''
  setTwikooMeta({ nick: '', mail: '', link: '' })
}

function createAnonymousIdentity() {
  const adjectives = ['安静的', '有趣的', '自由的', '温柔的', '好奇的', '路过的']
  const nouns = ['葡萄', '海盐', '云朵', '松果', '星光', '旅人']
  const token = cryptoRandomToken()
  return {
    nick: `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`,
    mail: `anonymous-${token}@users.noreply.invalid`,
    link: ''
  }
}

function cryptoRandomToken() {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return (crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now()).toString(36)
  }
  return Math.random().toString(36).slice(2, 10)
}

function getTopLevelSubmit() {
  return container.value?.querySelector<HTMLElement>('.tk-comments>.tk-submit') || null
}

function setTwikooMeta(meta: { nick: string, mail: string, link: string }) {
  const submit = getTopLevelSubmit()
  if (!submit) return
  for (const [name, value] of Object.entries(meta)) {
    const input = submit.querySelector<HTMLInputElement>(`input[name="${name}"]`)
    if (!input) continue
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function syncSelectedIdentity() {
  if (identityMode.value === 'account' && currentUser.value) {
    setTwikooMeta({
      nick: currentUser.value.username,
      mail: currentUser.value.email || `user-${currentUser.value.id}@users.noreply.invalid`,
      link: ''
    })
    return
  }
  if (identityMode.value === 'anonymous') {
    setTwikooMeta(anonymousIdentity)
    return
  }
  if (!identityMode.value) setTwikooMeta({ nick: '', mail: '', link: '' })
}

function sendComment() {
  if (!canSendComment.value) return
  getTopLevelSubmit()?.querySelector<HTMLButtonElement>('.tk-send')?.click()
}

function applyMarkdownAction(textarea: HTMLTextAreaElement, action: MarkdownAction) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end)
  let replacement = ''
  let selectionStart = start
  let selectionEnd = start

  if (action === 'quote') {
    const content = selected || '引用文字'
    replacement = content.split('\n').map(line => `> ${line}`).join('\n')
    selectionStart = start + 2
    selectionEnd = start + replacement.length
  } else if (action === 'link') {
    const content = selected || '链接文字'
    replacement = `[${content}](https://)`
    selectionStart = start + 1
    selectionEnd = start + 1 + content.length
  } else {
    const marker = action === 'bold' ? '**' : action === 'italic' ? '*' : '`'
    const content = selected || (action === 'bold' ? '粗体文字' : action === 'italic' ? '斜体文字' : '代码')
    replacement = `${marker}${content}${marker}`
    selectionStart = start + marker.length
    selectionEnd = selectionStart + content.length
  }

  textarea.setRangeText(replacement, start, end, 'end')
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
  textarea.setSelectionRange(selectionStart, selectionEnd)
}

function resolveTwikooInit(module: unknown): (options: TwikooInitOptions) => Promise<void> {
  const imported = module as { default?: unknown }
  const candidate = imported.default as { default?: unknown, init?: unknown } | ((options: TwikooInitOptions) => Promise<void>) | undefined
  const init = typeof candidate === 'function'
    ? candidate
    : typeof candidate?.default === 'function'
      ? candidate.default
      : candidate?.init
  if (typeof init !== 'function') throw new Error('Twikoo 初始化函数不可用')
  return init as (options: TwikooInitOptions) => Promise<void>
}

type TwikooInitOptions = {
  envId: string
  el: string
  path: string
  lang: string
  region?: string
}
</script>

<style scoped>
.twikoo-section {
  margin-top: 14px;
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  background: var(--theme-surface);
  padding: 26px 24px 22px;
  color: var(--theme-text);
}

.twikoo-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.twikoo-heading-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.twikoo-heading-title>svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
  color: var(--theme-text);
}

.twikoo-heading h2 {
  margin: 0;
  color: var(--theme-text);
  font-size: 22px;
  font-weight: 850;
  letter-spacing: -.035em;
}

.twikoo-heading p {
  margin: 0;
  color: var(--theme-text-faint);
  font-size: 12px;
}

.twikoo-count-badge {
  display: grid;
  min-width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 999px;
  background: var(--theme-text);
  padding: 0 6px;
  color: var(--theme-surface);
  font-size: 11px;
  font-weight: 800;
}

.twikoo-state {
  display: grid;
  min-height: 170px;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed var(--theme-border-soft);
  border-radius: 16px;
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
}

.twikoo-state>svg { color: #a14b40; font-size: 28px; }
.twikoo-state strong { color: var(--theme-text); }
.twikoo-state span { font-size: 12px; }
.twikoo-state button { border: 1px solid var(--theme-border-soft); border-radius: 999px; background: var(--theme-surface); padding: 7px 13px; color: var(--theme-text); cursor: pointer; }
.twikoo-state.is-loading>svg { animation: twikoo-spin 1s linear infinite; }
.twikoo-comment-host:not(.is-ready) { display: none; }

/* Composer */
.twikoo-section :deep(.tk-submit) { margin: 0 0 26px; }
.twikoo-section :deep(.tk-submit>.tk-row:first-child) {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  grid-template-areas: "input input" "avatar meta";
  gap: 12px 10px;
  align-items: center;
}
.twikoo-section :deep(.tk-submit>.tk-row:first-child>.tk-avatar) { grid-area: avatar; }
.twikoo-section :deep(.tk-submit>.tk-row:first-child>.tk-col) { display: contents; }
.twikoo-section :deep(.tk-submit>.tk-row:first-child .tk-input) { grid-area: input; }
.twikoo-section :deep(.tk-submit>.tk-row:first-child .tk-meta-input) { grid-area: meta; margin: 0; }
.twikoo-section :deep(.tk-submit>.tk-row:first-child>.tk-avatar),
.twikoo-section :deep(.tk-submit>.tk-row:first-child>.tk-avatar .tk-avatar-img) { width: 34px; height: 34px; }
.twikoo-section :deep(.tk-submit>.tk-row:first-child>.tk-avatar) { margin: 0; border-radius: 50%; }
.twikoo-section :deep(.tk-input .el-textarea__inner) {
  min-height: 104px!important;
  resize: vertical;
  border: 1px solid var(--theme-border-soft);
  border-radius: 14px;
  background: var(--theme-surface-muted);
  padding: 17px 18px 54px;
  color: var(--theme-text);
  font: inherit;
  font-size: 15px;
  line-height: 1.75;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 45%);
  transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
}
.twikoo-section :deep(.tk-input .el-input__count) { display: none; }
.twikoo-section :deep(.tk-input .el-textarea__inner::-webkit-resizer) {
  background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cg fill='none' stroke='%23b7bec8' stroke-linecap='round' stroke-width='1.25'%3E%3Cpath d='M8.5 11.5l3-3'/%3E%3Cpath d='M5 11.5l6.5-6.5'/%3E%3C/g%3E%3C/svg%3E") center/14px 14px no-repeat;
}
.twikoo-section :deep(.tk-input .el-textarea__inner:focus) { border-color: #c9948d; background: var(--theme-surface); box-shadow: 0 0 0 4px rgb(161 75 64 / 8%); }
.twikoo-section :deep(.tk-meta-input) { display: flex; flex-wrap: wrap; gap: 8px; }
.twikoo-section :deep(.tk-meta-input .el-input) { width: auto; min-width: 130px; flex: 1; margin: 0!important; }
.twikoo-section :deep(.tk-meta-input .el-input-group__prepend) { border-color: var(--theme-border-soft); border-radius: 999px 0 0 999px; background: var(--theme-surface-muted); padding: 0 10px; color: var(--theme-text-muted); }
.twikoo-section :deep(.tk-meta-input .el-input__inner) { height: 34px; border-color: var(--theme-border-soft); border-radius: 0 999px 999px 0; background: var(--theme-surface); color: var(--theme-text); line-height: 34px; }
.twikoo-section :deep(.tk-row.actions) { min-height: 36px; margin: 10px 0 0; }
.twikoo-section :deep(.tk-row-actions-start) { gap: 2px; }
.twikoo-section :deep(.tk-submit-action-icon.__markdown),.twikoo-section :deep(.tk-preview) { display: none!important; }
.twikoo-section :deep(.tk-input) { position: relative; }
.twikoo-section :deep(.twikoo-format-toolbar) {
  position: absolute;
  z-index: 2;
  bottom: 11px;
  left: 12px;
  display: inline-flex;
  max-width: calc(100% - 24px);
  align-items: center;
  overflow: visible;
  border: 1px solid var(--theme-border-soft);
  border-radius: 999px;
  background: var(--theme-surface);
  box-shadow: 0 1px 3px rgb(15 23 42 / 4%);
}
.twikoo-section :deep(.twikoo-format-button) { display: grid; min-width: 30px; height: 28px; place-items: center; border: 0; border-right: 1px solid var(--theme-border-soft); background: transparent; padding: 0 8px; color: var(--theme-text-muted); font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; }
.twikoo-section :deep(.twikoo-format-button:last-child) { border-right: 0; }
.twikoo-section :deep(.twikoo-format-button:hover),.twikoo-section :deep(.twikoo-format-button:focus-visible) { background: rgb(161 75 64 / 8%); color: #a14b40; outline: none; }
.twikoo-section :deep(.twikoo-format-button.is-bold) { font-size: 13px; font-weight: 900; }
.twikoo-section :deep(.twikoo-format-button.is-italic) { font-family: Georgia, serif; font-size: 14px; font-style: italic; }
.twikoo-section :deep(.twikoo-format-toolbar>.tk-submit-action-icon.OwO) {
  display: grid;
  width: 32px;
  height: 28px;
  flex: 0 0 32px;
  place-items: center;
  border-left: 1px solid var(--theme-border-soft);
  margin: 0;
  color: var(--theme-text-muted);
  line-height: 1;
}
.twikoo-section :deep(.twikoo-format-toolbar>.tk-submit-action-icon.OwO svg) { width: 17px; height: 17px; }
.twikoo-section :deep(.twikoo-format-toolbar>.OwO .OwO-body) {
  top: auto;
  right: auto;
  bottom: calc(100% + 8px);
  left: 0;
  width: min(500px, calc(100vw - 72px));
  max-width: none;
  max-height: 260px;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgb(15 23 42 / 16%);
}
.twikoo-section :deep(.twikoo-format-toolbar>.OwO .OwO-items) { max-height: 210px; }
.twikoo-section :deep(.tk-submit-action-icon) { width: 18px; margin-right: 9px; color: var(--theme-text-muted); }
.twikoo-section :deep(.tk-preview),.twikoo-section :deep(.tk-cancel),.twikoo-section :deep(.tk-send) { height: 34px; border-radius: 999px; padding: 0 15px; font-weight: 700; }
.twikoo-section :deep(.tk-preview),.twikoo-section :deep(.tk-cancel) { border-color: var(--theme-border-soft); background: var(--theme-surface); color: var(--theme-text-muted); }
.twikoo-section :deep(.tk-send.el-button--primary) { border-color: #a14b40; background: #a14b40; color: #fff; }
.twikoo-section :deep(.tk-send.el-button--primary:hover) { border-color: #8e4037; background: #8e4037; }
.twikoo-section :deep(.tk-send.el-button--primary.is-disabled) { border-color: #d7bbb7; background: #d7bbb7; color: #fff; }

/* Identity selection for the main composer */
.twikoo-comment-host :deep(.tk-comments>.tk-submit .tk-send) { display: none!important; }
.twikoo-comment-host :deep(.tk-comments>.tk-submit>.tk-row.actions) { display: none!important; }
.twikoo-comment-host:not(.identity-manual) :deep(.tk-comments>.tk-submit>.tk-row:first-child) { display: block; }
.twikoo-comment-host:not(.identity-manual) :deep(.tk-comments>.tk-submit>.tk-row:first-child>.tk-avatar),
.twikoo-comment-host:not(.identity-manual) :deep(.tk-comments>.tk-submit>.tk-row:first-child .tk-meta-input) { display: none!important; }

.comment-identity-bar {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  margin-top: 9px;
  color: var(--theme-text);
}

.identity-choice,
.identity-links a,
.identity-links button,
.identity-switch-button,
.identity-send {
  border: 1px solid var(--theme-border-soft);
  border-radius: 999px;
  background: var(--theme-surface);
  color: var(--theme-text-muted);
  font: inherit;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, color .18s ease;
}

.identity-choice {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 18px;
  font-size: 13px;
}

.identity-choice svg { width: 17px; height: 17px; }
.identity-choice.is-account { border-color: #a14b40; background: #a14b40; color: #fff; }
.identity-choice:hover { border-color: #c9948d; background: rgb(161 75 64 / 7%); color: #a14b40; }
.identity-choice.is-account:hover { border-color: #8e4037; background: #8e4037; color: #fff; }

.identity-profile,
.identity-links,
.identity-manual-hint {
  display: inline-flex;
  align-items: center;
}

.identity-profile { gap: 8px; min-width: 0; }
.identity-profile strong { overflow: hidden; max-width: 220px; font-size: 14px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.identity-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border: 1px solid var(--theme-border-soft);
  border-radius: 50%;
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
}
.identity-avatar svg { width: 21px; height: 21px; }
.identity-avatar.is-account { color: #4567db; }
.identity-avatar.is-anonymous { color: #a14b40; }
.identity-verified { display: grid; place-items: center; color: #4567db; }
.identity-verified svg { width: 17px; height: 17px; fill: currentColor; }

.identity-links { gap: 8px; }
.identity-links a,
.identity-links button,
.identity-switch-button {
  display: inline-flex;
  min-height: 31px;
  align-items: center;
  gap: 5px;
  padding: 0 13px;
  font-size: 12px;
  text-decoration: none;
}
.identity-links button { color: #a14b40; }
.identity-links a:hover,
.identity-links button:hover,
.identity-switch-button:hover { border-color: #d9aaa4; background: rgb(161 75 64 / 7%); color: #a14b40; }
.identity-switch svg { width: 14px; height: 14px; }

.identity-manual-hint { gap: 7px; color: var(--theme-text-muted); font-size: 13px; }
.identity-manual-hint svg { width: 20px; height: 20px; color: #a14b40; }

.identity-send {
  min-height: 36px;
  margin-left: auto;
  border-color: #a14b40;
  background: #a14b40;
  padding: 0 18px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.identity-send span { margin-left: 4px; font-size: 10px; font-weight: 500; opacity: .72; }
.identity-send:hover:not(:disabled) { border-color: #8e4037; background: #8e4037; }
.identity-send:disabled { border-color: #d7bbb7; background: #d7bbb7; cursor: not-allowed; opacity: .9; }

/* Comment list and footer controls */
.twikoo-section :deep(.tk-comments-container) { min-height: 100px; color: var(--theme-text); }
.twikoo-section :deep(.tk-comments-title) {
  order: 50;
  justify-content: flex-start;
  margin: 18px 2px 0;
  padding-top: 16px;
  border-top: 1px solid var(--theme-border-soft);
  color: var(--theme-text-muted);
  font-size: 13px;
  font-weight: 500;
}
.twikoo-section :deep(.tk-comments-count.__hidden) { visibility: visible; }
.twikoo-section :deep(.tk-comments-count) { order: 2; display: inline-flex; align-items: center; gap: 4px; }
.twikoo-section :deep(.tk-comments-actions) { display: contents; }
.twikoo-section :deep(.tk-comments-sort) { order: 3; gap: 6px; margin: 0; }
.twikoo-section :deep(.tk-sort-item) { border: 1px solid var(--theme-border-soft); border-radius: 999px; padding: 6px 11px; color: var(--theme-text-muted); font-size: 12px; }
.twikoo-section :deep(.tk-sort-item.__active) { border-color: #d9aaa4; background: rgb(161 75 64 / 7%); color: #a14b40; }
.twikoo-section :deep(.tk-comments-title .tk-comments-actions>.tk-icon.__comments:last-child) { display: none!important; }
.twikoo-section :deep(.tk-icon.__comments) { order: 1; width: 14px; height: 14px; color: #a14b40; }
.twikoo-section :deep(.tk-comments-no) { min-height: 120px; border: 1px dashed var(--theme-border-soft); border-radius: 14px; background: var(--theme-surface-muted); color: var(--theme-text-muted); }

/* Top-level comment cards */
.twikoo-section :deep(.tk-comments-container>.tk-comment) {
  margin-top: 12px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 14px;
  background: var(--theme-surface-muted);
  padding: 20px;
  box-shadow: 0 6px 18px rgb(15 23 42 / 3%);
}
.twikoo-section :deep(.tk-comment>.tk-avatar) { width: 42px; height: 42px; margin-right: 13px; border-radius: 50%; }
.twikoo-section :deep(.tk-comment>.tk-avatar .tk-avatar-img) { width: 42px; height: 42px; }
.twikoo-section :deep(.tk-comment .tk-row) { align-items: flex-start; gap: 12px; }
.twikoo-section :deep(.tk-comment .tk-meta) { display: flex; flex: 1; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
.twikoo-section :deep(.tk-nick),.twikoo-section :deep(.tk-nick-link) { color: #4567db; font-size: 15px; font-weight: 750; }
.twikoo-section :deep(.tk-time) { width: 100%; color: var(--theme-text-faint); font-size: 12px; font-weight: 500; }
.twikoo-section :deep(.tk-tag) { border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 750; }
.twikoo-section :deep(.tk-content) { margin-top: 16px; color: var(--theme-text); font-size: 15px; line-height: 1.8; }
.twikoo-section :deep(.tk-content p) { margin: 0 0 8px; }
.twikoo-section :deep(.tk-content p:last-child) { margin-bottom: 0; }
.twikoo-section :deep(.tk-action) { flex: 0 0 auto; gap: 5px; }
.twikoo-section :deep(.tk-action-link) { display: grid; min-width: 34px; height: 34px; place-items: center; border: 1px solid var(--theme-border-soft); border-radius: 999px; background: var(--theme-surface); margin: 0; padding: 0 8px; color: #a14b40; }
.twikoo-section :deep(.tk-action-link:hover) { border-color: #d9aaa4; background: rgb(161 75 64 / 7%); }
.twikoo-section :deep(.tk-action-icon) { color: currentColor; }
.twikoo-section :deep(.tk-extras) { gap: 6px; margin-top: 14px; color: var(--theme-text-muted); font-size: 11px; }
.twikoo-section :deep(.tk-extra) { gap: 3px; margin: 0; border: 1px solid var(--theme-border-soft); border-radius: 999px; background: var(--theme-surface); padding: 4px 9px; }

/* Replies stay inside their parent card */
.twikoo-section :deep(.tk-replies) { margin-top: 16px; border-left: 1px dashed var(--theme-border); padding-left: 18px; }
.twikoo-section :deep(.tk-replies .tk-comment) { margin-top: 0; border-top: 1px dashed var(--theme-border-soft); padding: 16px 0; }
.twikoo-section :deep(.tk-replies>.tk-comment:first-child) { border-top: 0; }
.twikoo-section :deep(.tk-replies .tk-avatar),.twikoo-section :deep(.tk-replies .tk-avatar .tk-avatar-img) { width: 34px; height: 34px; }
.twikoo-section :deep(.tk-replies .tk-avatar) { border-radius: 50%; }
.twikoo-section :deep(.tk-replies .tk-content) { font-size: 14px; }
.twikoo-section :deep(.tk-footer) { display: none; }

@keyframes twikoo-spin { to { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .twikoo-section { padding: 22px 14px 18px; }
  .twikoo-heading { align-items: flex-start; margin-bottom: 20px; }
  .twikoo-heading>p { display: none; }
  .twikoo-section :deep(.tk-input .el-textarea__inner) { min-height: 96px!important; font-size: 16px; }
  .twikoo-section :deep(.tk-submit>.tk-row:first-child) { grid-template-columns: 34px minmax(0, 1fr); }
  .twikoo-section :deep(.tk-meta-input) { display: grid; grid-template-columns: 1fr; }
  .twikoo-section :deep(.tk-meta-input .el-input) { width: 100%; }
  .twikoo-section :deep(.tk-row.actions) { flex-wrap: wrap; gap: 8px; }
  .twikoo-section :deep(.tk-row-actions-start) { min-width: 80px; }
  .twikoo-section :deep(.twikoo-format-toolbar) { max-width: calc(100% - 20px); bottom: 9px; left: 10px; }
  .twikoo-section :deep(.twikoo-format-button) { flex: 0 0 auto; }
  .comment-identity-bar { flex-wrap: wrap; margin-top: 8px; }
  .comment-identity-bar.is-chooser { display: grid; grid-template-columns: 1fr 1fr; }
  .comment-identity-bar.is-chooser .identity-choice.is-account { grid-column: 1 / -1; }
  .identity-choice { width: 100%; padding: 0 12px; }
  .identity-profile strong { max-width: 150px; }
  .identity-send { margin-left: auto; }
  .comment-identity-bar.is-manual .identity-manual-hint { display: none; }
  .twikoo-section :deep(.tk-comments-container>.tk-comment) { padding: 16px 13px; }
  .twikoo-section :deep(.tk-comment>.tk-avatar),.twikoo-section :deep(.tk-comment>.tk-avatar .tk-avatar-img) { width: 36px; height: 36px; }
  .twikoo-section :deep(.tk-comment>.tk-avatar) { margin-right: 9px; }
  .twikoo-section :deep(.tk-action-link) { min-width: 30px; height: 30px; padding: 0 6px; }
  .twikoo-section :deep(.tk-comments-title) { align-items: center; flex-wrap: wrap; gap: 10px; }
  .twikoo-section :deep(.tk-replies) { padding-left: 10px; }
}
</style>
