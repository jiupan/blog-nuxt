<template>
  <span class="account-avatar" :style="{ '--avatar-hue': hue, '--avatar-size': `${size}px` }" aria-hidden="true">
    <img v-if="src && failedSource !== src" :src="src" alt="" :width="size" :height="size" decoding="async" @error="failedSource = src">
    <Icon v-else :name="fallbackIcon" />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  src?: string | null
  seed?: string | number
  size?: number
  fallbackIcon?: string
}>(), { seed: '', size: 36, fallbackIcon: 'i-lucide-user-round' })
const failedSource = ref<string | null | undefined>()
const hues = [205, 248, 159, 21, 323, 47]
const hue = computed(() => {
  const seed = String(props.seed)
  let hash = 0
  for (const char of seed) hash = (Math.imul(31, hash) + char.codePointAt(0)!) >>> 0
  return hues[hash % hues.length]
})
</script>

<style scoped>
.account-avatar {
  display: inline-grid;
  width: var(--avatar-size);
  height: var(--avatar-size);
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: color-mix(in srgb, hsl(var(--avatar-hue) 62% 55%) 16%, var(--theme-surface, white));
  color: color-mix(in srgb, hsl(var(--avatar-hue) 65% 46%) 66%, var(--theme-text, #25242b));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 14%, transparent);
  vertical-align: middle;
}
.account-avatar img { width: 100%; height: 100%; object-fit: cover; }
.account-avatar .iconify { width: 53%; height: 53%; }
</style>
