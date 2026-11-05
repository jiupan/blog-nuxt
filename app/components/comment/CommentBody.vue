<template>
  <div class="comment-body">
    <p v-if="showReplyReference" class="comment-reference">
      <template v-if="replyTo">
        回复 <strong>@{{ replyTo.authorName }}</strong>
      </template>
      <template v-else>
        回复的评论不可见
      </template>
    </p>
    <p v-if="deleted" class="comment-placeholder">该评论已删除</p>
    <!-- 正文 HTML 由服务端渲染并过了白名单，前端不再做二次解释。 -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="comment-html" v-html="bodyHtml" />
  </div>
</template>

<script setup lang="ts">
import type { CommentReplyTarget } from '~~/types/dto/comment'

defineProps<{
  /** 服务端渲染并已过白名单的正文 HTML。 */
  bodyHtml: string
  /** 评论已被删除，只保留占位。 */
  deleted: boolean
  /** 被回复的那条评论。目标隐藏或删除时为 null。 */
  replyTo?: CommentReplyTarget | null
  /** 是否显示回复引用。主评论不显示，楼中楼回复显示。 */
  showReplyReference?: boolean
}>()
</script>

<style scoped>
.comment-body {
  margin-top: 6px;
  color: var(--theme-text);
  overflow-wrap: anywhere;
  font-size: 15px;
  line-height: 1.72;
}

.comment-reference {
  margin: 0 0 4px;
  color: var(--theme-text-muted);
  font-size: 12px;
}

.comment-reference strong {
  color: var(--theme-accent);
  font-weight: 700;
}

.comment-placeholder {
  margin: 0;
  color: var(--theme-text-faint);
  font-size: 14px;
  font-style: italic;
}

.comment-html :deep(p) {
  margin: 0 0 8px;
}

.comment-html :deep(p:last-child) {
  margin-bottom: 0;
}

.comment-html :deep(ul),
.comment-html :deep(ol) {
  margin: 6px 0;
  padding-inline-start: 22px;
}

.comment-html :deep(li) {
  margin: 2px 0;
}

.comment-html :deep(blockquote) {
  margin: 8px 0;
  border-inline-start: 3px solid var(--theme-border);
  padding-inline-start: 12px;
  color: var(--theme-text-muted);
}

.comment-html :deep(code) {
  border-radius: 5px;
  background: var(--theme-surface-hover);
  padding: 1px 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
}

.comment-html :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--theme-code);
  padding: 12px 14px;
  color: var(--theme-code-text);
  font-size: 13px;
  line-height: 1.6;
}

.comment-html :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: inherit;
}

.comment-html :deep(a) {
  color: var(--theme-accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.comment-html :deep(hr) {
  margin: 12px 0;
  border: 0;
  border-top: 1px solid var(--theme-border-soft);
}

.comment-html :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.comment-html :deep(th),
.comment-html :deep(td) {
  border: 1px solid var(--theme-border-soft);
  padding: 6px 10px;
  text-align: start;
}

.comment-html :deep(th) {
  background: var(--theme-surface-muted);
  font-weight: 700;
}

.comment-html :deep(.md-table-scroll) {
  max-width: 100%;
  overflow-x: auto;
}
</style>
