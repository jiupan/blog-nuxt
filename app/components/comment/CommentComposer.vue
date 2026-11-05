<template>
  <form class="comment-composer" :class="`is-${variant}`" @submit.prevent="send">
    <div class="comment-composer-header">
      <div class="comment-identity" role="group" aria-label="评论身份">
        <button
          v-for="option in identityOptions"
          :key="option.value"
          type="button"
          class="comment-identity-option"
          :class="{ 'is-active': identityChoice === option.value }"
          :aria-pressed="identityChoice === option.value"
          @click="chooseIdentity(option.value)"
        >
          <Icon :name="option.icon" aria-hidden="true" />
          <span>{{ option.label }}</span>
        </button>
      </div>

      <div class="comment-guest-row" :class="{ 'is-inactive': identityChoice !== 'guest-named' }" :aria-hidden="identityChoice !== 'guest-named'">
        <label class="comment-guest-label" :for="guestInputId">昵称</label>
        <input
          :id="guestInputId"
          v-model="guestName"
          :disabled="identityChoice !== 'guest-named'"
          class="comment-guest-input"
          type="text"
          :maxlength="COMMENT_NAME_MAX_LENGTH"
          placeholder="2-24 个字符"
          autocomplete="nickname"
        >
      </div>
    </div>

    <div v-if="variant === 'reply' && replyTarget" class="comment-reply-bar">
      <span class="comment-reply-text">回复 <strong>@{{ replyTarget.authorName }}</strong></span>
      <button type="button" class="comment-reply-cancel" @click="cancel">取消</button>
    </div>

    <textarea
      ref="textarea"
      v-model="body"
      class="comment-input"
      :rows="variant === 'reply' ? 3 : 4"
      :maxlength="COMMENT_BODY_MAX_LENGTH"
      :placeholder="placeholder"
      aria-label="评论内容"
      @keydown="handleKeydown"
    />

    <div ref="emotionsRoot" class="comment-emotions" @keydown.esc.stop.prevent="closeEmotions">
      <button ref="emotionToggle" type="button" class="comment-emotion-toggle" aria-haspopup="dialog" :aria-expanded="emotionsOpen" :aria-controls="emotionsId" @click="toggleEmotions">
        <Icon name="i-lucide-smile" aria-hidden="true" /> 表情
      </button>
      <div v-if="emotionsOpen" :id="emotionsId" class="comment-emotion-panel" :style="emotionsStyle" role="dialog" aria-label="选择表情">
        <div class="comment-emotion-heading"><strong>选择表情</strong><button type="button" aria-label="关闭表情面板" @click="closeEmotions">×</button></div>
        <div class="comment-emotion-tabs" role="group" aria-label="表情分类">
          <button v-for="(group, index) in emotionGroups" :key="group.label" type="button" :aria-pressed="emotionGroup === index" @click="emotionGroup = index">{{ group.label }}</button>
        </div>
        <div class="comment-emotion-grid" :class="{ 'is-text': emotionGroup === 1 }">
          <button v-for="emotion in emotionGroups[emotionGroup]!.items" :key="emotion" type="button" :aria-label="`插入 ${emotion}`" @mousedown.prevent @click="insertEmotion(emotion)">{{ emotion }}</button>
        </div>
      </div>
    </div>

    <div class="comment-composer-footer">
      <span class="comment-counter" :class="{ 'is-over': bodyLength > COMMENT_BODY_MAX_LENGTH }">
        {{ bodyLength }}/{{ COMMENT_BODY_MAX_LENGTH }}
      </span>
      <span class="comment-hint">Ctrl / ⌘ + Enter 发送</span>
      <button type="submit" class="comment-submit" :disabled="!canSubmit">
        <Icon name="i-lucide-send" aria-hidden="true" />
        <span>{{ variant === 'reply' ? '发布回复' : '发表评论' }}</span>
      </button>
    </div>

    <p
      v-if="feedback.kind !== 'idle'"
      class="comment-feedback"
      :class="`is-${feedback.kind}`"
      role="status"
    >
      {{ feedback.message }}
    </p>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { createRequestId, useCommentContext } from '../../composables/usePostComments'
