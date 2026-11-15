<template>
  <AccountAvatar
    :src="src"
    :seed="name"
    :size="size"
    :fallback-icon="deleted ? 'i-lucide-message-square-off' : kind === 'LEGACY' ? 'i-lucide-message-circle' : 'i-lucide-user-round'"
  />
</template>

<script setup lang="ts">
import type { CommentAuthorKindPayload } from '~~/types/dto/comment'

defineProps<{
  name: string
  kind: CommentAuthorKindPayload
  src?: string | null
  size?: number
  deleted?: boolean
}>()
</script>
