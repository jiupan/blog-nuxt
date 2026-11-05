<template>
  <nav v-if="total > 1" class="seo-pager" aria-label="文章分页" @click.capture="preparePageChange">
    <NuxtLink v-if="page > 1" :to="pageTo(page - 1)" :data-page="page - 1" class="page-dot" aria-label="上一页"
      ><UIcon name="i-lucide-chevron-left"
    /></NuxtLink>
    <span v-else class="page-dot is-disabled" aria-disabled="true"
      ><UIcon name="i-lucide-chevron-left"
    /></span>
    <template v-for="(item, index) in pages" :key="index">
      <span v-if="item === null" class="page-ellipsis" aria-hidden="true">…</span>
      <NuxtLink
        v-else
        :to="pageTo(item)"
        :data-page="item"
        class="page-dot"
        :class="{ 'is-active': item === page }"
        :aria-current="item === page ? 'page' : undefined"
        >{{ item }}</NuxtLink
      >
    </template>
    <NuxtLink v-if="page < total" :to="pageTo(page + 1)" :data-page="page + 1" class="page-dot" aria-label="下一页"
      ><UIcon name="i-lucide-chevron-right"
    /></NuxtLink>
    <span v-else class="page-dot is-disabled" aria-disabled="true"
      ><UIcon name="i-lucide-chevron-right"
    /></span>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
const props = defineProps<{
  page: number
  total: number
  pageTo: (page: number) => RouteLocationRaw
}>()

function preparePageChange(event: MouseEvent) {
  // 在链接开始导航之前定位；不等待路由、接口或新列表渲染。
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-page]') : null
  if (!link || Number(link.dataset.page) === props.page || link.target === '_blank') return
  const main = link.closest('main')
  window.scrollTo({ top: 0, behavior: 'instant' })
  if (main) {
    if (!main.hasAttribute('tabindex')) main.tabIndex = -1
    main.focus({ preventScroll: true })
  }
}
const pages = computed(() => {
  const visible = [...new Set([1, props.total, props.page - 1, props.page, props.page + 1])]
    .filter((page) => page >= 1 && page <= props.total)
    .sort((a, b) => a - b)
  if (props.total <= 5) return Array.from({ length: props.total }, (_, i) => i + 1)
  return visible.flatMap((page, i) => (i > 0 && page - visible[i - 1]! > 1 ? [null, page] : [page]))
})
</script>

<style scoped>
.seo-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 24px 0 0;
}
.page-dot {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--theme-border-soft, #e4e7ec);
  border-radius: 50%;
  background: var(--theme-surface, #fff);
  color: var(--theme-text-soft, #64748b);
  font-weight: 700;
}
.page-dot:hover {
  border-color: #4964f4;
}
.page-dot.is-active {
  background: #4964f4;
  color: #fff;
}
.page-dot.is-disabled {
  opacity: 0.4;
}
.page-ellipsis {
  color: #9097a5;
}
</style>
