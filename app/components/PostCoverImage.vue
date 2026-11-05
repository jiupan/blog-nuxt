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
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{ src: string, alt: string }>()
const emit = defineEmits<{ load: [], error: [] }>()
const image = ref<HTMLImageElement | null>(null)
// SSR 与无 JS 时保留真实图片；仅在客户端确认尚未加载时显示封面占位。
const pending = ref(false)
function loaded() { pending.value = false; emit('load') }
function failed() { pending.value = false; emit('error') }
function syncImage() {
  if (!image.value) return
  if (image.value.complete) {
    if (image.value.naturalWidth > 0) loaded()
    else failed()
  } else pending.value = true
}
onMounted(syncImage)
watch(() => props.src, async () => {
  pending.value = true
  await nextTick()
  syncImage()
})
</script>

<style scoped>
.post-cover-image { opacity: 1; transition: opacity 400ms ease; }
.post-cover-image.is-pending { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .post-cover-image { transition: none !important; }
}
</style>
