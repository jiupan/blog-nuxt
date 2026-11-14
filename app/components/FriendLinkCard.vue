<template>
  <a :href="item.url" target="_blank" rel="noopener noreferrer" class="friend-card" :class="`friend-card-${variant}`" :title="item.title">
    <span v-if="variant === 'cover'" class="friend-cover" :style="{ '--friend-art': artColor }">
      <img v-if="item.cover && brokenCover !== item.cover" :src="item.cover" alt="" loading="lazy" decoding="async" @error="brokenCover = item.cover">
      <span v-else class="friend-cover-initial" aria-hidden="true">{{ initial }}</span>
      <span class="friend-cover-category">{{ bookmarkSectionLabel(item) }}</span>
    </span>
    <span class="friend-card-main">
      <span class="friend-avatar" :style="{ '--friend-art': artColor }" aria-hidden="true">
        <img v-if="item.avatar && brokenAvatar !== item.avatar" :src="item.avatar" alt="" loading="lazy" decoding="async" @error="brokenAvatar = item.avatar">
        <span v-else>{{ initial }}</span>
      </span>
      <span class="friend-card-copy">
        <span class="friend-card-name">
          <strong>{{ item.title }}</strong>
          <span v-if="variant === 'search'" class="friend-card-group">{{ bookmarkSectionLabel(item) }}</span>
        </span>
        <span class="friend-card-description">{{ item.note }}</span>
      </span>
    </span>
  </a>
</template>

<script setup lang="ts">
import { bookmarkSectionLabel } from '~~/types/dto/bookmark'
import type { PublicBookmark } from '~~/types/dto/bookmark'

const { item, variant = 'compact' } = defineProps<{ item: PublicBookmark; variant?: 'cover' | 'compact' | 'search' }>()
const brokenAvatar = ref<string>()
const brokenCover = ref<string>()
const initial = computed(() => ([...item.title.trim()][0] ?? '?').toUpperCase())
const artColor = computed(() => `hsl(${(item.id * 137) % 360} 55% 52%)`)
</script>
