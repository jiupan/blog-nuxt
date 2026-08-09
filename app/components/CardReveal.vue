<template>
  <div
    ref="rootEl"
    class="card-reveal"
    :class="[`is-${variant}`, { 'is-revealed': revealed }]"
    :aria-busy="!revealed"
    @focusin="reveal"
  >
    <div v-if="placeholderVisible" class="card-placeholder" aria-hidden="true">
      <PostCardSkeleton :variant="variant" :count="1" />
    </div>
    <div class="card-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'archive' | 'grid'
  rootMargin?: string
}>(), {
  variant: 'archive',
  rootMargin: '120px 0px'
})

const rootEl = useTemplateRef<HTMLElement>('rootEl')
const revealed = ref(true)
const placeholderVisible = ref(false)
let observer: IntersectionObserver | undefined
let cleanupTimer: ReturnType<typeof setTimeout> | undefined

function reveal() {
  if (revealed.value && !placeholderVisible.value) return

  revealed.value = true
  observer?.disconnect()
  observer = undefined
  if (cleanupTimer !== undefined) clearTimeout(cleanupTimer)
  cleanupTimer = setTimeout(() => {
    placeholderVisible.value = false
    cleanupTimer = undefined
  }, 220)
}

onMounted(async () => {
  placeholderVisible.value = true
  revealed.value = false
  await nextTick()

  if (!rootEl.value || !('IntersectionObserver' in window)) {
    reveal()
    return
  }

  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) reveal()
  }, {
    rootMargin: props.rootMargin,
    threshold: 0.01
  })

  observer.observe(rootEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (cleanupTimer !== undefined) clearTimeout(cleanupTimer)
})
</script>

<style scoped>
.card-reveal {
  display: grid;
  width: 100%;
  min-width: 0;
}

.card-placeholder,
.card-content {
  display: flex;
  min-width: 0;
  grid-area: 1 / 1;
}

.card-placeholder {
  z-index: 1;
  opacity: 1;
  transition: opacity 200ms ease;
}

.card-content {
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}

.card-content > :deep(*) {
  width: 100%;
}

.card-reveal.is-revealed .card-placeholder {
  opacity: 0;
  pointer-events: none;
}

.card-reveal.is-revealed .card-content {
  opacity: 1;
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .card-placeholder,
  .card-content { transition: none; }
}
</style>
