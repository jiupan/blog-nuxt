<template>
  <nav v-if="total > 1" class="seo-pager" aria-label="文章分页" @click.capture="preparePageChange">
    <div class="pager-layout" :class="{ 'is-edge': page === 1 || page === total }">
      <NuxtLink v-if="page > 1" :to="pageTo(page - 1)" :data-page="page - 1" class="pager-control pager-step pager-prev" aria-label="上一页" aria-current-value="false" rel="prev">
        <UIcon name="i-lucide-chevron-left" class="pager-step-icon" aria-hidden="true" />
        <span class="pager-step-label">上页</span>
      </NuxtLink>
      <div class="pager-center">
        <template v-for="(item, index) in pages" :key="item ?? `gap-${index}`">
          <span v-if="item === null" class="page-ellipsis" aria-hidden="true">…</span>
          <span v-else-if="item === page" :data-page="item" class="pager-control page-number is-current" aria-current="page">{{ item }}</span>
          <NuxtLink v-else :to="pageTo(item)" :data-page="item" class="pager-control page-number" aria-current-value="false">{{ item }}</NuxtLink>
        </template>
        <form class="pager-jump" :class="{ 'has-value': jumpPage }" @submit.prevent="submitJump">
          <span class="pager-jump-tip" aria-hidden="true">跳转到指定页面</span>
          <input
            ref="jumpInput"
            :value="jumpPage"
            type="text"
            inputmode="numeric"
            pattern="[0-9]+"
            placeholder="页码"
            aria-label="跳转到指定页"
            @input="updateJumpPage"
          >
          <button type="submit" aria-label="跳转" :disabled="!jumpPage">
            <UIcon name="i-lucide-chevrons-right" class="pager-jump-icon" aria-hidden="true" />
          </button>
        </form>
      </div>
      <NuxtLink v-if="page < total" :to="pageTo(page + 1)" :data-page="page + 1" class="pager-control pager-step pager-next" aria-label="下一页" aria-current-value="false" rel="next">
        <span class="pager-step-label">下页</span>
        <UIcon name="i-lucide-chevron-right" class="pager-step-icon" aria-hidden="true" />
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
const props = defineProps<{
  page: number
  total: number
  pageTo: (page: number) => RouteLocationRaw
}>()
const router = useRouter()
const jumpPage = ref('')
const jumpInput = useTemplateRef<HTMLInputElement>('jumpInput')

watch([() => props.page, () => props.total], () => {
  jumpPage.value = ''
  jumpInput.value?.setCustomValidity('')
})

function preparePageChange(event: MouseEvent) {
  // 在链接开始导航之前定位；不等待路由、接口或新列表渲染。
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-page]') : null
  if (!link || Number(link.dataset.page) === props.page || link.target === '_blank') return
  scrollToListTop(link)
}

function scrollToListTop(trigger: Element) {
  const main = trigger.closest('main')
  window.scrollTo({ top: 0, behavior: 'instant' })
  if (main) {
    if (!main.hasAttribute('tabindex')) main.tabIndex = -1
    main.focus({ preventScroll: true })
  }
}

function updateJumpPage(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const value = input.value
  jumpPage.value = /^[0-9]+$/.test(value) && Number(value) > props.total ? String(props.total) : value
  if (input.value !== jumpPage.value) input.value = jumpPage.value
  input.setCustomValidity('')
}

function submitJump() {
  const input = jumpInput.value
  if (!input || !jumpPage.value.trim()) return
  const target = Number(jumpPage.value)
  if (!Number.isInteger(target) || target < 1 || target > props.total) {
    input.setCustomValidity(`请输入 1 到 ${props.total} 之间的页码`)
    input.reportValidity()
    return
  }
  if (target === props.page) return
  scrollToListTop(input)
  void router.push(props.pageTo(target))
}

const pages = computed(() => {
  const visible = [...new Set([1, props.total, props.page - 2, props.page - 1, props.page, props.page + 1, props.page + 2])]
    .filter((page) => page >= 1 && page <= props.total)
    .sort((a, b) => a - b)
  if (props.total <= 5) return Array.from({ length: props.total }, (_, i) => i + 1)
  return visible.flatMap((page, i) => (i > 0 && page - visible[i - 1]! > 1 ? [null, page] : [page]))
})
</script>

<style scoped>
.seo-pager {
  container-type: inline-size;
  margin-block-start: 24px;
  --pager-size: 40px;
  --pager-radius: 999px;
  --pager-border: var(--theme-border-soft, #e4e7ec);
}

.pager-layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  grid-template-areas: 'prev center next';
  align-items: center;
  gap: 12px;
}

.pager-center {
  grid-area: center;
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}

