<template>
  <Teleport
    v-if="target"
    :to="target"
  >
    <div class="admin-page-toolbar"><slot /></div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'

const target = inject<Ref<HTMLElement | null>>('admin-page-actions')
</script>
