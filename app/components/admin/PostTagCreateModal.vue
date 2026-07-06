<template>
  <UModal v-model:open="open" title="新建标签" description="创建后会自动添加到当前文章标签。">
    <template #body>
      <form class="taxonomy-create-form" @submit.prevent="$emit('submit')">
        <UFormField label="标签名称" required>
          <UInput v-model="name" placeholder="例如：Nuxt" autofocus class="w-full" />
        </UFormField>
        <UFormField label="别名">
          <UInput v-model="slug" placeholder="留空自动生成" class="w-full" />
        </UFormField>
        <div class="taxonomy-create-actions">
          <UButton type="button" color="neutral" variant="outline" @click="open = false">取消</UButton>
          <UButton type="submit" icon="i-lucide-check" :loading="creating" :disabled="!name.trim()">创建并添加</UButton>
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
</script>
