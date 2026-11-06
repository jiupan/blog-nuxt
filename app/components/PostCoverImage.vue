<template>
  <img
    ref="image"
    class="post-cover-image"
    :class="{ 'is-pending': pending }"
    :src="src"
    :alt="alt"
    loading="lazy"
    decoding="async"
    fetchpriority="low"
    @load="loaded"
    @error="failed"
  >
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ src: string, alt: string }>()
const emit = defineEmits<{ load: [], error: [] }>()
const image = ref<HTMLImageElement | null>(null)
// SSR 保留图片，挂载后让屏幕外的封面等到进入视口再显现。
const pending = ref(false)
let ready = false
let inView = false
let observer: IntersectionObserver | undefined

function stopObserving() {
  observer?.disconnect()
  observer = undefined
}

function reveal() {
  if (!pending.value || !ready || !inView) return
  pending.value = false
  stopObserving()
  emit('load')
}

function loaded() {
  ready = true
  reveal()
}

function failed() {
  pending.value = false
  stopObserving()
  emit('error')
}

function syncImage() {
  const element = image.value
  if (!element) return
  stopObserving()
  pending.value = true
  ready = false
  inView = typeof IntersectionObserver !== 'function'
  if (!inView) {
    observer = new IntersectionObserver((entries, currentObserver) => {
      if (observer !== currentObserver) return
      inView = entries.at(-1)?.isIntersecting ?? false
      reveal()
    })
    observer.observe(element)
  }
  if (element.complete) {
    if (element.naturalWidth > 0) loaded()
    else failed()
  }
}

onMounted(syncImage)
watch(() => props.src, syncImage, { flush: 'post' })
onBeforeUnmount(stopObserving)
</script>

<style scoped>
.post-cover-image {
  --post-cover-fade: opacity 1s cubic-bezier(.4, 0, .25, 1);
  opacity: 1;
  transition: var(--post-cover-fade);
}
.post-cover-image.is-pending { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .post-cover-image { transition: none !important; }
}
</style>
