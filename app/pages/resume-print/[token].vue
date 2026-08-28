<template>
  <main v-if="resume" class="resume-print-page">
    <component :is="'style'">{{ printPageCss }}</component>
    <ResumePreview :data="resume.content" :layout="resume.layout" />
  </main>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import type { ResumeDocument } from '~/types/resume'

definePageMeta({ layout: false })

const route = useRoute()
const token = String(route.params.token || '')
const { data, error } = await useFetch<ApiResult<ResumeDocument>>(`/api/resume-exports/${encodeURIComponent(token)}`)

if (error.value || !data.value?.data) {
  throw createError({ statusCode: 404, statusMessage: '导出页面已过期' })
}

const resume = computed(() => data.value?.data ?? null)
const continuationTopExtra = 4
const printPageCss = computed(() => {
  const margin = resume.value?.layout.verticalMargin ?? resume.value?.layout.pageMargin ?? 5
  return `@media print {
    @page {
      size: A4;
      margin: ${margin + continuationTopExtra}mm 0 ${margin}mm;
    }
    @page :first {
      margin-top: ${margin}mm;
    }
  }`
})

useSeoMeta({
  title: '简历 PDF',
  robots: 'noindex, nofollow'
})
</script>

<style scoped>
.resume-print-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #fff;
}

.resume-print-page :deep(.resume-paper) {
  box-shadow: none;
}

@media print {
  :global(html),
  :global(body),
  :global(#__nuxt) {
    width: 210mm !important;
    min-width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
  }

  .resume-print-page,
  .resume-print-page :deep(.resume-paper) {
    width: 210mm !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    overflow: visible !important;
    box-shadow: none !important;
  }
}
</style>
