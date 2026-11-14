<template>
  <section class="friend-section" :aria-labelledby="headingId">
    <div class="friend-section-heading">
      <div>
        <h2 :id="headingId">{{ title }} <span class="friend-count">{{ items.length }}</span></h2>
        <p>{{ description }}</p>
      </div>
      <div class="friend-section-actions">
        <button v-if="items.length > 1" type="button" class="friend-pill friend-sort" :disabled="!interactive" :aria-label="`${title}：切换排序方式，当前${randomOrder ? '随机排序' : '默认排序'}`" @click="toggleSort">
          {{ randomOrder ? '随机排序' : '默认排序' }}
        </button>
        <template v-if="canScrollLeft || canScrollRight">
          <button type="button" class="friend-pill friend-scroll" :aria-label="`${title}：向左滚动`" :disabled="!canScrollLeft" @click="scroll(-1)">
            <Icon name="i-lucide-chevron-left" aria-hidden="true" />
          </button>
          <button type="button" class="friend-pill friend-scroll" :aria-label="`${title}：向右滚动`" :disabled="!canScrollRight" @click="scroll(1)">
            <Icon name="i-lucide-chevron-right" aria-hidden="true" />
          </button>
        </template>
      </div>
    </div>

    <ul
      ref="lane"
      class="friend-lane"
      :style="{ '--friend-rows': rows }"
      :tabindex="canScrollLeft || canScrollRight ? 0 : undefined"
      @scroll.passive="syncScroll"
      @keydown.left.self.prevent="scroll(-1)"
      @keydown.right.self.prevent="scroll(1)"
    >
      <li v-for="item in orderedItems" :key="item.id">
        <FriendLinkCard :item="item" />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { PublicBookmark } from '~~/types/dto/bookmark'

const { items } = defineProps<{
  title: string
  description: string
  items: PublicBookmark[]
}>()

const headingId = useId()
const lane = useTemplateRef<HTMLUListElement>('lane')
const interactive = ref(false)
const randomOrder = ref(false)
const shuffled = ref<PublicBookmark[]>()
const orderedItems = computed(() => randomOrder.value && shuffled.value ? shuffled.value : items)
const rows = computed(() => items.length >= 10 ? 5 : Math.ceil(items.length / 4))
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
let observer: ResizeObserver | undefined

function shuffleItems() {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1))
    const item = result[index]!
    result[index] = result[other]!
    result[other] = item
  }
  shuffled.value = result
}

function syncScroll() {
  if (!lane.value) return
  const { scrollLeft, scrollWidth, clientWidth } = lane.value
  canScrollLeft.value = scrollLeft > 1
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 1
}

function scroll(direction: -1 | 1) {
  if (!lane.value) return
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
  lane.value.scrollBy({ left: direction * Math.max(272, lane.value.clientWidth - 108), behavior })
}

async function toggleSort() {
  randomOrder.value = !randomOrder.value
  if (randomOrder.value) shuffleItems()
  await nextTick()
  lane.value?.scrollTo({ left: 0, behavior: 'instant' })
  syncScroll()
}

watch(() => items, async () => {
  if (randomOrder.value) shuffleItems()
  await nextTick()
  syncScroll()
})

onMounted(() => {
  interactive.value = true
  if (!lane.value) return
  syncScroll()
  observer = new ResizeObserver(syncScroll)
  observer.observe(lane.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>
