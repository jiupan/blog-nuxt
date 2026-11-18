<template>
  <span ref="glow" class="pointer-glow" aria-hidden="true" />
</template>

<script setup lang="ts">
const glow = ref<HTMLElement>()
let cleanup: (() => void) | undefined

onMounted(() => {
  const layer = glow.value
  const card = layer?.parentElement
  if (!layer || !card) return

  const enabled = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  const listeners = new AbortController()
  let frame: number | undefined
  let x = 0
  let y = 0

  function clear() {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    layer?.classList.remove('is-active')
  }

  card.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' || !enabled.matches) return
    x = event.clientX
    y = event.clientY
    if (frame !== undefined) return
    frame = requestAnimationFrame(() => {
      frame = undefined
      const rect = card.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      layer.style.setProperty('--glow-x', `${(x - rect.left) / rect.width * 100}%`)
      layer.style.setProperty('--glow-y', `${(y - rect.top) / rect.height * 100}%`)
      layer.classList.add('is-active')
    })
  }, { signal: listeners.signal, passive: true })
  card.addEventListener('pointerleave', clear, { signal: listeners.signal })
  card.addEventListener('pointercancel', clear, { signal: listeners.signal })
  enabled.addEventListener('change', clear, { signal: listeners.signal })
  cleanup = () => {
    listeners.abort()
    clear()
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<style scoped>
.pointer-glow {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
}

.pointer-glow::before,
.pointer-glow::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  content: "";
  opacity: 0;
  transition: opacity 180ms ease-out;
}

.pointer-glow::before {
  padding: 2px;
  background: radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), white, rgb(255 255 255 / 70%) 12%, rgb(255 255 255 / 10%) 29%, transparent 39%);
  mask: linear-gradient(white 0 0) content-box exclude, linear-gradient(white 0 0);
}

.pointer-glow::after {
  background: radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), rgb(255 255 255 / 22%), rgb(255 255 255 / 8%) 14%, transparent 35%);
  mix-blend-mode: screen;
}

.pointer-glow.is-active::before,
.pointer-glow.is-active::after { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .pointer-glow { display: none; }
}
</style>