import type { CommentDraft, CommentFeedback, CommentIdentityChoice } from '~/composables/usePostComments'
import {
  COMMENT_BODY_MAX_LENGTH,
  COMMENT_NAME_MAX_LENGTH,
  COMMENT_NAME_MIN_LENGTH,
  countCommentCodePoints
} from '~/utils/comment'

const props = defineProps<{
  /** root 是文章下的主编辑器，reply 是楼中楼的回复框。 */
  variant: 'root' | 'reply'
}>()

const emit = defineEmits<{ cancel: [] }>()

const context = useCommentContext()
const guestInputId = useId()
const emotionsId = useId()
const textarea = ref<HTMLTextAreaElement | null>(null)
const emotionToggle = ref<HTMLButtonElement | null>(null)
const emotionsOpen = ref(false)
const emotionsRoot = ref<HTMLElement | null>(null)
const emotionsStyle = ref<Record<string, string>>({})
function toggleEmotions() {
  if (emotionsOpen.value) { closeEmotions(); return }
  const rect = emotionToggle.value?.getBoundingClientRect()
  if (rect) {
    const below = window.innerHeight - rect.bottom - 16
    const above = rect.top - 16
    emotionsStyle.value = above >= 240 || above >= below
      ? { bottom: 'calc(100% + 8px)', maxHeight: `${Math.max(96, Math.min(320, above))}px` }
      : { top: 'calc(100% + 8px)', maxHeight: `${Math.max(96, Math.min(320, below))}px` }
  }
  emotionsOpen.value = true
}
function dismissEmotions(event: PointerEvent) {
  if (emotionsOpen.value && event.target instanceof Node && !emotionsRoot.value?.contains(event.target)) emotionsOpen.value = false
}
function escapeEmotions(event: KeyboardEvent) {
  if (event.key === 'Escape' && emotionsOpen.value && !event.isComposing) {
    event.preventDefault()
    closeEmotions()
  }
}
onMounted(() => {
  document.addEventListener('pointerdown', dismissEmotions, true)
  document.addEventListener('keydown', escapeEmotions)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', dismissEmotions, true)
  document.removeEventListener('keydown', escapeEmotions)
})
const emotionGroup = ref(0)
const emotionGroups = [
  { label: '常用表情', items: ['😀', '😁', '😂', '🤣', '😊', '🥰', '😍', '😎', '🤔', '🙃', '🥺', '😭', '😅', '😮', '😴', '🤯', '👍', '👏', '🙌', '🙏', '🤝', '💪', '❤️', '💔', '🔥', '✨', '🎉', '💯', '👀', '☕', '🍉', '🐱'] },
  { label: '颜文字', items: ['(๑•̀ㅂ•́)و✧', '(≧▽≦)', '(｡･ω･｡)', '(╥﹏╥)', '(￣▽￣)', '٩(ˊᗜˋ*)و', 'ヾ(•ω•`)o', '(づ｡◕‿‿◕｡)づ', 'Σ(°△°|||)', '(ง •̀_•́)ง', '(´･ω･`)', '¯\\_(ツ)_/¯'] }
]
function closeEmotions() {
  emotionsOpen.value = false
  emotionToggle.value?.focus()
}
async function insertEmotion(value: string) {
  const field = textarea.value
  if (!field) return
  const start = field.selectionStart
  const end = field.selectionEnd
  const next = body.value.slice(0, start) + value + body.value.slice(end)
  if (countCommentCodePoints(next) > COMMENT_BODY_MAX_LENGTH) {
    feedback.value = { kind: 'field', message: `评论内容不能超过 ${COMMENT_BODY_MAX_LENGTH} 个字符` }
    return
  }
  body.value = next
  await nextTick()
  field.focus()
  field.setSelectionRange(start + value.length, start + value.length)
}
const body = ref('')
const feedback = ref<CommentFeedback>({ kind: 'idle', message: '' })
const sending = ref(false)
const draft = ref<CommentDraft>({ body: '', requestId: createRequestId() })

