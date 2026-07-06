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
const categoryId = defineModel<number | null>('categoryId', { required: true })
const tagIds = defineModel<number[]>('tagIds', { required: true })
const seoTitle = defineModel<string>('seoTitle', { required: true })
const seoDescription = defineModel<string>('seoDescription', { required: true })

const coverInputRef = ref<HTMLInputElement | null>(null)
</script>
