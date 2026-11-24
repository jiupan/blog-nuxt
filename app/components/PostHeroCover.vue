<template>
  <div
    ref="coverRoot"
    class="post-hero-cover"
    :style="pointerStyle"
    @pointermove="moveCover"
    @pointerleave="resetCover"
    @pointercancel="resetCover"
  >
    <div class="post-cover-card" :style="{ background }">
      <img v-if="src && !failed" :src="src" :alt="title" decoding="async" fetchpriority="high" draggable="false" @error="failed = true">
      <div v-else class="cover-fallback">
        <span>{{ fallback }}</span>
        <strong>{{ label }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  src?: string | null
  title: string
  fallback: string
  label: string
  background?: string
}>()
const coverRoot = ref<HTMLElement | null>(null)
const pointerStyle = ref<Record<string, string>>({})
const failed = ref(false)
let pointerFrame: number | undefined

watch(() => props.src, () => { failed.value = false; resetCover() })

function moveCover(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return
  const rect = coverRoot.value?.getBoundingClientRect()
  if (!rect) return
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  if (pointerFrame !== undefined) cancelAnimationFrame(pointerFrame)
  pointerFrame = requestAnimationFrame(() => {
    pointerStyle.value = {
      '--cover-rotate-x': `${(0.5 - y) * 10}deg`,
      '--cover-rotate-y': `${(x - 0.5) * 12}deg`,
      '--cover-image-x': `${(x - 0.5) * 8}px`,
      '--cover-image-y': `${(y - 0.5) * 8}px`,
      '--cover-light-x': `${x * 100}%`,
      '--cover-light-y': `${y * 100}%`
    }
    pointerFrame = undefined
  })
}

function resetCover() {
  if (pointerFrame !== undefined) cancelAnimationFrame(pointerFrame)
  pointerFrame = undefined
  pointerStyle.value = {}
}

onBeforeUnmount(resetCover)
</script>
