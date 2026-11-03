<template>
  <button
    class="elegant-back-to-top"
    :class="{ 'is-visible': visible, 'has-progress': progress > 0, 'is-complete': progress === 1 }"
    type="button"
    :aria-label="`返回顶部，页面阅读进度 ${Math.round(progress * 100)}%`"
    title="返回顶部"
    @click="emit('scrollTop')"
  >
    <span class="water-level" :style="{ transform: `translateY(${(1 - progress) * 100}%)` }" aria-hidden="true">
      <svg class="water-wave" viewBox="0 0 200 16" preserveAspectRatio="none">
        <path d="M0 8 Q25 0 50 8 T100 8 T150 8 T200 8 V16 H0 Z" />
      </svg>
    </span>

    <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 4h14M12 20V9m-6 6 6-6 6 6" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  scrollTop: []
}>()

const visible = ref(false)
const progress = ref(0)

let updateFrame = 0
let contentResizeObserver: ResizeObserver | undefined

function syncScrollProgress() {
  updateFrame = 0

  const scrollPosition = window.scrollY
  const scrollableHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight

  visible.value = scrollPosition > 150
  progress.value = scrollableHeight > 0
    ? Math.max(0, Math.min(1, scrollPosition / scrollableHeight))
    : 0
}

function scheduleScrollProgressSync() {
  if (updateFrame) return
  updateFrame = window.requestAnimationFrame(syncScrollProgress)
}

onMounted(() => {
  syncScrollProgress()
  window.addEventListener('scroll', scheduleScrollProgressSync, { passive: true })
  window.addEventListener('resize', scheduleScrollProgressSync, { passive: true })
  contentResizeObserver = new ResizeObserver(scheduleScrollProgressSync)
  contentResizeObserver.observe(document.body)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleScrollProgressSync)
  window.removeEventListener('resize', scheduleScrollProgressSync)
  contentResizeObserver?.disconnect()
  if (updateFrame) window.cancelAnimationFrame(updateFrame)
})
</script>

<style scoped>
.elegant-back-to-top {
  --water-color: color-mix(in srgb, var(--theme-accent) 18%, var(--theme-surface));

  position: fixed;
  right: max(32px, env(safe-area-inset-right));
  bottom: calc(32px + env(safe-area-inset-bottom));
  z-index: 80;
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--theme-border-soft);
  border-radius: 14px;
  background: var(--theme-surface);
  color: var(--theme-text-muted);
  box-shadow: 0 5px 16px -4px rgb(var(--theme-shadow) / 12%);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transform: translateY(8px);
  transition: opacity 180ms ease, visibility 180ms ease, transform 180ms ease, color 180ms ease, box-shadow 180ms ease;
  -webkit-tap-highlight-color: transparent;
}

.elegant-back-to-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
  transform: translateY(0);
}

@media (hover: hover) {
  .elegant-back-to-top.is-visible:hover {
    color: var(--theme-accent);
    box-shadow: 0 8px 20px -5px rgb(var(--theme-shadow) / 16%);
    transform: translateY(-2px);
  }
}

.elegant-back-to-top:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 4px;
  color: var(--theme-accent);
}

.elegant-back-to-top.is-visible:active {
  transform: translateY(0);
}

.water-level {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: transform 160ms linear;
}

.has-progress .water-level {
  opacity: 1;
}

.water-level::after {
  position: absolute;
  inset: 4px 0 -4px;
  background: var(--water-color);
  content: '';
}

.water-wave {
  position: absolute;
  top: -4px;
  left: 0;
  width: 200%;
  height: 8px;
  fill: var(--water-color);
  animation: back-to-top-wave 6s linear infinite;
  animation-play-state: paused;
}

.is-visible.has-progress:not(.is-complete) .water-wave {
  animation-play-state: running;
}

.is-complete .water-level::after {
  top: 0;
}

.arrow-icon {
  position: relative;
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
  pointer-events: none;
}

@keyframes back-to-top-wave {
  to { transform: translateX(-50%); }
}

@media (max-width: 768px) {
  .elegant-back-to-top {
    right: max(18px, env(safe-area-inset-right));
    bottom: calc(18px + env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .elegant-back-to-top,
  .water-level {
    transition: none;
  }

  .elegant-back-to-top .water-wave {
    animation: none;
  }
}
</style>
