<template>
  <div class="admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <span class="admin-page-title-icon">
          <UIcon name="i-lucide-file-pen-line" class="size-5" />
        </span>
        <div class="admin-page-title-text">
          <p>Markdown Editor</p>
          <h1>{{ mode === 'create' ? '新建文章' : '编辑文章' }}</h1>
        </div>
      </div>
      <div class="admin-page-actions">
        <UButton color="neutral" variant="outline" icon="i-lucide-arrow-left" to="/admin/posts">返回</UButton>
        <UButton color="neutral" variant="outline" icon="i-lucide-save" :loading="pending" @click="save('DRAFT')">保存草稿</UButton>
        <UButton icon="i-lucide-send" :loading="pending" @click="save('PUBLISHED')">发布文章</UButton>
      </div>
    </div>

    <div class="post-editor-layout">
      <section class="admin-panel post-settings-panel">
        <div class="post-panel-title">
          <span>
            <UIcon name="i-lucide-settings-2" class="size-4" />
          </span>
          <div>
            <h2>文章设置</h2>
            <p>标题、分类、封面和 SEO 信息</p>
          </div>
        </div>
        <div class="post-settings-form">
        <PostBasicFields
          v-model:title="form.title"
          v-model:slug="form.slug"
          v-model:summary="form.summary"
          v-model:cover="form.cover"
          v-model:category-id="form.categoryId"
          v-model:tag-ids="form.tagIds"
          v-model:seo-title="form.seoTitle"
          v-model:seo-description="form.seoDescription"
          :categories="categories"
          :tags="tags"
          :pending="pending"
          :generating-summary="generatingSummary"
          :summary-generated="summaryGenerated"
          :uploading-cover="uploadingCover"
          :cover-uploaded="coverUploaded"
          :cover-upload-error="coverUploadError"
          :generating-seo-meta="generatingSeoMeta"
          :seo-meta-generated="seoMetaGenerated"
          @generate-summary="generateSummary"
          @generate-seo-meta="generateSeoMeta"
          @open-gallery="openGalleryPicker('cover')"
          @open-category-creator="openCategoryCreator"
          @open-tag-creator="openTagCreator"
          @upload-cover="uploadCover"
        />
        <PostSeoCheckPanel
          :result="seoCheckResult"
          :checking="checkingSeo"
          :generated="seoCheckGenerated"
          :pending="pending"
          @run="runSeoCheck"
          @apply-meta="applySeoCheckMeta"
        />
        <PostWritingAssistantPanel
          :result="writingAssistantResult"
          :generating="generatingWritingAssistant"
          :generated="writingAssistantGenerated"
          :pending="pending"
          @generate="generateWritingAssistantResult"
          @apply-summary="applyWritingSummary"
          @apply-seo="applyWritingSeo"
          @apply-category="applyWritingCategory"
          @apply-tags="applyWritingTags"
          @apply-title="applyWritingTitle"
        />
        <PostRelationsEditor
          v-if="mode === 'edit'"
          v-model="relationItems"
          :generating="generatingRelations"
          :generated="relationsGenerated"
          :pending="pending"
          @generate="generateRelations"
        />
        </div>
      </section>

      <PostMarkdownEditor
        v-model="form.content"
        @open-gallery="openGalleryPicker('content')"
        @upload-images="uploadImages"
      />
    </div>

    <PostGalleryPicker
      v-model:open="galleryPickerOpen"
      v-model:collection-filter="galleryCollectionFilter"
      v-model:search-query="gallerySearchQuery"
      :title="galleryPickerTitle"
      :description="galleryPickerDescription"
      :pending="galleryPending"
      :images="galleryImages"
      @refresh="refreshGallery"
      @select="selectGalleryImage"
    />

    <PostCategoryCreateModal
      v-model:open="categoryCreatorOpen"
      v-model:name="newCategory.name"
      v-model:slug="newCategory.slug"
      v-model:icon="newCategory.icon"
      :creating="creatingCategory"
      @submit="createCategory"
    />

    <PostTagCreateModal
      v-model:open="tagCreatorOpen"
      v-model:name="newTag.name"
      v-model:slug="newTag.slug"
      :creating="creatingTag"
      @submit="createTag"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  mode: 'create' | 'edit'
  postId?: number
}>()

