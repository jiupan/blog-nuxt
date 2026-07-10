<template>
  <details class="post-setting-tool">
    <summary class="post-setting-tool-summary">
      <span class="post-setting-tool-icon is-orange"><UIcon name="i-lucide-search-check" class="size-4" /></span>
      <span class="post-setting-tool-copy">
        <strong>SEO 检查助手</strong>
        <small>检查结构、关键词和搜索摘要</small>
      </span>
      <UIcon name="i-lucide-chevron-down" class="post-setting-tool-chevron size-4" />
    </summary>
    <div class="post-setting-tool-body seo-check-field">
      <div class="writing-assistant-actions">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-search-check"
          :loading="checking"
          :disabled="pending"
          @click="$emit('run')"
        >
          检查 SEO
        </UButton>
        <span v-if="generated" class="ai-summary-success">
          <UIcon name="i-lucide-check" class="size-4" />
          已完成检查
        </span>
      </div>

      <div v-if="result" class="seo-check-result">
        <div class="writing-score seo-score">
          <span>SEO 分数</span>
          <strong>{{ result.score }}</strong>
        </div>

        <section v-if="problems.length">
          <div class="writing-section-title">
            <h3>待优化项</h3>
          </div>
          <div class="seo-issue-list">
            <article v-for="issue in problems" :key="issue.key" :class="`is-${issue.type}`">
              <strong>{{ issue.title }}</strong>
              <p>{{ issue.description }}</p>
            </article>
          </div>
        </section>

        <section>
          <div class="writing-section-title">
            <h3>AI 修复建议</h3>
          </div>
          <ul>
            <li v-for="item in result.advice.fixes" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section v-if="result.advice.keywordSuggestions.length">
          <div class="writing-section-title">
            <h3>关键词建议</h3>
          </div>
          <div class="seo-keyword-list">
            <span v-for="item in result.advice.keywordSuggestions" :key="item">{{ item }}</span>
          </div>
        </section>

        <section>
          <div class="writing-section-title">
            <h3>可应用内容</h3>
          </div>
          <div class="writing-apply-list">
            <button type="button" @click="$emit('applyMeta')">
              应用 SEO 标题和描述
            </button>
          </div>
        </section>
      </div>
      <p v-else class="post-relations-hint">检查当前标题、摘要、SEO 字段、正文结构、图片和链接。</p>
    </div>
  </details>
</template>

<script setup lang="ts">
import type { SeoCheckResult } from './post-form.types'

const props = defineProps<{
  result: SeoCheckResult | null
  checking: boolean
  generated: boolean
  pending: boolean
}>()

defineEmits<{
  run: []
  applyMeta: []
}>()

const problems = computed(() => props.result?.issues.filter((issue) => issue.type !== 'success') || [])
</script>
