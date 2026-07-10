<template>
  <details class="post-setting-tool">
    <summary class="post-setting-tool-summary">
      <span class="post-setting-tool-icon is-violet"><UIcon name="i-lucide-wand-sparkles" class="size-4" /></span>
      <span class="post-setting-tool-copy">
        <strong>AI 写作助手</strong>
        <small>分析完成度并生成内容建议</small>
      </span>
      <UIcon name="i-lucide-chevron-down" class="post-setting-tool-chevron size-4" />
    </summary>
    <div class="post-setting-tool-body writing-assistant-field">
      <div class="writing-assistant-actions">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-wand-sparkles"
          :loading="generating"
          :disabled="pending"
          @click="$emit('generate')"
        >
          分析当前文章
        </UButton>
        <span v-if="generated" class="ai-summary-success">
          <UIcon name="i-lucide-check" class="size-4" />
          已完成分析
        </span>
      </div>

      <div v-if="result" class="writing-assistant-result">
        <div class="writing-score">
          <span>完成度</span>
          <strong>{{ result.completionScore }}</strong>
        </div>

        <section>
          <div class="writing-section-title">
            <h3>内容建议</h3>
          </div>
          <ul>
            <li v-for="item in result.missingPoints" :key="item">{{ item }}</li>
            <li v-for="item in result.writingAdvice" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section>
          <div class="writing-section-title">
            <h3>可应用内容</h3>
          </div>
          <div class="writing-apply-list">
            <button type="button" @click="$emit('applySummary')">
              应用摘要
            </button>
            <button type="button" @click="$emit('applySeo')">
              应用 SEO
            </button>
            <button v-if="result.suggestedCategoryIds.length" type="button" @click="$emit('applyCategory')">
              应用分类
            </button>
            <button v-if="result.suggestedTagIds.length" type="button" @click="$emit('applyTags')">
              应用标签
            </button>
          </div>
        </section>

        <section v-if="result.titleSuggestions.length">
          <div class="writing-section-title">
            <h3>标题建议</h3>
          </div>
          <div class="writing-title-list">
            <button v-for="item in result.titleSuggestions" :key="item" type="button" @click="$emit('applyTitle', item)">
              {{ item }}
            </button>
          </div>
        </section>
      </div>
      <p v-else class="post-relations-hint">分析不会自动覆盖表单，确认后再应用到文章。</p>
    </div>
  </details>
</template>

<script setup lang="ts">
import type { WritingAssistantResult } from './post-form.types'

defineProps<{
  result: WritingAssistantResult | null
  generating: boolean
  generated: boolean
  pending: boolean
}>()

defineEmits<{
  generate: []
  applySummary: []
  applySeo: []
  applyCategory: []
  applyTags: []
  applyTitle: [title: string]
}>()
</script>