const identityChoice = computed(() => context.identityChoice.value)
const guestName = computed({
  get: () => context.guestName.value,
  set: (value: string) => {
    context.guestName.value = value
  }
})
const replyTarget = computed(() => (props.variant === 'reply' ? context.replyTarget.value : null))
const targetId = computed(() => replyTarget.value?.commentId ?? null)
const displayName = computed(() => identityChoice.value === 'guest-named' ? guestName.value.trim() : '')
const bodyLength = computed(() => countCommentCodePoints(body.value))
const placeholder = computed(() => (props.variant === 'reply'
  ? '写下你的回复…'
  : '说点什么吧…支持 Markdown'))

const identityOptions = computed(() => {
  const options: Array<{ value: CommentIdentityChoice, label: string, icon: string }> = []

  // 已登录默认用账号，也可以主动切到访客身份。访客身份不关联账户，但账户限额照样扣。
  if (context.account.value) {
    options.push({
      value: 'account',
      label: context.account.value.username,
      icon: 'i-lucide-circle-user-round'
    })
  }
  options.push({ value: 'guest-named', label: '访客署名', icon: 'i-lucide-pen-line' })
  options.push({ value: 'guest-anonymous', label: '匿名', icon: 'i-lucide-user-round' })

  return options
})

const canSubmit = computed(() => {
  if (sending.value) return false
  if (bodyLength.value === 0 || bodyLength.value > COMMENT_BODY_MAX_LENGTH) return false
  return true
})

onMounted(loadDraft)

watch([() => context.postId.value, () => context.identityChoice.value, targetId], loadDraft, { flush: 'sync' })

watch([body, displayName], ([value, name]) => {
  const identity = context.identityChoice.value
  const id = targetId.value

  if (!value.trim()) {
    context.clearDraft(identity, id)
    draft.value = { body: '', requestId: createRequestId() }
    return
  }

  // 正文或昵称变动都会改变提交快照；重试未变的快照时才复用编号。
  if (value === draft.value.body && name === draft.value.displayName) return
  draft.value = { body: value, displayName: name, requestId: createRequestId() }
  context.writeDraft(identity, id, draft.value)
}, { flush: 'sync' })

async function chooseIdentity(choice: CommentIdentityChoice) {
  if (context.identityChoice.value === choice) return
  context.identityChoice.value = choice
  feedback.value = { kind: 'idle', message: '' }

  // 访客署名需要一个默认昵称，顺带把访客凭证立起来。
  if (choice === 'guest-named') {
    try {
      await context.ensureGuestSession()
    } catch {
      feedback.value = { kind: 'network', message: '访客身份建立失败，请重试。草稿已保留。' }
    }
  }
}

function loadDraft() {
  const stored = context.readDraft(context.identityChoice.value, targetId.value)
  draft.value = stored && stored.displayName === displayName.value
    ? stored
    : { body: stored?.body ?? '', displayName: displayName.value, requestId: createRequestId() }
  body.value = draft.value.body
  if (body.value.trim()) context.writeDraft(context.identityChoice.value, targetId.value, draft.value)
  feedback.value = { kind: 'idle', message: '' }
}

function cancel() {
  emit('cancel')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  if (!event.ctrlKey && !event.metaKey) return
  // 输入法合成期间不触发快捷键，否则中文候选词确认会误发。
  if (event.isComposing || event.keyCode === 229) return

  event.preventDefault()
  void send()
}

