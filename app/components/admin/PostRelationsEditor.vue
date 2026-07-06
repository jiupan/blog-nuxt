<template>
  <UFormField label="继续阅读">
    <div class="post-relations-field">
      <div class="post-relations-actions">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-sparkles"
          :loading="generating"
          :disabled="pending"
          @click="$emit('generate')"
        >
          AI 推荐关联文章
        </UButton>
        <span v-if="generated" class="ai-summary-success">
          <UIcon name="i-lucide-check" class="size-4" />
          已生成推荐
        </span>
      </div>
      <p class="post-relations-hint">推荐结果不会自动发布，保存文章后才会写入前台。</p>
      <div v-if="items.length" class="post-relations-list">
        <article v-for="(item, index) in items" :key="item.relatedPostId" class="post-relation-item">
          <div class="post-relation-head">
            <strong>{{ item.title }}</strong>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="removeRelation(index)" />
          </div>
          <select v-model="item.type" class="admin-select post-relation-type">
            <option v-for="option in relationTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <UTextarea v-model="item.reason" :rows="2" class="w-full" />
          <div class="post-relation-controls">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-arrow-up" :disabled="index === 0" @click="moveRelation(index, -1)">上移</UButton>
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-arrow-down" :disabled="index === items.length - 1" @click="moveRelation(index, 1)">下移</UButton>
          </div>
        </article>
      </div>
      <div v-else class="post-relations-empty">
        暂无关联文章，可用 AI 生成后人工确认。
      </div>
    </div>
  </UFormField>
</template>

<script setup lang="ts">
import type { PostRelationItem, RelationType } from './post-form.types'

defineProps<{
  generating: boolean
  generated: boolean
  pending: boolean
}>()

defineEmits<{
  generate: []
}>()

const items = defineModel<PostRelationItem[]>({ required: true })

const relationTypeOptions: Array<{ value: RelationType, label: string }> = [
  { value: 'PREREQUISITE', label: '前置阅读' },
  { value: 'EXTENSION', label: '延伸阅读' },
  { value: 'SAME_TOPIC', label: '同主题' },
  { value: 'PRACTICE', label: '实战补充' },
  { value: 'BACKGROUND', label: '背景知识' }
]

function removeRelation(index: number) {
  items.value.splice(index, 1)
}

function moveRelation(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.value.length) return

  const next = items.value.slice()
  const [item] = next.splice(index, 1)
  if (!item) return

  next.splice(nextIndex, 0, item)
  items.value = next
}
</script>
