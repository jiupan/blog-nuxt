<template>
  <template v-if="block.visible">
    <template v-if="block.key === 'bullets' && lines.length">
      <p v-if="block.label" class="block-label"><b>{{ block.label }}：</b></p>
      <ul>
        <li v-for="(line, index) in lines" :key="index"><InlineRichText :text="line" /></li>
      </ul>
    </template>
    <div v-else-if="block.key === 'stack' && technologies.length && block.style === 'tags'" class="detail-stack" :class="paragraphClass">
      <b v-if="block.label">{{ block.label }}：</b>
      <span v-for="(technology, index) in technologies" :key="index">{{ technology }}</span>
    </div>
    <p v-else-if="block.key !== 'bullets' && value" :class="paragraphClass">
      <b v-if="block.label">{{ block.label }}：</b><InlineRichText :text="value" />
    </p>
  </template>
</template>

<script setup lang="ts">
import type { ResumeBlockConfig } from '~/types/resume'
import { bulletLines, stackItems } from '~/utils/resume-section-layout'
import InlineRichText from './InlineRichText.vue'

const props = defineProps<{ block: ResumeBlockConfig, value: string, paragraphClass?: string }>()
const lines = computed(() => bulletLines(props.value))
const technologies = computed(() => stackItems(props.value))
</script>

<style scoped>
.detail-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.3mm 2mm;
  margin-top: 1.4mm;
  break-inside: avoid;
}
.detail-stack > b { margin-right: .5mm; }
.detail-stack > span {
  padding: .25mm 2mm;
  border: .25mm solid #d8dee7;
  border-radius: 1mm;
  background: #f4f6f8;
  color: #344b68;
  line-height: 1.35;
}
.block-label { break-after: avoid; }
</style>