const {
  pending,
  generatingSummary,
  summaryGenerated,
  generatingSeoMeta,
  seoMetaGenerated,
  generatingRelations,
  relationsGenerated,
  generatingWritingAssistant,
  writingAssistantGenerated,
  checkingSeo,
  seoCheckGenerated,
  uploadingCover,
  coverUploaded,
  coverUploadError,
  galleryPickerOpen,
  galleryCollectionFilter,
  gallerySearchQuery,
  categoryCreatorOpen,
  tagCreatorOpen,
  creatingCategory,
  creatingTag,
  form,
  newCategory,
  newTag,
  relationItems,
  writingAssistantResult,
  seoCheckResult,
  categories,
  tags,
  galleryImages,
  galleryPickerTitle,
  galleryPickerDescription,
  save,
  generateSummary,
  generateSeoMeta,
  generateRelations,
  generateWritingAssistantResult,
  runSeoCheck,
  applySeoCheckMeta,
  applyWritingSummary,
  applyWritingSeo,
  applyWritingCategory,
  applyWritingTags,
  applyWritingTitle,
  openCategoryCreator,
  openTagCreator,
  createCategory,
  createTag,
  uploadImages,
  uploadCover,
  openGalleryPicker,
  selectGalleryImage,
  refreshGallery,
  galleryPending
} = await usePostForm(props)
</script>

<style scoped>
.post-editor-layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: 21rem minmax(0, 1fr);
  align-items: start;
}

.post-settings-panel,
.post-editor-panel {
  min-width: 0;
}

.post-settings-panel {
  position: sticky;
  top: 4.75rem;
  align-self: start;
}

.post-panel-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-bottom: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.85rem 1rem;
}

.post-panel-title-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
}

.post-panel-title > span,
.post-panel-title-main > span {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.6rem;
  background: #eef2ff;
  color: #4f46e5;
}

.post-panel-title h2 {
  margin: 0;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 850;
}

.post-panel-title p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
}

.post-settings-form {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
}

.post-upload-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ai-summary-field {
  display: grid;
  gap: 0.55rem;
}

.ai-summary-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.ai-summary-success {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #059669;
  font-size: 0.8rem;
  font-weight: 750;
}

.post-relations-field {
  display: grid;
  gap: 0.65rem;
}

.post-relations-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.post-relations-hint {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.5;
}

.post-relations-list {
  display: grid;
  gap: 0.65rem;
}

.post-relation-item {
  display: grid;
  gap: 0.55rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.7rem;
}

.post-relation-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.post-relation-head strong {
  min-width: 0;
  color: #0f172a;
  font-size: 0.86rem;
  line-height: 1.45;
}

.post-relation-type {
  min-height: 2.2rem;
  font-size: 0.82rem;
}

.post-relation-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.post-relations-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.85rem;
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.5;
}

.writing-assistant-field {
  display: grid;
  gap: 0.65rem;
}

.seo-check-field {
  display: grid;
  gap: 0.65rem;
}

.writing-assistant-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.writing-assistant-result,
.seo-check-result {
  display: grid;
  gap: 0.65rem;
}

.writing-score {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #dbeafe;
  border-radius: 0.75rem;
  background: #eff6ff;
  padding: 0.7rem 0.8rem;
}

.writing-score span {
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 850;
}