async function send() {
  if (sending.value) return
  feedback.value = { kind: 'idle', message: '' }

  const identity = context.identityChoice.value
  const id = targetId.value
  const postId = context.postId.value
  const text = body.value.trim()

  if (!text) {
    feedback.value = { kind: 'field', message: '评论内容不能为空' }
    return
  }
  if (bodyLength.value > COMMENT_BODY_MAX_LENGTH) {
    feedback.value = { kind: 'field', message: `评论内容不能超过 ${COMMENT_BODY_MAX_LENGTH} 个字符` }
    return
  }
  if (identity === 'guest-named') {
    const nameLength = countCommentCodePoints(context.guestName.value.trim())
    if (nameLength < COMMENT_NAME_MIN_LENGTH || nameLength > COMMENT_NAME_MAX_LENGTH) {
      feedback.value = {
        kind: 'field',
        message: `昵称需要 ${COMMENT_NAME_MIN_LENGTH} 到 ${COMMENT_NAME_MAX_LENGTH} 个字符`
      }
      return
    }
  }

  const requestId = draft.value.requestId || createRequestId()
  const record: CommentDraft = { body: text, displayName: displayName.value, requestId }
  draft.value = record
  context.writeDraft(identity, id, record)

  sending.value = true
  const result = await context.submit({
    body: text,
    requestId,
    identityChoice: identity,
    guestDisplayName: context.guestName.value,
    replyToId: id
  })
  sending.value = false

  const sameContext = context.postId.value === postId
    && context.identityChoice.value === identity && targetId.value === id

  // 失败时草稿留着，用户改完再发。
  if (!result.ok) {
    if (sameContext) feedback.value = result.feedback
    return
  }

  // 只移除原提交对应的草稿，不能覆盖请求期间切换或编辑后的另一份草稿。
  if (context.readDraft(identity, id, postId)?.requestId === requestId) {
    context.clearDraft(identity, id, postId)
  }
  if (!sameContext || draft.value.requestId !== requestId) return

  feedback.value = result.payload.pendingReview
    ? { kind: 'pending', message: '评论已提交，审核通过后会出现在讨论里。' }
    : { kind: 'success', message: '评论已发布。' }

  body.value = ''
  draft.value = { body: '', displayName: displayName.value, requestId: createRequestId() }

  if (props.variant === 'reply') emit('cancel')
}
</script>

<style scoped>
.comment-emotions { position: relative; margin-top: 8px; }
.comment-emotion-toggle { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border-radius: 6px; color: var(--theme-text-muted); font-size: 13px; cursor: pointer; }
.comment-emotion-toggle:hover, .comment-emotion-tabs button[aria-pressed="true"] { background: var(--theme-surface); color: var(--theme-accent); }
.comment-emotion-panel { position: absolute; left: 0; z-index: 40; width: min(100%, 380px); overflow-y: auto; overscroll-behavior: contain; padding: 10px; border: 1px solid var(--theme-border); border-radius: 10px; background: var(--theme-surface); box-shadow: 0 8px 30px rgb(0 0 0 / 14%); }
.comment-emotion-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; color: var(--theme-text-muted); font-size: 12px; }
.comment-emotion-heading button { width: 28px; height: 28px; border-radius: 5px; cursor: pointer; font-size: 20px; }
.comment-emotion-tabs { display: flex; gap: 8px; margin-bottom: 8px; }
.comment-emotion-tabs button { padding: 5px 9px; border-radius: 5px; font-size: 12px; cursor: pointer; }
.comment-emotion-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; }
.comment-emotion-grid.is-text { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.comment-emotion-grid button { min-width: 0; min-height: 36px; border-radius: 5px; font-size: 22px; cursor: pointer; }
.comment-emotion-grid.is-text button { font-size: 12px; overflow-wrap: anywhere; }
.comment-emotion-grid button:hover { background: var(--theme-surface-muted); }
.comment-emotions button:focus-visible { outline: 2px solid var(--theme-accent); outline-offset: 2px; }
.comment-composer {
  container-type: inline-size;
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  background: var(--theme-surface-muted);
  padding: 12px 14px;
}

.comment-composer.is-reply {
  margin-top: 10px;
  background: var(--theme-surface);
}

.comment-composer-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(160px, 280px);
  align-items: center;
  gap: 10px 16px;
}

