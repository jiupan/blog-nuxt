<template>
  <UModal v-model:open="open" title="新建分类" description="创建后会自动选中为当前文章分类。">
    <template #body>
      <form class="taxonomy-create-form" @submit.prevent="$emit('submit')">
        <UFormField label="分类名称" required>
          <UInput v-model="name" placeholder="例如：技术笔记" autofocus class="w-full" />
        </UFormField>
        <UFormField label="别名">
          <UInput v-model="slug" placeholder="留空自动生成" class="w-full" />
        </UFormField>
        <UFormField label="图标">
          <div class="taxonomy-icon-grid" role="radiogroup" aria-label="分类图标">
            <button
              v-for="option in visibleIconOptions"
              :key="option.name"
              type="button"
              class="taxonomy-icon-option"
              :class="{ 'is-selected': icon === option.name }"
              :title="option.label"
              @click="icon = option.name"
            >
              <UIcon :name="option.name" class="size-4" />
              <span>{{ option.label }}</span>
            </button>
          </div>
          <button type="button" class="taxonomy-icon-toggle" @click="iconsExpanded = !iconsExpanded">
            <UIcon :name="iconsExpanded ? 'i-lucide-chevron-up' : 'i-lucide-layout-grid'" class="size-4" />
            {{ iconsExpanded ? '收起更多图标' : `展开更多图标（${categoryIconOptions.length - primaryCategoryIconCount}）` }}
          </button>
        </UFormField>
        <div class="taxonomy-create-actions">
          <UButton type="button" color="neutral" variant="outline" @click="open = false">取消</UButton>
          <UButton type="submit" icon="i-lucide-check" :loading="creating" :disabled="!name.trim()">创建并选择</UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { categoryIconOptions, primaryCategoryIconCount, visibleCategoryIcons } from '~/utils/category-icons'

defineProps<{
  creating: boolean
}>()

defineEmits<{
  submit: []
}>()

const open = defineModel<boolean>('open', { required: true })
const name = defineModel<string>('name', { required: true })
const slug = defineModel<string>('slug', { required: true })
const icon = defineModel<string>('icon', { required: true })
const iconsExpanded = ref(false)
const visibleIconOptions = computed(() => visibleCategoryIcons(icon.value, iconsExpanded.value))

</script>
