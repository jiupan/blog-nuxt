<template>
  <UPopover v-model:open="open" :content="{ align: 'start' }">
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      :icon="icon"
      trailing-icon="i-lucide-chevron-down"
      :disabled="disabled"
      :aria-label="label"
    >
      {{ selectedLabel }}
    </UButton>
    <template #content>
      <div class="shortcut-icon-library" role="group" :aria-label="label">
        <button
          v-for="option in headerShortcutIcons"
          :key="option.name"
          type="button"
          :aria-label="option.label"
          :title="option.label"
          :aria-pressed="icon === option.name"
          :disabled="disabled"
          @click="select(option.name)"
        >
          <UIcon :name="option.name" class="size-5" />
        </button>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { headerShortcutIcons } from '~~/shared/header-shortcuts'

defineProps<{ label: string; disabled?: boolean }>()
const icon = defineModel<string>({ required: true })
const open = ref(false)
const selectedLabel = computed(() => headerShortcutIcons.find(option => option.name === icon.value)?.label ?? '选择图标')

function select(name: string) {
  icon.value = name
  open.value = false
}
</script>

<style scoped>
.shortcut-icon-library {
  display: grid;
  grid-template-columns: repeat(5, 36px);
  gap: 4px;
  padding: 8px;
}
.shortcut-icon-library button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--admin-muted);
}
.shortcut-icon-library button:hover,
.shortcut-icon-library button[aria-pressed='true'] {
  border-color: var(--admin-accent-soft);
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}
.shortcut-icon-library button:focus-visible {
  outline: 2px solid var(--admin-accent);
  outline-offset: 2px;
}
</style>
