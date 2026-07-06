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
              v-for="option in categoryIconOptions"
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

const categoryIconOptions = [
  { name: 'i-lucide-folder', label: '通用' },
  { name: 'i-lucide-code-2', label: '代码' },
  { name: 'i-lucide-terminal', label: '终端' },
  { name: 'i-lucide-book-open', label: '阅读' },
  { name: 'i-lucide-pen-tool', label: '写作' },
  { name: 'i-lucide-camera', label: '摄影' },
  { name: 'i-lucide-palette', label: '设计' },
  { name: 'i-lucide-coffee', label: '生活' },
  { name: 'i-lucide-rocket', label: '项目' },
  { name: 'i-lucide-wrench', label: '工具' }
]
</script>
