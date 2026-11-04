<template>
  <details class="post-setting-tool">
    <summary class="post-setting-tool-summary">
      <span class="post-setting-tool-icon"><UIcon name="i-lucide-search-check" class="size-4" /></span>
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

<style scoped src="./post-setting-tool.css"></style>

<style scoped src="./post-ai-result.css"></style>

<style scoped>
.seo-check-field {
  display: grid;
  gap: 0.65rem;
}

.seo-score {
  background: #fff7ed;
  border-color: #fed7aa;
}

.seo-score span {
  color: #c2410c;
}

.seo-score strong {
  color: #9a3412;
}

.seo-issue-list {
  display: grid;
  gap: 0.45rem;
}

.seo-issue-list article {
  display: grid;
  gap: 0.18rem;
  border-left: 3px solid #f59e0b;
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.6rem;
}

.seo-issue-list article.is-error {
  border-left-color: #ef4444;
}

.seo-issue-list article.is-warning {
  border-left-color: #f59e0b;
}

.seo-issue-list strong {
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 900;
}

.seo-issue-list p {
  margin: 0;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.45;
}

.seo-keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.seo-keyword-list span {
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 850;
  padding: 0.25rem 0.5rem;
}
</style>
