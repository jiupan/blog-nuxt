<template>
  <div
    class="config-field"
    :class="{ 'is-wide': wide }"
  >
    <div class="config-field-copy">
      <span class="config-field-icon">
        <UIcon
          :name="icon"
          class="size-4"
        />
      </span>
      <div>
        <label :id="labelId">{{ label }}</label>
        <p>{{ description }}</p>
      </div>
    </div>
    <div
      class="config-field-control"
      role="group"
      :aria-labelledby="labelId"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; description: string; icon: string; wide?: boolean }>()
const labelId = useId()
</script>

<style scoped>
.config-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  align-items: center;
  gap: 24px;
  padding: 23px 0;
  border-bottom: 1px solid #e4e7ec;
  background: #fff;
}
.config-field:last-child {
  border: 0;
}
.config-field.is-wide {
  grid-template-columns: 1fr;
  gap: 15px;
}
.config-field-copy {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.config-field-icon {
  display: grid;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 6px;
  background: #f3f1f8;
  color: #8b7daf;
}
.config-field label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #344054;
}
.config-field p {
  margin-top: 6px;
  max-width: 310px;
  color: #667085;
  font-size: 11px;
  line-height: 1.8;
}
.config-field-control {
  min-width: 0;
}
.config-field-control :deep([data-slot='root']),
.config-field-control :deep(input),
.config-field-control :deep(textarea) {
  width: 100%;
}
@media (max-width: 1000px) {
  .config-field {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .config-field p {
    max-width: none;
  }
}
</style>
