<template>
  <UModal
    v-model:open="open"
    fullscreen
    :transition="false"
    title="图片预览"
    description="点击空白处或按 Esc 关闭；左右方向键切换图片。"
    :content="{ onCloseAutoFocus: restoreFocus }"
    :ui="{
      overlay: 'article-lightbox-overlay',
      content: `article-lightbox${closing ? ' is-closing' : ''}`
    }"
  >
    <template #content>
      <div ref="surface" class="article-lightbox-surface" @click="handleSurfaceClick">
        <header class="article-lightbox-topbar">
          <span class="article-lightbox-count" aria-live="polite" data-lightbox-ui
            ><UIcon name="i-lucide-images" />{{ currentIndex + 1
            }}<span>/ {{ images.length }}</span></span
          >
          <button
            type="button"
            class="article-lightbox-button article-lightbox-close"
            aria-label="关闭图片预览"
            title="关闭（Esc）"
            data-lightbox-ui
            @click="closePreview"
          >
            <UIcon name="i-lucide-x" />
          </button>
        </header>
        <div class="article-lightbox-main">
          <button
            v-if="images.length > 1"
            type="button"
            class="article-lightbox-button article-lightbox-side is-previous"
            aria-label="上一张图片"
            title="上一张（←）"
            data-lightbox-ui
            @click="navigate(-1)"
          >
            <UIcon name="i-lucide-chevron-left" />
          </button>
          <div
            ref="stage"
            class="article-image-stage"
            :class="{ 'is-zoomed': zoom > 1 }"
            :aria-busy="loading"
            @pointerdown="startGesture"
            @pointermove="moveGesture"
            @pointerup="endGesture"
            @pointercancel="cancelGesture"
          >
            <span v-if="loading" class="article-lightbox-status" role="status"
              ><UIcon
                name="i-lucide-loader-circle"
                class="article-lightbox-spinner"
              />正在加载图片</span
            >
            <div v-if="failed" class="article-lightbox-status" role="alert" data-lightbox-ui>
              <UIcon name="i-lucide-image-off" />
              <p>这张图片暂时无法加载</p>
              <a :href="currentImage?.src" target="_blank" rel="noopener noreferrer">打开原图</a>
            </div>
            <img
              v-if="currentImage && !failed"
              :key="`${currentIndex}:${currentImage.src}`"
              :src="currentImage.src"
              :alt="currentImage.alt"
              :style="imageStyle"
              draggable="false"
              @load="imageLoaded"
              @error="imageFailed"
              @click="toggleZoom"
            >
          </div>
          <button
            v-if="images.length > 1"
            type="button"
            class="article-lightbox-button article-lightbox-side is-next"
            aria-label="下一张图片"
            title="下一张（→）"
            data-lightbox-ui
            @click="navigate(1)"
          >
            <UIcon name="i-lucide-chevron-right" />
          </button>
        </div>
        <footer class="article-lightbox-footer">
          <p class="article-image-caption" :title="currentImage?.alt" data-lightbox-ui>
            {{ currentImage?.alt || '文章配图' }}
          </p>
          <div class="article-lightbox-dock-row">
            <button
              v-if="images.length > 1"
              type="button"
              class="article-lightbox-button article-lightbox-mobile-nav"
              aria-label="上一张图片"
              data-lightbox-ui
              @click="navigate(-1)"
            >
              <UIcon name="i-lucide-chevron-left" />
            </button>
            <div class="article-lightbox-dock" aria-label="图片操作" data-lightbox-ui>
              <button
                type="button"
                aria-label="缩小图片"
                title="缩小（−）"
                :disabled="zoom <= 1 || loading || failed"
                @click="changeZoom(-0.5)"
              >
                <UIcon name="i-lucide-minus" />
              </button>
              <span class="article-image-scale" aria-live="polite"
                >{{ Math.round(fitScale * zoom * 100) }}%</span
              >
              <button
                type="button"
                aria-label="放大图片"
                title="放大（+）"
                :disabled="zoom >= 4 || loading || failed"
                @click="changeZoom(0.5)"
              >
                <UIcon name="i-lucide-plus" />
              </button>
              <span class="article-lightbox-divider" aria-hidden="true" />
              <button
                type="button"
                aria-label="适应窗口"
                title="适应窗口（0）"
                :disabled="zoom === 1"
                @click="resetZoom"
              >
                <UIcon name="i-lucide-scan" />
              </button>
              <a
                :href="currentImage?.src"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="打开原图"
                title="打开原图"
                ><UIcon name="i-lucide-arrow-up-right"
              /></a>
            </div>
            <button
              v-if="images.length > 1"
              type="button"
              class="article-lightbox-button article-lightbox-mobile-nav"
              aria-label="下一张图片"
              data-lightbox-ui
              @click="navigate(1)"
            >
              <UIcon name="i-lucide-chevron-right" />
            </button>
          </div>
          <nav
            v-if="images.length > 1"
            ref="thumbnails"
            class="article-lightbox-thumbnails"
            aria-label="选择图片"
            data-lightbox-ui
          >
            <button
              v-for="(image, index) in images"
              :key="`${index}:${image.src}`"
              type="button"
              :aria-label="`查看第 ${index + 1} 张图片`"
              :aria-current="index === currentIndex ? 'true' : undefined"
              :class="{ 'is-active': index === currentIndex }"
              @click="selectImage(index)"
            >
              <UIcon name="i-lucide-image" /><img
                v-if="!failedThumbnails.has(image.src)"
                :src="image.src"
                alt=""
                draggable="false"
                @error="failedThumbnails.add(image.src)"
              >
            </button>
          </nav>
          <p class="article-lightbox-hint" aria-hidden="true">
            <span class="article-lightbox-desktop-hint"
              >滚轮缩放 · {{ zoom > 1 ? '拖动查看' : '点击图片放大'
              }}<span v-if="images.length > 1"> · ← → 切换</span> · 点击空白关闭</span
            ><span class="article-lightbox-touch-hint"
              >{{ images.length > 1 ? '左右轻扫切换 · ' : '' }}点击空白关闭</span
            >
          </p>
        </footer>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type PreviewImage = { src: string; alt: string }
