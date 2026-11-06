<template>
  <article :id="`comment-${thread.id}`" class="comment-thread">
    <div class="comment-row is-thread">
      <CommentAvatar :name="thread.authorName" :kind="thread.authorKind" :official="thread.isOfficial" />
      <div class="comment-main">
        <div class="comment-meta">
          <span class="comment-author">{{ thread.authorName }}</span>
          <span v-if="thread.isOfficial" class="comment-official">
            <Icon name="i-lucide-badge-check" aria-hidden="true" />
            官方
          </span>
          <time class="comment-time" :datetime="thread.createdAt">{{ formatTime(thread.createdAt) }}</time>
        </div>

        <CommentBody :body-html="thread.bodyHtml" :deleted="thread.isDeleted" />

        <div class="comment-actions">
          <button ref="replyButtonRef" type="button" class="comment-action" @click="toggleRootReply">
            <Icon name="i-lucide-reply" aria-hidden="true" />
            回复
            <span v-if="thread.replyCount" class="comment-action-count">{{ thread.replyCount }}</span>
          </button>
          <button
            v-if="thread.canDelete"
            type="button"
            class="comment-action is-danger"
            :disabled="deleting"
            @click="removeComment(thread.id)"
          >
            <Icon name="i-lucide-trash-2" aria-hidden="true" />
            删除
          </button>
        </div>

        <p v-if="actionFeedback" class="comment-feedback" :class="`is-${actionFeedback.kind}`" role="status">{{ actionFeedback.message }}</p>
      </div>
    </div>

    <div v-if="visibleReplies.length" class="comment-replies">
      <div v-for="reply in visibleReplies" :key="reply.id" class="comment-row is-reply">
        <CommentAvatar :name="reply.authorName" :kind="reply.authorKind" :official="reply.isOfficial" />
        <div class="comment-main">
          <div class="comment-meta">
            <span class="comment-author">{{ reply.authorName }}</span>
            <span v-if="reply.isOfficial" class="comment-official">
              <Icon name="i-lucide-badge-check" aria-hidden="true" />
              官方
            </span>
            <time class="comment-time" :datetime="reply.createdAt">{{ formatTime(reply.createdAt) }}</time>
          </div>

          <CommentBody
            :body-html="reply.bodyHtml"
            :deleted="reply.isDeleted"
            :reply-to="reply.replyTo"
            show-reply-reference
          />

          <div class="comment-actions">
            <button type="button" class="comment-action" @click="toggleReplyTo(reply)">
              <Icon name="i-lucide-reply" aria-hidden="true" />
              回复
            </button>
            <button
              v-if="reply.canDelete"
              type="button"
              class="comment-action is-danger"
              :disabled="deleting"
              @click="removeComment(reply.id)"
            >
              <Icon name="i-lucide-trash-2" aria-hidden="true" />
              删除
            </button>
          </div>
        </div>
      </div>

      <button v-if="canExpand" type="button" class="comment-expand" :disabled="expanding" @click="expand">
        {{ expanding ? '加载中…' : expandLabel }}
      </button>
      <button v-else-if="expandFailed" type="button" class="comment-expand" @click="expand">重新加载回复</button>
    </div>

    <CommentComposer v-if="isReplying" variant="reply" @cancel="handleCancel" @submitted="handleSubmitted" />
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useCommentContext } from '../../composables/usePostComments'
import type { PublicCommentReply, PublicCommentThread } from '~~/types/dto/comment'
import type { CommentFeedback } from '~/composables/usePostComments'
import { formatCommentTime } from '~/utils/comment'

const props = defineProps<{
  thread: PublicCommentThread
}>()

const context = useCommentContext()
const replyButtonRef = ref<HTMLButtonElement | null>(null)
const deleting = ref(false)
const actionFeedback = ref<CommentFeedback | null>(null)

const expanded = computed(() => context.expandedReplies.value[props.thread.id])
const visibleReplies = computed(() => [
  ...props.thread.replies,
  ...(expanded.value?.items ?? [])
])
const expanding = computed(() => Boolean(expanded.value?.loading))
const expandFailed = computed(() => Boolean(expanded.value?.failed))
/** 展开后还有下一页时，按钮变成「加载更多回复」。 */
const hasMoreReplies = computed(() => Boolean(expanded.value?.nextCursor))
const canExpand = computed(() => expanded.value
  ? hasMoreReplies.value
  : props.thread.replyCount > visibleReplies.value.length)
