<template>
  <section class="post-setting-group">
    <div class="post-setting-group-body">
      <UFormField label="摘要">
        <div class="ai-summary-field">
          <UTextarea
            v-model="summary"
            :rows="4"
            placeholder="简要说明文章内容和读者收获"
            class="w-full"
          />
          <div class="ai-summary-actions">
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-sparkles"
              :loading="generatingSummary"
              :disabled="pending"
              @click="$emit('generateSummary')"
            >
              AI 生成摘要
            </UButton>
            <span
              v-if="summaryGenerated"
              class="ai-summary-success"
            >
              <UIcon
                name="i-lucide-check"
                class="size-4"
              />
              已填入摘要
            </span>
          </div>
        </div>
      </UFormField>
    </div>
  </section>

  <section class="post-setting-group">
    <div class="post-setting-group-body">
      <UFormField label="文章封面">
        <div class="cover-field">
          <UInput
            v-model="cover"
            placeholder="/uploads/..."
            class="w-full"
          />
          <div class="cover-actions">
            <input
              ref="coverInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="$emit('uploadCover', $event)"
            >
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-upload"
              :loading="uploadingCover"
              @click="coverInputRef?.click()"
              >本地上传</UButton
            >
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-lucide-images"
              @click="$emit('openGallery')"
              >从图库选择</UButton
            >
            <span
              v-if="coverUploaded"
              class="cover-state is-success"
              ><UIcon
                name="i-lucide-check"
                class="size-4"
              />已上传</span
            >
            <span
              v-if="coverUploadError"
              class="cover-state is-error"
              ><UIcon
                name="i-lucide-alert-circle"
                class="size-4"
              />上传失败</span
            >
          </div>
        </div>
        <div
          v-if="cover"
          class="cover-preview"
        >
          <img
            :src="cover"
            :alt="title || '文章封面预览'"
            loading="lazy"
          >
          <div class="cover-preview-meta">
            <span>{{ cover }}</span>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="cover = ''"
              >移除</UButton
            >
          </div>
        </div>
      </UFormField>
      <UFormField label="展示策略">
        <label
          class="pin-setting-card"
          :class="{ 'is-active': isPinned }"
        >
          <input
            v-model="isPinned"
            type="checkbox"
            class="pin-setting-input"
          >
          <span
            class="pin-setting-icon"
            aria-hidden="true"
          >
            <UIcon
              name="i-lucide-pin"
              class="size-4"
            />
          </span>
          <span class="pin-setting-copy">
            <strong>置顶文章</strong>
            <small>优先显示在首页和文章列表。</small>
          </span>
          <span class="pin-setting-state">{{ isPinned ? '已开启' : '关闭' }}</span>
        </label>
      </UFormField>
      <UFormField label="分类">
        <div class="taxonomy-field">
          <div class="taxonomy-field-main">
            <select
              v-model.number="categoryId"
              class="admin-select w-full"
            >
              <option :value="null">无分类</option>
              <option
                v-for="item in categories"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select>
          </div>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-folder-plus"
            @click="$emit('openCategoryCreator')"
            >新建</UButton
          >
        </div>
      </UFormField>
      <UFormField label="标签">
        <div class="taxonomy-field taxonomy-field-stacked">
          <div
            class="post-tag-picker"
            :class="{ 'is-empty': !tags.length }"
          >
            <label
              v-for="item in tags"
              :key="item.id"
              class="admin-check-pill"
              :class="{ 'is-selected': tagIds.includes(item.id) }"
            >
              <input
                v-model="tagIds"
                type="checkbox"
                :value="item.id"
              >
              <UIcon
                v-if="tagIds.includes(item.id)"
                name="i-lucide-check"
                class="size-3"
              />
              <span>{{ item.name }}</span>
            </label>
            <p
              v-if="!tags.length"
              class="text-sm text-slate-500"
            >
              暂无标签，可在这里直接新增。
            </p>
          </div>
          <UButton
            class="taxonomy-inline-action"
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-tag"
            @click="$emit('openTagCreator')"
            >新建标签</UButton
          >
        </div>
      </UFormField>
    </div>
  </section>

  <details class="post-setting-group post-seo-fields">
    <summary>
      链接与搜索优化<UIcon
        name="i-lucide-chevron-down"
        class="size-4"
      />
    </summary>
    <div class="post-setting-group-body">
      <UFormField label="链接别名"
        ><UInput
          v-model="slug"
          placeholder="留空时自动生成链接码"
          class="w-full"
      /></UFormField>
      <UFormField label="SEO 标题">
        <div class="ai-summary-field">
          <UInput
            v-model="seoTitle"
            placeholder="留空时使用文章标题"
            class="w-full"
          />
          <div class="ai-summary-actions">
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-sparkles"
              :loading="generatingSeoMeta"
              :disabled="pending"
              @click="$emit('generateSeoMeta')"
            >
              AI 生成 SEO
            </UButton>
            <span
              v-if="seoMetaGenerated"
              class="ai-summary-success"
            >
              <UIcon
                name="i-lucide-check"
                class="size-4"
              />
              已填入 SEO
            </span>
          </div>
        </div>
      </UFormField>
      <UFormField label="SEO 描述">
        <UTextarea
          v-model="seoDescription"
          :rows="3"
          placeholder="建议控制在 150 字以内"
          class="w-full"
        />
      </UFormField>
    </div>
  </details>
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
.post-setting-group {
  overflow: hidden;
  border: 1px solid #e5eaf2;
  border-radius: 0.9rem;
  background: #ffffff;
  box-shadow: none;
}

