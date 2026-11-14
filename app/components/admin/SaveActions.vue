<template>
  <div class="admin-save-actions">
    <span
      class="admin-save-state admin-settings-save-state"
      :class="{ 'is-dirty': dirty, 'is-saving': saving }"
      :title="scope"
      role="status"
    >
      <span>{{ saving ? '正在保存' : dirty ? scope || '有未保存修改' : ready ? '已保存' : '' }}</span>
    </span>
    <span class="admin-save-undo-slot">
      <UButton
        v-if="dirty"
        type="button"
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-undo-2"
        aria-label="撤销修改"
        title="撤销修改"
        :disabled="saving || undoDisabled"
        @click="$emit('undo')"
      >
        <span class="admin-save-undo-label">撤销修改</span>
      </UButton>
    </span>
    <UButton
      :type="form ? 'submit' : 'button'"
      :form="form || undefined"
      class="admin-save-submit"
      size="sm"
      icon="i-lucide-check"
      :loading="saving"
      :disabled="!ready || !dirty || saving || disabled"
      @click="!form && $emit('save')"
    >
      {{ saving ? '保存中…' : label }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  dirty: boolean
  saving: boolean
  ready?: boolean
  disabled?: boolean
  undoDisabled?: boolean
  label?: string
  scope?: string
  form?: string
}>(), { ready: true, label: '保存设置', scope: '', form: '' })

defineEmits<{ save: []; undo: [] }>()
</script>
