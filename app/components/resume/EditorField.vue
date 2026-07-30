<template>
  <label>
    <span>{{ label }}</span>
    <div v-if="textarea" class="textarea-shell" :class="{ rich }">
      <div v-if="rich" class="field-toolbar">
        <button type="button" title="加粗选中的文字" aria-label="加粗选中的文字" @click="toggleBold">
          <strong>B</strong>
        </button>
        <small>选中文字后点击，或按 Ctrl / ⌘ + B</small>
      </div>
      <textarea ref="textareaElement" :value="modelValue" rows="3" :placeholder="placeholder" @input="updateValue" @keydown="handleKeydown" />
    </div>
    <input v-else :value="modelValue" :placeholder="placeholder" @input="updateValue">
  </label>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  label: string
  placeholder?: string
  textarea?: boolean
  rich?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const textareaElement = ref<HTMLTextAreaElement | null>(null)

function updateValue(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement | HTMLTextAreaElement).value)
}

function toggleBold() {
  const textarea = textareaElement.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end)
  let value: string
  let nextStart: number
  let nextEnd: number

  if (selected.startsWith('**') && selected.endsWith('**') && selected.length >= 4) {
    const replacement = selected.slice(2, -2)
    value = textarea.value.slice(0, start) + replacement + textarea.value.slice(end)
    nextStart = start
    nextEnd = start + replacement.length
  } else if (start >= 2 && textarea.value.slice(start - 2, start) === '**' && textarea.value.slice(end, end + 2) === '**') {
    value = textarea.value.slice(0, start - 2) + selected + textarea.value.slice(end + 2)
    nextStart = start - 2
    nextEnd = end - 2
  } else {
    const replacement = `**${selected}**`
    value = textarea.value.slice(0, start) + replacement + textarea.value.slice(end)
    nextStart = start + 2
    nextEnd = selected ? end + 2 : start + 2
  }

  emit('update:modelValue', value)

  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(nextStart, nextEnd)
  })
}

function handleKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
    event.preventDefault()
    toggleBold()
  }
}
</script>

<style scoped>
label { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
label > span { color: #596577; font-size: 10px; font-weight: 750; }
input, textarea { width: 100%; border: 1px solid #dfe4eb; border-radius: 6px; outline: 0; background: #fbfcfd; color: #303a49; font: 11px/1.5 inherit; transition: border-color .18s, box-shadow .18s; }
input { height: 34px; padding: 0 9px; }
textarea { min-height: 72px; resize: vertical; padding: 8px 9px; }
.textarea-shell { min-width: 0; }
.textarea-shell.rich { overflow: hidden; border: 1px solid #dfe4eb; border-radius: 7px; background: #fbfcfd; transition: border-color .18s, box-shadow .18s; }
.textarea-shell.rich:focus-within { border-color: #74afe1; box-shadow: 0 0 0 3px rgb(8 116 209 / 8%); background: #fff; }
.textarea-shell.rich textarea { display: block; border: 0; border-radius: 0; box-shadow: none; background: transparent; }
.textarea-shell.rich textarea:focus { border: 0; box-shadow: none; background: transparent; }
.field-toolbar { display: flex; height: 30px; align-items: center; gap: 7px; padding: 0 7px; border-bottom: 1px solid #e6e9ee; background: #f6f8fa; }
.field-toolbar button { display: grid; width: 21px; height: 21px; place-items: center; border: 1px solid #d9dfe7; border-radius: 4px; background: #fff; color: #303a49; cursor: pointer; font: 12px Georgia, serif; }
.field-toolbar button:hover { border-color: #8fbee5; color: #0874d1; }
.field-toolbar small { color: #7f8997; font-size: 9px; }
input:focus, textarea:focus { border-color: #74afe1; box-shadow: 0 0 0 3px rgb(8 116 209 / 8%); background: #fff; }
input::placeholder, textarea::placeholder { color: #abb2bc; }
</style>