type Gesture = {
  type: 'pan' | 'swipe'
  x: number
  y: number
  left: number
  top: number
  moved: boolean
}
const props = defineProps<{ container: HTMLElement | null; html: string }>()
const modalOpen = ref(false)
const closing = ref(false)
const open = computed({
  get: () => modalOpen.value,
  set: (value: boolean) => {
    if (value) modalOpen.value = true
    else void closePreview()
  }
})
const images = ref<PreviewImage[]>([])
const currentIndex = ref(0)
const currentImage = computed(() => images.value[currentIndex.value])
const surface = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const thumbnails = ref<HTMLElement | null>(null)
const stageSize = reactive({ width: 0, height: 0 })
const naturalSize = reactive({ width: 0, height: 0 })
const failedThumbnails = reactive(new Set<string>())
const zoom = ref(1)
const loading = ref(true)
const failed = ref(false)
let opener: HTMLButtonElement | null = null
let entryRect: DOMRect | null = null
let openedIndex = 0
let direction = 1
let gesture: Gesture | null = null
let ignoreClickUntil = 0
let animationVersion = 0
let zoomUpdate = 0
let photoAnimation: Animation | undefined
const closingAnimations = new Set<Animation>()
const fitScale = computed(() => {
  if (!naturalSize.width || !stageSize.width) return 1
  return Math.min(
    Math.max(1, stageSize.width - 24) / naturalSize.width,
    Math.max(1, stageSize.height - 24) / naturalSize.height,
    1
  )
})
const imageStyle = computed(() => ({
  width: naturalSize.width ? `${naturalSize.width * fitScale.value * zoom.value}px` : undefined,
  visibility: loading.value ? ('hidden' as const) : ('visible' as const)
}))
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

