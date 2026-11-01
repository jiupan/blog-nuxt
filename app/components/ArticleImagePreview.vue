<template>
  <UModal
    v-model:open="open"
    fullscreen
    title="图片预览"
    description="放大后可滚动查看细节，按 Esc 关闭。"
    :ui="{
      content: 'article-image-modal',
      header: 'article-image-modal-header',
      body: 'article-image-modal-body',
      title: 'text-white',
      description: 'text-slate-400',
      close: 'text-slate-300 hover:bg-white/10'
    }"
    @after:leave="restoreFocus"
  >
    <template #close>
      <button type="button" class="article-image-close" aria-label="关闭图片预览">
        <UIcon name="i-lucide-x" />
      </button>
    </template>
    <template #body>
      <div class="article-image-viewer">
        <div class="article-image-toolbar" aria-label="图片操作">
          <div class="article-image-pagination">
            <button v-if="images.length > 1" type="button" aria-label="上一张图片" @click="navigate(-1)">
              <UIcon name="i-lucide-chevron-left" />
            </button>
            <span aria-live="polite">{{ currentIndex + 1 }} / {{ images.length }}</span>
            <button v-if="images.length > 1" type="button" aria-label="下一张图片" @click="navigate(1)">
              <UIcon name="i-lucide-chevron-right" />
            </button>
          </div>
          <div class="article-image-zoom-controls">
            <button type="button" aria-label="缩小图片" :disabled="zoom <= 1 || loading || failed" @click="changeZoom(-0.5)">
              <UIcon name="i-lucide-zoom-out" />
            </button>
            <span class="article-image-scale" aria-live="polite">{{ Math.round(fitScale * zoom * 100) }}%</span>
            <button type="button" aria-label="放大图片" :disabled="zoom >= 4 || loading || failed" @click="changeZoom(0.5)">
              <UIcon name="i-lucide-zoom-in" />
            </button>
            <button type="button" :disabled="zoom === 1" @click="resetZoom">适应窗口</button>
          </div>
        </div>
        <div
          ref="stage"
          class="article-image-stage"
          :class="{ 'is-zoomed': zoom > 1 }"
          :aria-busy="loading"
          @pointerdown="startPan"
          @pointermove="pan"
          @pointerup="endPan"
          @pointercancel="endPan"
        >
          <span v-if="loading" class="article-image-status" role="status">正在加载图片…</span>
          <div v-if="failed" class="article-image-status" role="alert">
            <p>图片加载失败</p>
            <a :href="currentImage?.src" target="_blank" rel="noopener noreferrer">打开原图</a>
          </div>
          <img
            v-if="currentImage && !failed"
            :key="currentImage.src"
            :src="currentImage.src"
            :alt="currentImage.alt"
            :style="imageStyle"
            draggable="false"
            @load="imageLoaded"
            @error="imageFailed"
            @click="toggleZoom"
          >
        </div>
        <p class="article-image-caption">{{ currentImage?.alt || '文章配图' }}</p>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type PreviewImage = { src: string; alt: string }
const props = defineProps<{ container: HTMLElement | null; html: string }>()
const open = ref(false)
const images = ref<PreviewImage[]>([])
const currentIndex = ref(0)
const currentImage = computed(() => images.value[currentIndex.value])
const stage = ref<HTMLElement | null>(null)
const stageSize = reactive({ width: 0, height: 0 })
const naturalSize = reactive({ width: 0, height: 0 })
const zoom = ref(1)
const loading = ref(true)
const failed = ref(false)
let opener: HTMLButtonElement | null = null
let panStart: { x: number; y: number; left: number; top: number } | null = null
let wasDragged = false

const fitScale = computed(() => {
  if (!naturalSize.width || !stageSize.width) return 1
  return Math.min(
    Math.max(1, stageSize.width - 32) / naturalSize.width,
    Math.max(1, stageSize.height - 32) / naturalSize.height,
    1
  )
})
const imageStyle = computed(() => ({
  width: naturalSize.width ? `${naturalSize.width * fitScale.value * zoom.value}px` : undefined,
  visibility: loading.value ? 'hidden' as const : 'visible' as const
}))

watch([() => props.container, () => props.html], ([container], _previous, onCleanup) => {
  open.value = false
  images.value = []
  if (!container) return

  for (const image of container.querySelectorAll<HTMLImageElement>('img')) {
    const existing = image.parentElement?.closest<HTMLButtonElement>('button.article-image-trigger')
    if (!image.getAttribute('src') || (!existing && image.closest('a, button'))) continue
    const index = images.value.length
    images.value.push({ src: image.currentSrc || image.src, alt: image.alt })
    const button = existing || document.createElement('button')
    button.type = 'button'
    button.className = 'article-image-trigger'
    button.dataset.imageIndex = String(index)
    button.setAttribute('aria-label', `放大查看图片${image.alt ? `：${image.alt}` : ''}`)
    button.setAttribute('aria-haspopup', 'dialog')
    button.title = '点击放大图片'
    if (!existing) {
      image.before(button)
      button.append(image)
    }
  }

  function handleClick(event: MouseEvent) {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLButtonElement>('button.article-image-trigger')
      : null
    if (!target || !container?.contains(target)) return
    opener = target
    currentIndex.value = Number(target.dataset.imageIndex)
    resetImage()
    open.value = true
  }
  container.addEventListener('click', handleClick)
  onCleanup(() => container.removeEventListener('click', handleClick))
}, { immediate: true, flush: 'post' })

