<template>
  <span class="comment-avatar" :class="[`is-${kind.toLowerCase()}`, { 'is-official': official }]" aria-hidden="true">
    {{ initial }}
  </span>
</template>

<script setup lang="ts">
import type { CommentAuthorKindPayload } from '~~/types/dto/comment'
import { commentInitial } from '~/utils/comment'

const props = defineProps<{
  name: string
  kind: CommentAuthorKindPayload
  official?: boolean
}>()

/**
 * 头像由展示名首字生成。
 *
 * 评论不引第三方头像服务 —— 外链头像会泄露读者访问记录，也让没有头像的读者看着像被区别对待。
 */
const initial = computed(() => commentInitial(props.name))
</script>

<style scoped>
.comment-avatar {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  place-items: center;
  border-radius: 50%;
  background: var(--theme-accent-soft);
  color: var(--theme-accent);
  font-size: 15px;
  font-weight: 800;
  line-height: 1;
}

.comment-avatar.is-account {
  background: color-mix(in srgb, var(--theme-accent) 18%, var(--theme-surface));
}

.comment-avatar.is-legacy {
  background: var(--theme-surface-hover);
  color: var(--theme-text-muted);
}

.comment-avatar.is-official {
  box-shadow: 0 0 0 2px var(--theme-accent);
}
</style>