.comment-guest-row.is-inactive {
  visibility: hidden;
  pointer-events: none;
}

@container (max-width: 640px) {
  .comment-composer-header { grid-template-columns: minmax(0, 1fr); }
}

.comment-identity {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.comment-identity-option {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-surface);
  padding: 0 12px;
  color: var(--theme-text-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.16s ease, color 0.16s ease, background-color 0.16s ease;
}

.comment-identity-option:hover {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.comment-identity-option.is-active {
  border-color: var(--theme-accent);
  background: var(--theme-accent-soft);
  color: var(--theme-accent);
  font-weight: 700;
}

.comment-identity-option :deep(svg) {
  width: 15px;
  height: 15px;
}

.comment-guest-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  min-width: 0;
}

.comment-guest-label {
  flex: 0 0 auto;
  color: var(--theme-text-muted);
  font-size: 13px;
}

.comment-guest-input {
  width: 100%;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-surface);
  padding: 0 10px;
  color: var(--theme-text);
  font: inherit;
  font-size: 14px;
  outline: none;
}

.comment-guest-input:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent) 12%, transparent);
}

.comment-reply-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  border-radius: 8px;
  background: var(--theme-accent-soft);
  padding: 6px 10px;
  color: var(--theme-text-muted);
  font-size: 13px;
}

.comment-reply-text strong {
  color: var(--theme-accent);
}

.comment-reply-cancel {
  border: 0;
  border-radius: 6px;
  background: transparent;
  padding: 4px 8px;
  color: var(--theme-text-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.comment-reply-cancel:hover {
  background: var(--theme-surface);
  color: var(--theme-text-soft);
}

.comment-input {
  display: block;
  width: 100%;
  min-height: 96px;
  margin-top: 10px;
  resize: vertical;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-surface);
  padding: 11px 12px;
  color: var(--theme-text);
  font: inherit;
  font-size: 15px;
  line-height: 1.65;
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.comment-input::placeholder {
  color: var(--theme-text-faint);
}

.comment-input:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent) 12%, transparent);
}

.comment-composer-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 9px;
}

.comment-counter {
  color: var(--theme-text-faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.comment-counter.is-over {
  color: var(--theme-danger);
}

.comment-hint {
  flex: 1 1 auto;
  color: var(--theme-text-faint);
  font-size: 12px;
}

.comment-submit {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme-accent);
  border-radius: 8px;
  background: var(--theme-accent);
  padding: 0 16px;
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.16s ease, opacity 0.16s ease;
}

.comment-submit:hover:not(:disabled) {
  background: var(--theme-accent-hover);
}

.comment-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-submit :deep(svg) {
  width: 15px;
  height: 15px;
}

.comment-feedback {
  margin: 9px 0 0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.5;
}

.comment-feedback.is-network,
.comment-feedback.is-field {
  background: var(--theme-danger-soft);
  color: var(--theme-danger);
}

.comment-feedback.is-rate {
  background: var(--theme-warning-soft);
  color: var(--theme-warning);
}

.comment-feedback.is-pending {
  background: var(--theme-warning-soft);
  color: var(--theme-warning);
}

.comment-feedback.is-success {
  background: var(--theme-success-soft);
  color: var(--theme-success);
}

@media (max-width: 640px) {
  .comment-input {
    font-size: 16px;
  }

  .comment-hint {
    display: none;
  }

  .comment-submit {
    margin-inline-start: auto;
    min-height: 40px;
  }

  .comment-identity-option {
    min-height: 40px;
  }
}
</style>