.pager-control {
  display: inline-flex;
  min-inline-size: var(--pager-size);
  min-block-size: var(--pager-size);
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 1px solid var(--pager-border);
  border-radius: var(--pager-radius);
  background: var(--theme-surface, #fff);
  color: var(--theme-text);
  box-shadow: 0 5px 14px -5px rgb(var(--theme-shadow) / 12%);
  font-size: 16px;
  font-weight: 500;
  transition: border-color .3s ease, color .3s ease, background-color .3s ease, box-shadow .3s ease;
}

.pager-step {
  position: relative;
  inline-size: 80px;
  white-space: nowrap;
}

.pager-prev {
  --step-icon-shift: -15px;
  --step-label-from: 10px;
  --step-label-to: -5px;
  grid-area: prev;
  justify-self: start;
}

.pager-next {
  --step-icon-shift: 15px;
  --step-label-from: -10px;
  --step-label-to: 5px;
  grid-area: next;
  justify-self: end;
}

.pager-step-icon { font-size: 20px; transition: transform .3s ease; }

.pager-step-label {
  position: absolute;
  opacity: 0;
  transform: translateX(var(--step-label-from));
  transition: opacity .3s ease, transform .3s ease;
  pointer-events: none;
}

.pager-prev .pager-step-label { inset-inline-start: 50%; }
.pager-next .pager-step-label { inset-inline-end: 50%; }
.pager-step:is(:hover, :focus-visible) .pager-step-icon { transform: translateX(var(--step-icon-shift)); }
.pager-step:is(:hover, :focus-visible) .pager-step-label {
  opacity: 1;
  transform: translateX(var(--step-label-to));
}

a.pager-control:is(:hover, :focus-visible) {
  border-color: var(--theme-accent);
  color: var(--theme-accent);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--theme-accent) 17%, transparent);
}

.pager-control:focus-visible,
.pager-jump button:focus-visible {
  outline: 2px solid var(--theme-accent);
  outline-offset: 3px;
}

.page-number.is-current {
  border-color: var(--theme-accent);
  background: var(--theme-accent);
  color: var(--theme-accent-foreground);
  box-shadow: 0 4px 10px color-mix(in srgb, var(--theme-accent) 23%, transparent);
}

.page-ellipsis { min-width: 12px; color: var(--theme-text-muted, #9097a5); text-align: center; }

.pager-jump {
  position: relative;
  inline-size: var(--pager-size);
  margin: 0;
  margin-inline-start: 2px;
  transition: inline-size .3s ease;
}

.pager-jump:is(:hover, :focus-within, .has-value) { inline-size: 100px; }

.pager-jump-tip {
  position: absolute;
  z-index: 2;
  bottom: calc(100% + 9px);
  left: 50%;
  padding: 7px 12px;
  border: 1px solid var(--pager-border);
  border-radius: 12px;
  background: var(--theme-surface);
  color: var(--theme-text);
  box-shadow: 0 5px 14px -5px rgb(var(--theme-shadow) / 13%);
  font-size: 14px;
  line-height: 1.45;
  white-space: nowrap;
  opacity: 0;
  transform: translate(-50%, 4px);
  pointer-events: none;
  transition: opacity .18s ease, transform .18s ease;
}

.pager-jump:is(:hover, :focus-within) .pager-jump-tip {
  opacity: 1;
  transform: translateX(-50%);
}

.pager-jump input {
  display: block;
  inline-size: 100%;
  block-size: var(--pager-size);
  padding-inline: 8px 30px;
  border: 1px solid var(--pager-border);
  border-radius: var(--pager-radius);
  background: var(--theme-surface);
  color: var(--theme-text);
  font-size: 14px;
  outline: none;
  transition: border-color .3s ease, background-color .3s ease;
}

.pager-jump input::placeholder { color: transparent; }
.pager-jump:is(:hover, :focus-within) input { border-color: var(--theme-accent); }
.pager-jump:is(:hover, :focus-within, .has-value) input { background: var(--theme-surface-muted); }
.pager-jump:is(:hover, :focus-within) input::placeholder { color: var(--theme-text-muted); }

.pager-jump button {
  position: absolute;
  inset: 5px 5px 5px auto;
  display: grid;
  inline-size: 30px;
  place-items: center;
  border-radius: var(--pager-radius);
  color: var(--theme-text);
  cursor: pointer;
  transition: background-color .3s ease, color .3s ease, opacity .3s ease;
}

.pager-jump-icon { font-size: 20px; }
.pager-jump button:disabled { pointer-events: none; }
.pager-jump:is(:hover, :focus-within) button:disabled { opacity: .3; }
.pager-jump button:enabled:is(:hover, :focus-visible) { background: var(--theme-accent); color: var(--theme-accent-foreground); }

@container (width <= 680px) {
  .pager-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas: 'prev next';
    gap: 8px;
  }
  .pager-center { display: none; }
  .pager-step {
    --step-label-to: 0px;
    inline-size: auto;
    min-block-size: 50px;
    justify-self: stretch;
    border-radius: 12px;
  }
  .pager-step-icon { display: none; }
  .pager-step-label { position: static; opacity: 1; transform: none; }
  .pager-layout.is-edge .pager-step { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
  .pager-control,
  .pager-step-icon,
  .pager-step-label,
  .pager-jump,
  .pager-jump-tip,
  .pager-jump input,
  .pager-jump button { transition: none; }
}
</style>
