<template>
  <div class="grid gap-3">
    <ol v-if="rows.length" class="grid gap-3">
      <li v-for="(row, index) in rows" :key="index" class="grid gap-2 rounded-lg border border-default p-3">
        <AdminFooterFeaturedPost
          :model-value="row.postId ? String(row.postId) : ''"
          :picker-key="`home-hero-option-${index}`"
          :label="`轮播文章 ${index + 1}`"
          :disabled="disabled"
          required-selection
          @update:model-value="update(index, { postId: Number($event) })"
        />
        <div class="flex flex-wrap items-center justify-between gap-2">
          <UInput
            :model-value="row.color"
            :aria-label="`第 ${index + 1} 张主题色`"
            :disabled="disabled"
            placeholder="自动取色"
            maxlength="7"
            class="w-32"
            @update:model-value="update(index, { color: $event.trim() })"
          />
          <div class="flex items-center gap-1">
            <UButton type="button" icon="i-lucide-arrow-up" aria-label="上移" variant="ghost" color="neutral" :disabled="disabled || index === 0" @click="move(index, -1)" />
            <UButton type="button" icon="i-lucide-arrow-down" aria-label="下移" variant="ghost" color="neutral" :disabled="disabled || index === rows.length - 1" @click="move(index, 1)" />
            <UButton type="button" icon="i-lucide-trash-2" aria-label="移除文章" variant="ghost" color="neutral" :disabled="disabled" @click="remove(index)" />
          </div>
        </div>
      </li>
    </ol>
    <UButton v-if="rows.length < homeHeroLimit" type="button" icon="i-lucide-plus" variant="outline" color="neutral" class="justify-self-start" :disabled="disabled" @click="write([...rows, { postId: 0, color: '' }])">
      添加轮播文章
    </UButton>
    <p class="text-xs text-muted">最多选择 {{ homeHeroLimit }} 篇公开文章。主题色可填写 #RRGGBB。清空列表后自动选文。</p>
  </div>
</template>

<script setup lang="ts">
import { homeHeroLimit, type HomeHeroSelection } from '~~/shared/home-hero'
import { moveArrayItem } from '~/utils/reorder'

defineProps<{ disabled?: boolean }>()
const model = defineModel<string>({ required: true })
const rows = computed<HomeHeroSelection>(() => {
  try {
    const items = JSON.parse(model.value)
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
})

function write(items: HomeHeroSelection) {
  model.value = JSON.stringify(items)
}

function update(index: number, patch: Partial<HomeHeroSelection[number]>) {
  write(rows.value.map((row, position) => position === index ? { ...row, ...patch } : row))
}

function remove(index: number) {
  write(rows.value.filter((_, position) => position !== index))
}

function move(index: number, delta: number) {
  write(moveArrayItem(rows.value, index, index + delta))
}
</script>