watch(
  [() => props.container, () => props.html],
  ([container], _previous, onCleanup) => {
    modalOpen.value = false
    cancelAnimations()
    images.value = []
    failedThumbnails.clear()
    if (!container) return
    for (const image of container.querySelectorAll<HTMLImageElement>('img')) {
      const existing = image.parentElement?.closest<HTMLButtonElement>(
        'button.article-image-trigger'
      )
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
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>('button.article-image-trigger')
          : null
      if (!target || !container?.contains(target)) return
      opener = target
      entryRect = target.querySelector('img')?.getBoundingClientRect() || null
      openedIndex = Number(target.dataset.imageIndex)
      currentIndex.value = openedIndex
      ignoreClickUntil = 0
      closing.value = false
      resetImage()
      modalOpen.value = true
    }
    container.addEventListener('click', handleClick)
    onCleanup(() => container.removeEventListener('click', handleClick))
  },
  { immediate: true, flush: 'post' }
)
watch(
  stage,
  (element, _previous, onCleanup) => {
    if (!element) return
    const update = () => {
      stageSize.width = element.offsetWidth
      stageSize.height = element.offsetHeight
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    element.addEventListener('wheel', handleWheel, { passive: false })
    onCleanup(() => {
      observer.disconnect()
      element.removeEventListener('wheel', handleWheel)
    })
  },
  { flush: 'post' }
)
watch(modalOpen, (isOpen, _previous, onCleanup) => {
  if (!isOpen) return
  window.addEventListener('keydown', handleKeys)
  onCleanup(() => window.removeEventListener('keydown', handleKeys))
})
onBeforeUnmount(cancelAnimations)
function cancelAnimations() {
  animationVersion++
  photoAnimation?.cancel()
  closingAnimations.forEach((animation) => animation.cancel())
  closingAnimations.clear()
}
function resetImage() {
  zoomUpdate++
  animationVersion++
  photoAnimation?.cancel()
  gesture = null
  zoom.value = 1
  naturalSize.width = 0
  naturalSize.height = 0
  loading.value = true
  failed.value = false
}
function rectTransform(from: DOMRect, to: DOMRect) {
  return `translate(${from.x + from.width / 2 - to.x - to.width / 2}px, ${from.y + from.height / 2 - to.y - to.height / 2}px) scale(${from.width / to.width}, ${from.height / to.height})`
}
async function imageLoaded(event: Event) {
  const image = event.target as HTMLImageElement
  if (image !== stage.value?.querySelector('img') || !modalOpen.value) return
  naturalSize.width = image.naturalWidth
  naturalSize.height = image.naturalHeight
  loading.value = false
  const version = animationVersion
  await nextTick()
  if (version !== animationVersion || !modalOpen.value || closing.value || reducedMotion()) return
  const bounds = image.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  const origin = entryRect
  entryRect = null
  photoAnimation = image.animate(
    [
      {
        transform: origin?.width
          ? rectTransform(origin, bounds)
          : `translateX(${direction * 18}px) scale(.985)`,
        opacity: origin ? 0.45 : 0
      },
      { transform: 'none', opacity: 1 }
    ],
    { duration: origin ? 360 : 200, easing: 'cubic-bezier(.22, 1, .36, 1)' }
  )
}
function imageFailed(event: Event) {
  if (event.target !== stage.value?.querySelector('img') || !modalOpen.value) return
  loading.value = false
  failed.value = true
  entryRect = null
}
function navigate(offset: number) {
  if (images.value.length > 1)
    selectImage((currentIndex.value + offset + images.value.length) % images.value.length, offset)
}
async function selectImage(index: number, travelDirection?: number) {
  if (closing.value || index === currentIndex.value) return
  direction = travelDirection || (index > currentIndex.value ? 1 : -1)
  entryRect = null
  currentIndex.value = index
  resetImage()
  await nextTick()
  const strip = thumbnails.value
  const active = strip?.querySelector<HTMLElement>('[aria-current="true"]')
  if (strip && active)
    strip.scrollTo({
      left: active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2,
      behavior: reducedMotion() ? 'instant' : 'smooth'
    })
}
async function centerImage() {
  const version = ++zoomUpdate
  await nextTick()
  if (version !== zoomUpdate || !stage.value) return
  stage.value.scrollLeft = (stage.value.scrollWidth - stage.value.clientWidth) / 2
  stage.value.scrollTop = (stage.value.scrollHeight - stage.value.clientHeight) / 2
}
async function handleWheel(event: WheelEvent) {
  if (!event.deltaY) return
  event.preventDefault()
  const element = stage.value
  const image = element?.querySelector('img')
  if (!element || !image || loading.value || failed.value || closing.value) return
  photoAnimation?.cancel()
  const bounds = image.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width))
  const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
  // Normalize pixel, line and page deltas without allowing a single large jump.
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1
  const delta = Math.max(-160, Math.min(160, event.deltaY * unit))
  const nextZoom = Math.min(4, Math.max(1, zoom.value * Math.exp(-delta * 0.0018)))
  if (nextZoom === zoom.value) return
  const version = ++zoomUpdate
  zoom.value = nextZoom
  await nextTick()
  if (version !== zoomUpdate || !modalOpen.value || closing.value || stage.value !== element) return
  const updated = image.getBoundingClientRect()
  element.scrollLeft += updated.left + x * updated.width - event.clientX
  element.scrollTop += updated.top + y * updated.height - event.clientY
}
function changeZoom(delta: number) {
  if (loading.value || failed.value || closing.value) return
  photoAnimation?.cancel()
  zoom.value = Math.min(4, Math.max(1, zoom.value + delta))
  void centerImage()
}
function resetZoom() {
  zoom.value = 1
  void centerImage()
}
function toggleZoom() {
  if (performance.now() < ignoreClickUntil || closing.value) return
  photoAnimation?.cancel()
  zoom.value = zoom.value === 1 ? 2 : 1
  void centerImage()
}
function startGesture(event: PointerEvent) {
  if (closing.value || !stage.value || event.button !== 0) return
  const type =
    event.pointerType === 'touch' && zoom.value === 1
      ? 'swipe'
      : event.pointerType === 'mouse' && zoom.value > 1
        ? 'pan'
        : null
  if (!type || !(event.target instanceof HTMLImageElement)) return
  gesture = {
    type,
    x: event.clientX,
    y: event.clientY,
    left: stage.value.scrollLeft,
    top: stage.value.scrollTop,
    moved: false
  }
  if (type === 'pan') {
    event.target.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
}
function moveGesture(event: PointerEvent) {
  if (!gesture || !stage.value) return
  const x = event.clientX - gesture.x
  const y = event.clientY - gesture.y
  if (Math.abs(x) + Math.abs(y) > 5) gesture.moved = true
  if (gesture.type === 'pan') {
    stage.value.scrollLeft = gesture.left - x
    stage.value.scrollTop = gesture.top - y
  }
}
function endGesture(event: PointerEvent) {
  if (!gesture) return
  const finished = gesture
  gesture = null
  if (finished.moved) ignoreClickUntil = performance.now() + 300
  const x = event.clientX - finished.x
  const y = event.clientY - finished.y
  if (finished.type === 'swipe' && Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.3)
    navigate(x < 0 ? 1 : -1)
}
function cancelGesture() {
  gesture = null
  ignoreClickUntil = performance.now() + 300
}
function handleSurfaceClick(event: MouseEvent) {
  if (performance.now() < ignoreClickUntil) return
  if (event.target instanceof Element && !event.target.closest('img, [data-lightbox-ui]'))
    void closePreview()
}
async function closePreview() {
  if (!modalOpen.value || closing.value) return
  closing.value = true
  cancelAnimations()
  if (!reducedMotion()) {
    const image = stage.value?.querySelector('img')
    const destination = opener?.querySelector('img')?.getBoundingClientRect()
    if (image && !loading.value && !failed.value) {
      const bounds = image.getBoundingClientRect()
      const returnToOrigin =
        currentIndex.value === openedIndex &&
        zoom.value === 1 &&
        destination?.width &&
        destination.top < innerHeight &&
        destination.bottom > 0
      closingAnimations.add(
        image.animate(
          [
            { transform: 'none', opacity: 1 },
            {
              transform: returnToOrigin ? rectTransform(destination, bounds) : 'scale(.96)',
              opacity: returnToOrigin ? 0.4 : 0
            }
          ],
          { duration: 230, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' }
        )
      )
    }
    const overlay = document.querySelector<HTMLElement>('.article-lightbox-overlay')
    for (const element of [surface.value, overlay]) {
      if (element)
        closingAnimations.add(
          element.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 230,
            easing: 'ease-in',
            fill: 'forwards'
          })
        )
    }
    await Promise.allSettled([...closingAnimations].map((animation) => animation.finished))
  }
  modalOpen.value = false
  await nextTick()
  cancelAnimations()
  closing.value = false
}
function handleKeys(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || closing.value) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    navigate(event.key === 'ArrowLeft' ? -1 : 1)
  }
  if (['+', '=', '-'].includes(event.key)) {
    event.preventDefault()
    changeZoom(event.key === '-' ? -0.5 : 0.5)
  }
  if (event.key === '0') {
    event.preventDefault()
    resetZoom()
  }
}
function restoreFocus(event: Event) {
  event.preventDefault()
  if (opener?.isConnected) opener.focus({ preventScroll: true })
}
</script>

