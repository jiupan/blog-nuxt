<template>
  <div class="space-y-2">
    <UInput
      v-model="draft"
      :aria-label="label"
      :disabled="model === null"
      type="password"
      autocomplete="new-password"
      icon="i-lucide-lock-keyhole"
      placeholder="留空保留当前配置"
    />
    <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
      <span>{{ statusText }}</span>
      <UButton
        v-if="status?.stored || model === null"
        type="button"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="model = model === null ? '' : null"
      >
        {{ model === null ? '撤销清除' : '清除已保存密钥' }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AiSecretStatus } from '~~/types/dto/settings'

const props = defineProps<{ label: string, status?: AiSecretStatus }>()
const model = defineModel<string | null>({ required: true })
const draft = computed({
  get: () => model.value ?? '',
  set: (value: string) => { model.value = value }
})
const statusText = computed(() => {
  if (model.value === null) return '保存后清除数据库中的密钥'
  if (props.status?.environment) return '使用服务器环境变量'
  return props.status?.stored ? '已保存密钥' : '未配置密钥'
})
</script>
