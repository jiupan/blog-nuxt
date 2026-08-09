<template>
  <button
    class="elegant-back-to-top"
    :class="{ 'is-visible': visible }"
    type="button"
    aria-label="返回顶部"
    title="返回顶部"
    @click="emit('scrollTop')"
  >
    <svg class="progress-ring" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="back-to-top-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop class="progress-gradient-start" offset="0%" />
          <stop class="progress-gradient-end" offset="100%" />
        </linearGradient>
      </defs>
      <circle class="progress-ring-track" cx="32" cy="32" r="28" />
      <circle
        class="progress-ring-circle"
        cx="32"
        cy="32"
        r="28"
        :style="{
          strokeDasharray: `${circumference} ${circumference}`,
          strokeDashoffset: dashOffset
        }"
      />
    </svg>

    <svg class="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  scrollTop: []
}>()

const radius = 28
const circumference = 2 * Math.PI * radius
const visible = ref(false)
const progress = ref(0)
const dashOffset = computed(() => circumference * (1 - progress.value))

let updateFrame = 0

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
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', scheduleScrollProgressSync)
  window.removeEventListener('resize', scheduleScrollProgressSync)
  if (updateFrame) window.cancelAnimationFrame(updateFrame)
})
</script>

<style scoped>
.elegant-back-to-top {
  --back-to-top-bg: rgb(255 255 255 / 78%);
  --back-to-top-border: rgb(99 102 241 / 18%);
  --back-to-top-track: rgb(79 70 229 / 12%);
  --back-to-top-arrow: #4f46e5;
  --back-to-top-arrow-hover: #7c3aed;
  --back-to-top-gradient-start: #0891b2;
  --back-to-top-gradient-end: #7c3aed;

  position: fixed;
  right: 40px;
  bottom: 40px;
  z-index: 80;
  display: flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--back-to-top-border);
  border-radius: 50%;
  backdrop-filter: blur(12px);
  background: var(--back-to-top-bg);
  box-shadow:
    0 8px 24px rgb(71 85 105 / 14%),
    inset 0 1px 0 rgb(255 255 255 / 82%);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px) scale(0.9);
  transition:
    opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    visibility 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  visibility: hidden;
  -webkit-backdrop-filter: blur(12px);
  -webkit-tap-highlight-color: transparent;
}

.elegant-back-to-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
  visibility: visible;
}

.elegant-back-to-top.is-visible:hover,
.elegant-back-to-top.is-visible:focus-visible {
  border-color: rgb(124 58 237 / 30%);
  box-shadow:
    0 12px 26px -8px rgb(124 58 237 / 28%),
    0 8px 18px -10px rgb(8 145 178 / 24%),
    inset 0 1px 0 rgb(255 255 255 / 90%);
  transform: translateY(-5px) scale(1.05);
}

.elegant-back-to-top:focus-visible {
  outline: 3px solid rgb(139 92 246 / 32%);
  outline-offset: 4px;
}

.progress-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.progress-ring-track,
.progress-ring-circle {
  fill: none;
}

.progress-ring-track {
  stroke: var(--back-to-top-track);
  stroke-width: 2;
}

.progress-gradient-start {
  stop-color: var(--back-to-top-gradient-start);
}

.progress-gradient-end {
  stop-color: var(--back-to-top-gradient-end);
}

.progress-ring-circle {
  stroke: url("#back-to-top-progress-gradient");
  stroke-linecap: round;
  stroke-width: 2.5;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 0.15s linear;
}

.arrow-icon {
  position: absolute;
  width: 24px;
  height: 24px;
  overflow: visible;
  stroke: var(--back-to-top-arrow);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
}

.elegant-back-to-top.is-visible:hover .arrow-icon,
.elegant-back-to-top.is-visible:focus-visible .arrow-icon {
  animation: arrow-shoot-up 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  stroke: var(--back-to-top-arrow-hover);
}

:global(.dark .elegant-back-to-top) {
  --back-to-top-bg: rgb(30 41 59 / 40%);
  --back-to-top-border: rgb(255 255 255 / 10%);
  --back-to-top-track: rgb(255 255 255 / 8%);
  --back-to-top-arrow: #fff;
  --back-to-top-arrow-hover: #a78bfa;
  --back-to-top-gradient-start: #2dd4bf;
  --back-to-top-gradient-end: #8b5cf6;

  box-shadow: none;
}

:global(.dark .elegant-back-to-top.is-visible:hover),
:global(.dark .elegant-back-to-top.is-visible:focus-visible) {
  border-color: rgb(139 92 246 / 40%);
  box-shadow:
    0 10px 25px -5px rgb(139 92 246 / 40%),
    0 8px 10px -6px rgb(139 92 246 / 20%);
}

@keyframes arrow-shoot-up {
  0% {
    opacity: 1;
    transform: translateY(0);
  }

  40% {
    opacity: 0;
    transform: translateY(-20px);
  }

  41% {
    opacity: 0;
    transform: translateY(20px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .elegant-back-to-top {
    right: 22px;
    bottom: 22px;
    width: 54px;
    height: 54px;
  }

  .arrow-icon {
    width: 21px;
    height: 21px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .elegant-back-to-top,
  .progress-ring-circle {
    transition-duration: 0.01ms;
  }

  .elegant-back-to-top.is-visible:hover .arrow-icon,
  .elegant-back-to-top.is-visible:focus-visible .arrow-icon {
    animation: none;
  }
}
</style>
