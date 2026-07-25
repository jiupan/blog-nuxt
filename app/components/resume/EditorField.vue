<template>
  <label>
    <span>{{ label }}</span>
    <textarea v-if="textarea" :value="modelValue" rows="3" :placeholder="placeholder" @input="updateValue" />
    <input v-else :value="modelValue" :placeholder="placeholder" @input="updateValue">
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  textarea?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function updateValue(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLTextAreaElement).value)
}
</script>

<style scoped>
label { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
label > span { color: #687384; font-size: 9px; font-weight: 700; }
input, textarea { width: 100%; border: 1px solid #dfe4eb; border-radius: 7px; outline: 0; background: #fbfcfd; color: #303a49; font: 10px/1.5 inherit; transition: border-color .18s, box-shadow .18s; }
input { height: 36px; padding: 0 9px; }
textarea { min-height: 68px; resize: vertical; padding: 8px 9px; }
input:focus, textarea:focus { border-color: #74afe1; box-shadow: 0 0 0 3px rgb(8 116 209 / 8%); background: #fff; }
input::placeholder, textarea::placeholder { color: #abb2bc; }
</style>
