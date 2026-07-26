<template>
  <span class="inline-rich-text">
    <template v-for="(part, index) in parts" :key="index">
      <strong v-if="part.bold">{{ part.text }}</strong>
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{ text: string }>()

const parts = computed(() => {
  const result: Array<{ text: string, bold: boolean }> = []
  const pattern = /\*\*(.+?)\*\*/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(props.text)) !== null) {
    if (match.index > cursor) {
      result.push({ text: props.text.slice(cursor, match.index), bold: false })
    }
    result.push({ text: match[1] || '', bold: true })
    cursor = match.index + match[0].length
  }

  if (cursor < props.text.length) {
    result.push({ text: props.text.slice(cursor), bold: false })
  }

  return result.length ? result : [{ text: props.text, bold: false }]
})
</script>

<style scoped>
.inline-rich-text { display: inline; }
.inline-rich-text strong { color: #1b222a; font-weight: 800; }
</style>
