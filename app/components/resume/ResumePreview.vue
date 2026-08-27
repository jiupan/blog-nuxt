<template>
  <component :is="activeTemplate" :data="data" :layout="layout" />
</template>

<script setup lang="ts">
import '@fontsource-variable/noto-sans-sc'
import '~/assets/css/resume-template-base.css'
import type { Component } from 'vue'
import type { ResumeContent, ResumeLayout, ResumeTemplate } from '~/types/resume'
import ResumeClassicTemplate from './templates/ResumeClassicTemplate.vue'
import ResumeModernTemplate from './templates/ResumeModernTemplate.vue'

const props = defineProps<{ data: ResumeContent, layout: ResumeLayout }>()

const templates: Record<ResumeTemplate, Component> = {
  classic: ResumeClassicTemplate,
  modern: ResumeModernTemplate
}

const activeTemplate = computed(() => templates[props.layout.template] || ResumeClassicTemplate)
</script>