<style>
.article-lightbox-overlay {
  background: rgb(18 23 36 / 73%);
  -webkit-backdrop-filter: blur(9px);
  backdrop-filter: blur(9px);
  animation: article-veil-in 240ms ease-out both;
}
.article-lightbox {
  border: 0;
  background: transparent;
  box-shadow: none;
  color: #f5f7fc;
  overflow: hidden;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.article-lightbox.is-closing {
  pointer-events: none;
}
html:has(.article-lightbox) {
  overflow-y: hidden !important;
  background: #252c3c;
  scrollbar-color: #697184 #252c3c;
}
.article-lightbox-surface {
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-columns: minmax(0, 1fr);
}
.article-lightbox-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(20px, env(safe-area-inset-top)) 28px 12px;
}
.article-lightbox-count {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  color: #eff2fa;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.article-lightbox-count > span {
  margin-left: -4px;
  color: rgb(230 235 249 / 50%);
}
.article-lightbox-count .iconify {
  margin-right: 4px;
  color: rgb(230 235 249 / 55%);
}
.article-lightbox-button,
.article-lightbox-dock {
  border: 1px solid rgb(255 255 255 / 14%);
  background: rgb(255 255 255 / 9%);
  box-shadow: 0 4px 20px rgb(0 0 0 / 8%);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}