watch(stage, (element, _previous, onCleanup) => {
  if (!element) return
  const update = () => {
    stageSize.width = element.clientWidth
    stageSize.height = element.clientHeight
  }
  update()
  const observer = new ResizeObserver(update)
  observer.observe(element)
  onCleanup(() => observer.disconnect())
}, { flush: 'post' })

watch(open, (isOpen, _previous, onCleanup) => {
  if (!isOpen) return
  window.addEventListener('keydown', handleKeys)
  onCleanup(() => window.removeEventListener('keydown', handleKeys))
})

function resetImage() {
  panStart = null
  wasDragged = false
  zoom.value = 1
  naturalSize.width = 0
  naturalSize.height = 0
  loading.value = true
  failed.value = false
}
function imageLoaded(event: Event) {
  const image = event.target as HTMLImageElement
  naturalSize.width = image.naturalWidth
  naturalSize.height = image.naturalHeight
  loading.value = false
}
function imageFailed() {
  loading.value = false
  failed.value = true
}
function navigate(direction: number) {
  if (images.value.length < 2) return
  currentIndex.value = (currentIndex.value + direction + images.value.length) % images.value.length
  resetImage()
}
async function centerImage() {
  await nextTick()
  if (!stage.value) return
  stage.value.scrollLeft = (stage.value.scrollWidth - stage.value.clientWidth) / 2
  stage.value.scrollTop = (stage.value.scrollHeight - stage.value.clientHeight) / 2
}
function changeZoom(delta: number) {
  zoom.value = Math.min(4, Math.max(1, zoom.value + delta))
  void centerImage()
}
function resetZoom() {
  zoom.value = 1
  void centerImage()
}
function toggleZoom() {
  if (wasDragged) {
    wasDragged = false
    return
  }
  zoom.value = zoom.value === 1 ? 2 : 1
  void centerImage()
}
function startPan(event: PointerEvent) {
  if (zoom.value <= 1 || event.pointerType !== 'mouse' || event.button !== 0 || !stage.value) return
  if (!(event.target instanceof HTMLImageElement)) return
  wasDragged = false
  panStart = { x: event.clientX, y: event.clientY, left: stage.value.scrollLeft, top: stage.value.scrollTop }
  event.target.setPointerCapture(event.pointerId)
  event.preventDefault()
}
function pan(event: PointerEvent) {
  if (!panStart || !stage.value) return
  const x = event.clientX - panStart.x
  const y = event.clientY - panStart.y
  if (Math.abs(x) + Math.abs(y) > 5) wasDragged = true
  stage.value.scrollLeft = panStart.left - x
  stage.value.scrollTop = panStart.top - y
}
function endPan() {
  panStart = null
}
function handleKeys(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    navigate(event.key === 'ArrowLeft' ? -1 : 1)
  }
}
function restoreFocus() {
  if (opener?.isConnected) opener.focus({ preventScroll: true })
}
</script>

<style>
.article-image-modal {
  background: #11151e;
  color: #edf1f7;
}
.article-image-modal-header {
  border-color: rgb(255 255 255 / 10%);
}
.article-image-modal-body {
  display: flex;
  min-height: 0;
  flex: 1;
  padding: 0;
  overflow: hidden;
}
.article-image-viewer {
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}
.article-image-toolbar,
.article-image-pagination,
.article-image-zoom-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.article-image-toolbar {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
  font-size: 13px;
}
.article-image-toolbar button {
  display: inline-flex;
  min-width: 36px;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 7px;
  background: rgb(255 255 255 / 5%);
  color: inherit;
  cursor: pointer;
}
.article-image-close {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  margin-left: auto;
  place-items: center;
  border-radius: 7px;
  color: #d8e0ec;
  cursor: pointer;
}
.article-image-close:hover {
  background: rgb(255 255 255 / 10%);
}
.article-image-close:focus-visible {
  outline: 2px solid #a9b9ff;
}
.article-image-toolbar button:hover:not(:disabled) {
  background: rgb(255 255 255 / 12%);
}
.article-image-toolbar button:focus-visible {
  outline: 2px solid #a9b9ff;
  outline-offset: 2px;
}
.article-image-toolbar button:disabled {
  opacity: .35;
  cursor: default;
}
.article-image-toolbar .iconify {
  width: 18px;
  height: 18px;
}
.article-image-scale {
  min-width: 42px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.article-image-stage {
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1;
  padding: 16px;
  overflow: auto;
  overscroll-behavior: contain;
}
.article-image-stage img {
  display: block;
  max-width: none;
  height: auto;
  flex: none;
  align-self: flex-start;
  margin: auto;
  cursor: zoom-in;
}
.article-image-stage.is-zoomed img {
  cursor: grab;
}
.article-image-stage.is-zoomed img:active {
  cursor: grabbing;
}
.article-image-status {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  color: #b8c3d5;
}
.article-image-status a {
  color: #a9b9ff;
  text-decoration: underline;
}
.article-image-caption {
  max-height: 5em;
  flex: none;
  margin: 0;
  padding: 12px 20px;
  color: #a8b4c8;
  font-size: 13px;
  text-align: center;
  overflow: auto;
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: reduce) {
  .article-image-modal {
    animation: none !important;
  }
}
</style>
