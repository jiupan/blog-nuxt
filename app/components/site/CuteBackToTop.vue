<template>
  <button
    class="cute-back-to-top"
    :class="{ 'is-visible': visible, 'is-launching': launching, 'is-resetting': resetting }"
    type="button"
    aria-label="返回顶部"
    title="返回顶部"
    @click="launch"
  >
    <span class="cat-container" aria-hidden="true">
      <span class="cute-tooltip">嗖~</span>
      <svg class="cat-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 25,35 L 12,12 L 38,22 Q 50,15 62,22 L 88,12 L 75,35 A 35,35 0 1,1 25,35 Z"
          fill="#ffffff"
          stroke="#5c4e4e"
          stroke-width="4.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <polygon points="19,17 32,24 25,31" fill="#ff9ebb" />
        <polygon points="81,17 68,24 75,31" fill="#ff9ebb" />
        <ellipse class="cat-blush" cx="25" cy="62" rx="8" ry="5" fill="#ffb3c6" />
        <ellipse class="cat-blush" cx="75" cy="62" rx="8" ry="5" fill="#ffb3c6" />
        <g class="cat-eye-normal">
          <circle cx="34" cy="55" r="4.5" fill="#5c4e4e" />
          <circle cx="66" cy="55" r="4.5" fill="#5c4e4e" />
        </g>
        <g class="cat-eye-happy">
          <path d="M 28 57 Q 34 49 40 57" fill="none" stroke="#5c4e4e" stroke-width="4" stroke-linecap="round" />
          <path d="M 60 57 Q 66 49 72 57" fill="none" stroke="#5c4e4e" stroke-width="4" stroke-linecap="round" />
        </g>
        <path
          d="M 45 61 Q 50 67 50 61 Q 50 67 55 61"
          fill="none"
          stroke="#5c4e4e"
          stroke-width="3.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <ellipse cx="33" cy="85" rx="7" ry="5" fill="#ffffff" stroke="#5c4e4e" stroke-width="3.5" />
        <ellipse cx="67" cy="85" rx="7" ry="5" fill="#ffffff" stroke="#5c4e4e" stroke-width="3.5" />
      </svg>
    </span>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  scrollTop: []
}>()

const visible = ref(false)
const launching = ref(false)
const resetting = ref(false)

function syncVisible() {
  if (launching.value || resetting.value) return
  visible.value = window.scrollY > 300
}

function launch() {
  if (launching.value) return
  launching.value = true
  visible.value = true

  window.setTimeout(() => {
    emit('scrollTop')
  }, 200)

  window.setTimeout(() => {
    visible.value = false
    resetting.value = true
    launching.value = false
    waitForTopThenReset()
  }, 880)
}

function waitForTopThenReset(start = performance.now()) {
  const done = window.scrollY <= 20 || performance.now() - start > 1200

  if (done) {
    window.setTimeout(() => {
      resetting.value = false
      syncVisible()
    }, 120)
    return
  }

  window.requestAnimationFrame(() => waitForTopThenReset(start))
}

onMounted(() => {
  syncVisible()
  window.addEventListener('scroll', syncVisible, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncVisible)
})
</script>

<style scoped>
.cute-back-to-top {
  position: fixed;
  right: 40px;
  bottom: 40px;
  z-index: 80;
  width: 70px;
  height: 70px;
  border: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  padding: 0;
  transform: translateY(40px);
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), visibility 0.5s ease;
  visibility: hidden;
  -webkit-tap-highlight-color: transparent;
}

.cute-back-to-top.is-visible {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}

.cute-back-to-top.is-resetting {
  opacity: 0 !important;
  transform: translateY(40px) !important;
  transition: none !important;
  visibility: hidden !important;
}

.cute-back-to-top.is-resetting .cat-container {
  animation: none !important;
}

.cat-container {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  animation: cat-floating 3s ease-in-out infinite;
  filter: drop-shadow(0 12px 16px rgb(255 158 187 / 35%));
}

.cute-tooltip {
  position: absolute;
  top: -45px;
  left: 50%;
  padding: 6px 14px;
  border-radius: 20px;
  background: #ff9ebb;
  color: white;
  font-size: 14px;
  font-weight: 800;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(10px);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  white-space: nowrap;
}

.cute-tooltip::after {
  position: absolute;
  bottom: -6px;
  left: 50%;
  border-width: 6px 6px 0;
  border-style: solid;
  border-color: #ff9ebb transparent transparent;
  content: "";
  transform: translateX(-50%);
}

.cat-svg {
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.cute-back-to-top:hover .cat-container,
.cute-back-to-top:focus-visible .cat-container {
  animation-play-state: paused;
}

.cute-back-to-top:hover .cat-svg,
.cute-back-to-top:focus-visible .cat-svg {
  transform: scale(1.05) translateY(-5px);
}

.cute-back-to-top:hover .cute-tooltip,
.cute-back-to-top:focus-visible .cute-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.cat-eye-normal,
.cat-eye-happy,
.cat-blush {
  transition: opacity 0.2s ease;
}

.cat-eye-happy,
.cat-blush {
  opacity: 0;
}

.cute-back-to-top:hover .cat-eye-normal,
.cute-back-to-top:focus-visible .cat-eye-normal {
  opacity: 0;
}

.cute-back-to-top:hover .cat-eye-happy,
.cute-back-to-top:focus-visible .cat-eye-happy,
.cute-back-to-top:hover .cat-blush,
.cute-back-to-top:focus-visible .cat-blush {
  opacity: 1;
}

.cute-back-to-top.is-launching .cat-container {
  animation: jelly-launch 0.9s cubic-bezier(0.5, 0, 0.2, 1) forwards;
}

.cute-back-to-top.is-launching .cute-tooltip {
  display: none;
}

.cute-back-to-top:focus-visible {
  outline: 3px solid rgb(255 158 187 / 45%);
  outline-offset: 4px;
}

@keyframes cat-floating {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes jelly-launch {
  0% {
    transform: scale(1, 1) translateY(0);
  }

  20% {
    transform: scale(1.3, 0.7) translateY(15px);
  }

  100% {
    transform: scale(0.6, 1.4) translateY(-120vh);
  }
}

@media (max-width: 768px) {
  .cute-back-to-top {
    right: 22px;
    bottom: 22px;
    width: 55px;
    height: 55px;
  }

  .cute-tooltip {
    top: -38px;
    padding: 4px 10px;
    font-size: 12px;
  }
}
</style>