.article-lightbox-button {
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  color: inherit;
  cursor: pointer;
  transition:
    background 160ms,
    transform 160ms,
    border-color 160ms;
}
.article-lightbox-button:hover {
  border-color: rgb(255 255 255 / 30%);
  background: rgb(255 255 255 / 18%);
}
.article-lightbox-button:active {
  transform: scale(0.94);
}
.article-lightbox :is(button, a):focus-visible {
  outline: 2px solid #c5bfff;
  outline-offset: 4px;
}
.article-lightbox :is(button, a) {
  touch-action: manipulation;
}
.article-lightbox .iconify {
  width: 20px;
  height: 20px;
  flex: none;
}
.article-lightbox-main {
  position: relative;
  display: flex;
  min-height: 0;
  min-width: 0;
}
.article-lightbox-side {
  position: absolute;
  top: calc(50% - 24px);
  z-index: 1;
  width: 48px;
  height: 48px;
}
.article-lightbox-side.is-previous {
  left: 24px;
}
.article-lightbox-side.is-next {
  right: 24px;
}
.article-lightbox-side .iconify {
  width: 24px;
  height: 24px;
}
.article-image-stage {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  margin: 0 88px;
  padding: 12px;
  overflow: auto;
  overscroll-behavior: contain;
  touch-action: pan-y pinch-zoom;
  scrollbar-width: thin;
  scrollbar-color: rgb(255 255 255 / 25%) transparent;
}
.article-image-stage img {
  display: block;
  max-width: none;
  height: auto;
  flex: none;
  align-self: flex-start;
  margin: auto;
  border-radius: 8px;
  box-shadow: 0 24px 90px rgb(0 0 0 / 24%);
  cursor: zoom-in;
  transform-origin: center center;
}
.article-image-stage.is-zoomed {
  touch-action: pan-x pan-y pinch-zoom;
}
.article-image-stage.is-zoomed img {
  cursor: grab;
}
.article-image-stage.is-zoomed img:active {
  cursor: grabbing;
}
.article-lightbox-status {
  position: absolute;
  inset: 0;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 14px;
  color: #c0c8d9;
  font-size: 13px;
}
.article-lightbox-status > .iconify {
  width: 28px;
  height: 28px;
  opacity: 0.7;
}
.article-lightbox-status a {
  color: #ded9ff;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.article-lightbox-spinner {
  animation: article-lightbox-spin 900ms linear infinite;
}
.article-lightbox-footer {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 18px 24px max(18px, env(safe-area-inset-bottom));
}
.article-image-caption {
  max-width: min(75vw, 760px);
  margin: 0;
  overflow: hidden;
  color: rgb(241 244 252 / 83%);
  font-size: 13px;
  line-height: 1.5;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.article-lightbox-dock-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.article-lightbox-dock {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 5px 7px;
  border-radius: 28px;
}
.article-lightbox-dock :is(button, a) {
  display: grid;
  width: 38px;
  height: 38px;
  flex: none;
  place-items: center;
  border-radius: 50%;
  color: #f3f5fb;
  cursor: pointer;
  transition: background 160ms;
}
.article-lightbox-dock :is(button, a):hover:not(:disabled) {
  background: rgb(255 255 255 / 12%);
}
.article-lightbox-dock button:disabled {
  opacity: 0.3;
  cursor: default;
}
.article-image-scale {
  min-width: 48px;
  padding: 0 3px;
  color: #e1e6f2;
  font-size: 12px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.article-lightbox-divider {
  width: 1px;
  height: 18px;
  margin: 0 6px;
  background: rgb(255 255 255 / 17%);
}
.article-lightbox-mobile-nav {
  display: none;
}
.article-lightbox-thumbnails {
  position: relative;
  display: flex;
  max-width: min(70vw, 620px);
  gap: 8px;
  padding: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.article-lightbox-thumbnails::-webkit-scrollbar {
  display: none;
}
.article-lightbox-thumbnails button {
  position: relative;
  display: grid;
  width: 48px;
  height: 38px;
  flex: none;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 6px;
  background: rgb(255 255 255 / 8%);
  color: #b8c2d7;
  opacity: 0.48;
  cursor: pointer;
  transition:
    opacity 160ms,
    box-shadow 160ms;
}
.article-lightbox-thumbnails button:hover {
  opacity: 0.8;
}
.article-lightbox-thumbnails button.is-active {
  box-shadow: 0 0 0 2px #eeeaff;
  opacity: 1;
}
.article-lightbox-thumbnails img {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 5px;
  object-fit: cover;
}
.article-lightbox-hint {
  margin: -2px 0 0;
  color: rgb(226 233 249 / 42%);
  font-size: 11px;
  line-height: 1.4;
}
.article-lightbox-touch-hint {
  display: none;
}
@keyframes article-veil-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes article-lightbox-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 640px) {
  .article-lightbox-topbar {
    padding: max(14px, env(safe-area-inset-top)) 16px 8px;
  }
  .article-lightbox-count {
    padding-left: 2px;
  }
  .article-lightbox-side {
    display: none;
  }
  .article-image-stage {
    margin: 0 4px;
  }
  .article-image-stage img {
    border-radius: 5px;
  }
  .article-lightbox-footer {
    gap: 12px;
    padding: 12px 12px max(16px, env(safe-area-inset-bottom));
  }
  .article-image-caption {
    max-width: calc(100vw - 40px);
    font-size: 12px;
  }
  .article-lightbox-dock-row {
    gap: 8px;
  }
  .article-lightbox-dock {
    padding: 4px;
  }
  .article-lightbox-dock :is(button, a) {
    width: 34px;
    height: 36px;
  }
  .article-lightbox-dock .iconify {
    width: 18px;
    height: 18px;
  }
  .article-image-scale {
    min-width: 40px;
  }
  .article-lightbox-divider {
    margin: 0 4px;
  }
  .article-lightbox-mobile-nav {
    display: grid;
    width: 40px;
    height: 40px;
  }
  .article-lightbox-thumbnails {
    max-width: calc(100vw - 40px);
  }
  .article-lightbox-thumbnails button {
    width: 42px;
    height: 34px;
  }
  .article-lightbox-desktop-hint {
    display: none;
  }
  .article-lightbox-touch-hint {
    display: inline;
  }
}
@media (prefers-reduced-motion: reduce) {
  .article-lightbox-overlay,
  .article-lightbox-spinner {
    animation: none;
  }
  .article-lightbox *,
  .article-lightbox *::before,
  .article-lightbox *::after {
    transition: none !important;
  }
}
</style>