.writing-score strong {
  color: #1e3a8a;
  font-size: 1.4rem;
  font-weight: 950;
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

.writing-assistant-result section,
.seo-check-result section {
  display: grid;
  gap: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.7rem;
}

.writing-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.writing-section-title h3 {
  margin: 0;
  color: #0f172a;
  font-size: 0.84rem;
  font-weight: 900;
}

.writing-assistant-result ul,
.seo-check-result ul {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.55;
  padding-left: 1rem;
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

.writing-apply-list,
.writing-title-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.writing-apply-list button,
.writing-title-list button {
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  background: white;
  color: #334155;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.35;
  padding: 0.38rem 0.6rem;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.writing-apply-list button:hover,
.writing-title-list button:hover {
  border-color: #94a3b8;
  background: #0f172a;
  color: white;
}

.cover-preview {
  display: grid;
  overflow: hidden;
  margin-top: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.cover-preview img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.cover-preview-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-top: 1px solid #e2e8f0;
  padding: 0.45rem 0.55rem;
}

.cover-preview-meta span {
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.taxonomy-field-main {
  min-width: 0;
  flex: 1;
}

.taxonomy-field-stacked {
  align-items: flex-start;
  flex-direction: column;
}

.taxonomy-inline-action {
  align-self: flex-start;
}

.post-tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.post-tag-picker.is-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.85rem;
}

.post-editor-panel {
  overflow: hidden;
}

.post-editor-title {
  justify-content: space-between;
}

.taxonomy-create-form {
  display: grid;
  gap: 0.9rem;
}

.taxonomy-icon-grid {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(5.75rem, 1fr));
}

.taxonomy-icon-option {
  display: inline-flex;
  min-width: 0;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.55rem;
  background: #fff;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 750;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.taxonomy-icon-option:hover,
.taxonomy-icon-option.is-selected {
  border-color: #818cf8;
  background: #eef2ff;
  color: #4338ca;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.1);
}

.taxonomy-icon-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 0.9rem;
}

.gallery-picker {
  display: grid;
  gap: 0.85rem;
}

.gallery-picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.gallery-picker-search {
  width: min(28rem, 100%);
}

.gallery-picker-filters {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.65rem;
  background: #f8fafc;
  padding: 0.2rem;
}

.gallery-picker-filters button {
  display: inline-flex;
  min-height: 1.9rem;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border-radius: 0.5rem;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0 0.55rem;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.gallery-picker-filters button:hover,
.gallery-picker-filters button.is-active {
  background: #fff;
  color: #4338ca;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.gallery-picker-grid {
  display: grid;
  max-height: min(62vh, 42rem);
  overflow-y: auto;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  padding-right: 0.15rem;
}

.gallery-picker-card {
  display: grid;
  overflow: hidden;
  grid-template-rows: auto minmax(3.75rem, auto);
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
  text-align: left;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.gallery-picker-card:hover {
  border-color: #a5b4fc;
  box-shadow: 0 12px 28px rgba(79, 70, 229, 0.12);
  transform: translateY(-1px);
}

.gallery-picker-thumb {
  display: block;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: #f8fafc;
}

.gallery-picker-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-picker-thumb.is-meme {
  background:
    linear-gradient(45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f8fafc 75%),
    linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
  background-color: #fff;
  background-position: 0 0, 0 0.5rem, 0.5rem -0.5rem, -0.5rem 0;
  background-size: 1rem 1rem;
}

.gallery-picker-thumb.is-meme img {
  object-fit: contain;
}

.gallery-picker-info {
  display: grid;
  min-width: 0;
  gap: 0.25rem;
  border-top: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.88);
  padding: 0.65rem 0.75rem;
  box-shadow: 0 -1px 0 rgba(15, 23, 42, 0.02);
}

.gallery-picker-info strong,
.gallery-picker-info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-picker-info strong {
  color: #020617;
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.25;
}

.gallery-picker-info small {
  color: #475569;
  font-size: 0.74rem;
  font-weight: 650;
  line-height: 1.25;
}

.gallery-picker-state {
  display: grid;
  min-height: 18rem;
  place-items: center;
  align-content: center;
  gap: 0.5rem;
  color: #94a3b8;
  text-align: center;
}

.gallery-picker-state strong {
  color: #64748b;
  font-size: 0.95rem;
}

.post-editor-panel :deep(.admin-md-editor) {
  min-height: calc(100vh - 12.25rem);
  border-radius: 0;
}

@media (max-width: 1180px) {
  .post-editor-layout {
    grid-template-columns: 1fr;
  }

  .post-settings-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .taxonomy-field {
    align-items: stretch;
    flex-direction: column;
  }

  .taxonomy-inline-action,
  .taxonomy-field-main {
    width: 100%;
  }

  .post-upload-row {
    align-items: stretch;
    flex-direction: column;
  }

  .ai-summary-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .post-editor-title,
  .gallery-picker-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .gallery-picker-search {
    width: 100%;
  }

  .gallery-picker-filters {
    width: 100%;
  }

  .gallery-picker-filters button {
    flex: 1;
  }

  .taxonomy-create-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}
</style>