.post-setting-group-body {
  display: grid;
  gap: 0.9rem;
  padding: 0.85rem;
}

.cover-field {
  display: grid;
  gap: 0.55rem;
}

.cover-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.cover-state {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.72rem;
  font-weight: 800;
}

.cover-state.is-success {
  color: #059669;
}

.cover-state.is-error {
  color: #dc2626;
}

.post-tag-picker {
  max-height: 9.5rem;
  overflow-y: auto;
  padding: 0.15rem 0.2rem 0.15rem 0;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

.admin-check-pill {
  display: inline-flex;
  min-height: 1.8rem;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.55rem;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #526074;
  cursor: pointer;
  font-size: 0.73rem;
  font-weight: 750;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.admin-check-pill:hover {
  border-color: #a5b4fc;
  background: #ffffff;
  color: #4338ca;
}

.admin-check-pill.is-selected {
  border-color: #a5b4fc;
  background: #eef2ff;
  box-shadow: inset 0 0 0 1px rgb(99 102 241 / 8%);
  color: #4338ca;
}

.admin-check-pill input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.pin-setting-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #fafbfc;
  cursor: pointer;
}
.pin-setting-card:hover,
.pin-setting-card:focus-within {
  border-color: #afa4cf;
}
.pin-setting-card:focus-within {
  outline: 2px solid #6554c0;
  outline-offset: 2px;
}
.pin-setting-card.is-active {
  border-color: #d9d3ea;
  background: #f7f5fb;
}
.pin-setting-input {
  width: 14px;
  height: 14px;
  accent-color: #6554c0;
}
.pin-setting-icon,
.pin-setting-state {
  display: none;
}
.pin-setting-copy {
  min-width: 0;
}
.pin-setting-copy strong {
  display: block;
  color: #344054;
  font-size: 12px;
  font-weight: 500;
}
.pin-setting-copy small {
  display: block;
  margin-top: 4px;
  color: #697386;
  font-size: 11px;
  line-height: 1.6;
}
.admin-check-pill:focus-within {
  outline: 2px solid #6554c0;
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .cover-actions > :deep(button) {
    flex: 1;
  }
}
</style>

<style scoped>
.post-seo-fields > summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 12px 14px;
  color: #596273;
  font-size: 12px;
  cursor: pointer;
  list-style: none;
}
.post-seo-fields > summary::-webkit-details-marker {
  display: none;
}
.post-seo-fields[open] > summary {
  border-bottom: 1px solid #e4e7ec;
}
.post-seo-fields[open] > summary .iconify {
  transform: rotate(180deg);
}
</style>
