<template>
  <button
    type="button"
    class="admin-drag-handle"
    :disabled="disabled"
    :aria-label="`拖动${label}调整顺序`"
    title="按住拖动调整顺序"
    @click.stop
  >
    <UIcon name="i-lucide-grip-vertical" class="size-4" />
  </button>
</template>
<script setup lang="ts">
defineProps<{ label: string; disabled?: boolean }>()
</script>
