<template>
  <UFormField label="标题">
    <UInput v-model="title" placeholder="请输入文章标题" class="w-full" />
  </UFormField>
  <UFormField label="别名">
    <UInput v-model="slug" placeholder="留空时自动生成 8 位链接码" class="w-full" />
  </UFormField>
  <UFormField label="摘要">
    <div class="ai-summary-field">
      <UTextarea v-model="summary" :rows="4" class="w-full" />
      <div class="ai-summary-actions">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-sparkles"
          :loading="generatingSummary"
          :disabled="pending"
          @click="$emit('generateSummary')"
        >
          AI 生成摘要
        </UButton>
        <span v-if="summaryGenerated" class="ai-summary-success">
          <UIcon name="i-lucide-check" class="size-4" />
          已填入摘要
        </span>
      </div>
    </div>
  </UFormField>
  <UFormField label="封面 URL">
    <div class="post-upload-row">
      <UInput v-model="cover" placeholder="/uploads/..." class="flex-1" />
      <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="$emit('uploadCover', $event)" />
      <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploadingCover" @click="coverInputRef?.click()">上传</UButton>
      <UButton color="neutral" variant="outline" icon="i-lucide-images" @click="$emit('openGallery')">图库</UButton>
      <span v-if="coverUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
      <span v-if="coverUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
    </div>
    <div v-if="cover" class="cover-preview">
      <img :src="cover" :alt="title || '文章封面预览'" loading="lazy" />
      <div class="cover-preview-meta">
        <span>{{ cover }}</span>
        <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="cover = ''">移除</UButton>
      </div>
    </div>
  </UFormField>
  <UFormField label="展示策略">
    <label class="pin-setting-card" :class="{ 'is-active': isPinned }">
      <input v-model="isPinned" type="checkbox" class="pin-setting-input">
      <span class="pin-setting-icon" aria-hidden="true">
        <UIcon name="i-lucide-pin" class="size-4" />
      </span>
      <span class="pin-setting-copy">
        <strong>置顶文章</strong>
        <small>开启后会优先显示在首页、文章列表和精选入口。</small>
      </span>
      <span class="pin-setting-state">{{ isPinned ? '已置顶' : '未置顶' }}</span>
    </label>
  </UFormField>
  <UFormField label="分类">
    <div class="taxonomy-field">
      <div class="taxonomy-field-main">
        <select v-model.number="categoryId" class="admin-select w-full">
          <option :value="null">无分类</option>
          <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </div>
      <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-folder-plus" @click="$emit('openCategoryCreator')">新建</UButton>
    </div>
  </UFormField>
  <UFormField label="标签">
    <div class="taxonomy-field taxonomy-field-stacked">
      <div class="post-tag-picker" :class="{ 'is-empty': !tags.length }">
        <label v-for="item in tags" :key="item.id" class="admin-check-pill">
          <input v-model="tagIds" type="checkbox" :value="item.id" class="accent-slate-950" />
          {{ item.name }}
        </label>
        <p v-if="!tags.length" class="text-sm text-slate-500">暂无标签，可在这里直接新增。</p>
      </div>
      <UButton class="taxonomy-inline-action" color="neutral" variant="outline" size="sm" icon="i-lucide-tag" @click="$emit('openTagCreator')">新建标签</UButton>
    </div>
  </UFormField>
  <UFormField label="SEO 标题">
    <div class="ai-summary-field">
      <UInput v-model="seoTitle" class="w-full" />
      <div class="ai-summary-actions">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-sparkles"
          :loading="generatingSeoMeta"
          :disabled="pending"
          @click="$emit('generateSeoMeta')"
        >
          AI 生成 SEO
        </UButton>
        <span v-if="seoMetaGenerated" class="ai-summary-success">
          <UIcon name="i-lucide-check" class="size-4" />
          已填入 SEO
        </span>
      </div>
    </div>
  </UFormField>
  <UFormField label="SEO 描述">
    <UTextarea v-model="seoDescription" :rows="3" class="w-full" />
  </UFormField>
</template>

<script setup lang="ts">
import type { TaxonomyItem } from './post-form.types'

defineProps<{
  categories: TaxonomyItem[]
  tags: TaxonomyItem[]
  pending: boolean
  generatingSummary: boolean
  summaryGenerated: boolean
  uploadingCover: boolean
  coverUploaded: boolean
  coverUploadError: boolean
  generatingSeoMeta: boolean
  seoMetaGenerated: boolean
}>()

defineEmits<{
  generateSummary: []
  generateSeoMeta: []
  openGallery: []
  openCategoryCreator: []
  openTagCreator: []
  uploadCover: [event: Event]
}>()

const title = defineModel<string>('title', { required: true })
const slug = defineModel<string>('slug', { required: true })
const summary = defineModel<string>('summary', { required: true })
const cover = defineModel<string>('cover', { required: true })
const isPinned = defineModel<boolean>('isPinned', { required: true })
const categoryId = defineModel<number | null>('categoryId', { required: true })
const tagIds = defineModel<number[]>('tagIds', { required: true })
const seoTitle = defineModel<string>('seoTitle', { required: true })
const seoDescription = defineModel<string>('seoDescription', { required: true })

const coverInputRef = ref<HTMLInputElement | null>(null)
</script>

<style scoped>
.pin-setting-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.pin-setting-card:hover,
.pin-setting-card:focus-within {
  border-color: #c7d2fe;
  background: #ffffff;
  box-shadow: 0 10px 24px rgb(79 70 229 / 8%);
}

.pin-setting-card.is-active {
  border-color: #fbbf24;
  background: linear-gradient(135deg, #fffbeb, #fff7ed);
  box-shadow: 0 10px 26px rgb(245 158 11 / 12%);
}

.pin-setting-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.pin-setting-icon {
  display: grid;
  width: 2.1rem;
  height: 2.1rem;
  place-items: center;
  border-radius: 0.65rem;
  background: #eef2ff;
  color: #4f46e5;
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;
}

.pin-setting-card.is-active .pin-setting-icon {
  background: #f59e0b;
  color: #ffffff;
  transform: rotate(-12deg);
}

.pin-setting-copy {
  min-width: 0;
}

.pin-setting-copy strong,
.pin-setting-copy small {
  display: block;
}

.pin-setting-copy strong {
  color: #1e293b;
  font-size: 0.9rem;
  font-weight: 850;
}

.pin-setting-copy small {
  margin-top: 0.2rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.4;
}

.pin-setting-state {
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 850;
  line-height: 1;
  padding: 0.4rem 0.55rem;
  white-space: nowrap;
}

.pin-setting-card.is-active .pin-setting-state {
  background: #f59e0b;
  color: #ffffff;
}
</style>