const expandLabel = computed(() => (hasMoreReplies.value
  ? '加载更多回复'
  : `展开全部 ${props.thread.replyCount} 条回复`))
const isReplying = computed(() => context.replyTarget.value?.threadRootId === props.thread.id)

function formatTime(value: string) {
  return formatCommentTime(value)
}

async function expand() {
  if (expanded.value && !expandFailed.value) {
    await context.loadMoreReplies(props.thread)
    return
  }

  await context.expandReplies(props.thread)
}

function toggleRootReply() {
  if (isReplying.value) {
    context.toggleReply(null)
    return
  }

  context.toggleReply({
    threadRootId: props.thread.id,
    commentId: props.thread.id,
    authorName: props.thread.authorName
  })
}

function toggleReplyTo(reply: PublicCommentReply) {
  if (isReplying.value && context.replyTarget.value?.commentId === reply.id) {
    context.toggleReply(null)
    return
  }

  context.toggleReply({
    threadRootId: props.thread.id,
    commentId: reply.id,
    authorName: reply.authorName
  })
}

async function removeComment(commentId: number) {
  if (deleting.value) return
  deleting.value = true
  actionFeedback.value = null

  const feedback = await context.remove(commentId)
  deleting.value = false

  if (feedback) actionFeedback.value = feedback
}

function handleSubmitted(feedback: CommentFeedback) {
  actionFeedback.value = feedback
  handleCancel()
}

function handleCancel() {
  context.toggleReply(null)
  nextTick(() => replyButtonRef.value?.focus())
}
</script>

<style scoped>
.comment-thread {
  border: 1px solid var(--theme-border-soft);
  border-radius: 10px;
  background: var(--theme-surface-muted);
  padding: 14px 16px;
}

.comment-row {
  display: flex;
  min-width: 0;
  gap: 10px;
}

.comment-main {
  min-width: 0;
  flex: 1;
}

.comment-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-height: 22px;
}

.comment-author {
  color: var(--theme-text);
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 700;
}

.comment-official {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border-radius: 5px;
  background: var(--theme-accent-soft);
  padding: 1px 6px;
  color: var(--theme-accent);
  font-size: 11px;
  font-weight: 700;
}

.comment-official :deep(svg) {
  width: 12px;
  height: 12px;
}

.comment-time {
  color: var(--theme-text-faint);
  font-size: 12px;
}

.comment-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
}

.comment-action {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  padding: 0 8px;
  color: var(--theme-text-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.comment-action:hover:not(:disabled) {
  background: var(--theme-accent-soft);
  color: var(--theme-accent);
}

.comment-action.is-danger:hover:not(:disabled) {
  background: var(--theme-danger-soft);
  color: var(--theme-danger);
}

.comment-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.comment-action :deep(svg) {
  width: 14px;
  height: 14px;
}

.comment-action-count {
  font-variant-numeric: tabular-nums;
}

/* 楼中楼：一条细线加一次浅缩进，不做成树。 */
.comment-replies {
  margin-top: 10px;
  border-inline-start: 1px solid var(--theme-border);
  padding-inline-start: 12px;
}

.comment-row.is-reply {
  padding-block: 8px;
}

.comment-row.is-reply + .comment-row.is-reply {
  border-top: 1px solid var(--theme-border-soft);
}

.comment-expand {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  border: 1px solid var(--theme-border);
  border-radius: 8px;
  background: var(--theme-surface);
  margin-top: 6px;
  padding: 0 12px;
  color: var(--theme-text-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.comment-expand:hover:not(:disabled) {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.comment-expand:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.comment-feedback {
  margin: 8px 0 0;
  border-radius: 8px;
  background: var(--theme-danger-soft);
  padding: 7px 10px;
  color: var(--theme-danger);
  font-size: 13px;
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
  .comment-thread {
    padding: 12px 12px;
  }

  .comment-action {
    min-height: 40px;
  }

  .comment-expand {
    min-height: 40px;
  }
}
</style>
