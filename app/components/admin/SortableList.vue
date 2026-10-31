<template>
  <div ref="container" class="admin-sortable-list"><slot /></div>
</template>

<script setup lang="ts" generic="T">
import type Sortable from 'sortablejs'
import { moveArrayItem } from '~/utils/reorder'

const props = withDefaults(defineProps<{ items: T[]; disabled?: boolean; handle?: string }>(), {
  disabled: false,
  handle: '.admin-drag-handle'
})
const emit = defineEmits<{ reorder: [items: T[]] }>()
const container = ref<HTMLElement | null>(null)
let sortable: Sortable | undefined
let generation = 0

watch(
  container,
  async (element) => {
    const current = ++generation
    sortable?.destroy()
    sortable = undefined
    if (!element) return
    const { default: SortableClass } = await import('sortablejs')
    if (current !== generation) return
    sortable = new SortableClass(element, {
      handle: props.handle,
      draggable: '> .admin-sortable-item',
      group: { name: 'admin-local-order', pull: false, put: false },
      disabled: props.disabled,
      animation: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 150,
      ghostClass: 'admin-sort-ghost',
      chosenClass: 'admin-sort-chosen',
      dragClass: 'admin-sort-drag',
      fallbackClass: 'admin-sort-fallback',
      forceFallback: true,
      fallbackTolerance: 4,
      delay: 140,
      delayOnTouchOnly: true,
      touchStartThreshold: 4,
      scroll: true,
      forceAutoScrollFallback: true,
      scrollSensitivity: 60,
      scrollSpeed: 12,
      onEnd(event) {
        const from = event.oldDraggableIndex
        const to = event.newDraggableIndex
        if (from === undefined || to === undefined || from === to) return
        // Vue owns the keyed DOM order: restore it before updating the source array.
        const siblings = Array.from(event.from.children).filter(
          (child) => child !== event.item && child.matches('.admin-sortable-item')
        )
        event.from.insertBefore(event.item, siblings[from] || null)
        emit('reorder', moveArrayItem(props.items, from, to))
      }
    })
  },
  { flush: 'post' }
)

watch(
  () => props.disabled,
  (value) => sortable?.option('disabled', value)
)
onBeforeUnmount(() => {
  generation++
  sortable?.destroy()
})
</script>
