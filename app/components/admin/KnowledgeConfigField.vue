<template>
  <div class="config-field" :class="{ 'is-wide': wide }">
    <div class="config-field-copy">
      <span class="config-field-icon"><UIcon :name="icon" class="size-4" /></span>
      <div><label>{{ label }}</label><p>{{ description }}</p></div>
    </div>
    <div class="config-field-control"><slot /></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string, description: string, icon: string, wide?: boolean }>()
</script>

<style scoped>
.config-field{display:grid;grid-template-columns:minmax(13rem,.8fr) minmax(15rem,1.2fr);align-items:center;gap:1.25rem;min-height:5.5rem;border:1px solid #e8edf4;border-radius:.85rem;background:linear-gradient(135deg,#fff 0%,#fbfcff 100%);padding:1rem;transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease}.config-field:hover{border-color:#cbd5e1;box-shadow:0 10px 28px rgb(15 23 42/6%);transform:translateY(-1px)}.config-field.is-wide{grid-column:1/-1}.config-field-copy{display:flex;align-items:flex-start;gap:.75rem}.config-field-icon{display:grid;width:2.25rem;height:2.25rem;flex:0 0 auto;place-items:center;border-radius:.65rem;background:#eef2ff;color:#4f46e5}.config-field label{display:block;color:#1e293b;font-size:.8rem;font-weight:850}.config-field p{margin:.25rem 0 0;color:#8492a6;font-size:.7rem;line-height:1.55}.config-field-control{min-width:0}.config-field-control :deep(.u-input),.config-field-control :deep(.u-select),.config-field-control :deep(.u-textarea){width:100%}@media(max-width:760px){.config-field{grid-template-columns:1fr;gap:.8rem}.config-field-copy{align-items:center}}
</style>
