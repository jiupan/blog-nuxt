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

<style scoped>
.post-hero-cover { min-width: 0; aspect-ratio: 16 / 9; cursor: default; }
.post-cover-card { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 16px; box-shadow: 0 8px 24px rgb(0 0 0 / 10%); transform: perspective(900px) rotateX(var(--cover-rotate-x, 0deg)) rotateY(var(--cover-rotate-y, 0deg)) scale(var(--cover-scale, 1)); transition: transform 180ms ease-out, box-shadow 180ms ease-out; }
.post-cover-card::after { position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(circle at var(--cover-light-x, 50%) var(--cover-light-y, 50%), rgb(255 255 255 / 25%), rgb(255 255 255 / 7%) 28%, transparent 65%); opacity: var(--cover-light-opacity, 0); pointer-events: none; content: ''; transition: opacity 180ms ease-out; }
.post-cover-card img { display: block; width: 100%; height: 100%; object-fit: cover; transform: translate(var(--cover-image-x, 0px), var(--cover-image-y, 0px)) scale(1.06); transition: transform 180ms ease-out; }
.cover-fallback { display: grid; width: 100%; height: 100%; align-content: center; justify-items: center; padding: 20px; color: rgb(255 255 255 / 72%); text-align: center; }
.cover-fallback span { max-width: 100%; overflow-wrap: anywhere; font-size: 42px; font-weight: 800; line-height: 1.2; }
.cover-fallback strong { margin-top: 8px; color: white; font-size: 16px; }

@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .post-hero-cover:hover { --cover-scale: 1.035; --cover-light-opacity: 1; }
  .post-hero-cover:hover .post-cover-card { box-shadow: 0 16px 36px rgb(0 0 0 / 18%); }
}

@media (max-width: 640px) {
  .post-hero-cover { width: min(68vw, 280px); }
  .cover-fallback span { font-size: clamp(28px, 9vw, 42px); }
  .cover-fallback strong { font-size: 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .post-cover-card, .post-cover-card img { transform: none; transition: none; }
  .post-cover-card::after { display: none; }
}
</style>
