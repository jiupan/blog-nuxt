<template>
  <div class="summary-field">
    <span>选择文章</span>
    <div ref="selectRef" class="summary-select" :class="{ 'is-open': open }">
      <button
        type="button"
        class="summary-select-button"
        :disabled="disabled"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span>{{ selectedPost?.title || placeholder }}</span>
        <ChevronRightIcon aria-hidden="true" />
      </button>

      <div v-if="open" class="summary-select-menu">
        <button
          v-for="post in posts"
          :key="post.id"
          type="button"
          class="summary-select-option"
          :class="{ 'is-active': selectedId === String(post.id) }"
          @click="$emit('selectPost', post)"
        >
          {{ post.title }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight as ChevronRightIcon } from '@lucide/vue'
import type { SummaryPost } from './lab.types'

defineProps<{
  posts: SummaryPost[]
  selectedPost?: SummaryPost | null
  selectedId: string
  disabled: boolean
  placeholder?: string
}>()

defineEmits<{
  selectPost: [post: SummaryPost]
}>()

const open = defineModel<boolean>('open', { required: true })
const selectRef = defineModel<HTMLElement | null>('selectRef', { required: true })
</script>
