<template>
  <div
    class="admin-page post-compose-page"
    :class="{ 'is-focused': focused, 'show-settings': mobileTab === 'settings' }"
  >
    <div
      v-if="loadError"
      class="workspace-error"
      role="alert"
    >
      <span>文章加载失败，请返回列表后重试。</span
      ><UButton
        :to="listPath"
        color="neutral"
        variant="outline"
        >返回文章列表</UButton
      >
    </div>
    <template v-else>
      <header class="compose-header">
        <div class="compose-context">
          <NuxtLink
            :to="listPath"
            class="compose-back"
            aria-label="返回文章列表"
            ><UIcon
              name="i-lucide-arrow-left"
              class="size-4"
          /></NuxtLink>
          <div>
            <h1>{{ mode === 'create' ? '新建文章' : '编辑文章' }}</h1>
            <span
              class="compose-save-state"
              role="status"
              ><span :class="{ 'is-dirty': isDirty }" />{{
                pending
                  ? '正在保存…'
                  : isDirty
                    ? '有未保存的修改'
                    : savedAt
                      ? `已保存于 ${savedAt}`
                      : mode === 'create'
                        ? '准备好后，保存第一份草稿'
                        : form.status === 'PUBLISHED'
                          ? '已发布'
                          : form.status === 'ARCHIVED'
                            ? '已归档，保存后将恢复'
                            : '草稿'
              }}</span
            >
          </div>
        </div>
        <div class="compose-actions">
          <UButton
            color="neutral"
            variant="ghost"
            :icon="focused ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
            :aria-label="focused ? '退出专注模式' : '进入专注模式'"
            :aria-pressed="focused"
            @click="focused = !focused"
          />
          <UButton
            v-if="form.status !== 'PUBLISHED'"
            color="neutral"
            variant="outline"
            :loading="pending"
            :disabled="pending"
            @click="save('DRAFT')"
            >保存草稿</UButton
          >
          <UButton
            icon="i-lucide-check"
            :loading="pending"
            :disabled="pending"
            @click="save('PUBLISHED')"
            >{{ form.status === 'PUBLISHED' ? '更新文章' : '发布文章' }}</UButton
          >
        </div>
      </header>
      <nav
        class="compose-mobile-tabs"
        aria-label="编辑区域"
      >
        <button
          type="button"
          :class="{ 'is-active': mobileTab === 'writing' }"
          :aria-pressed="mobileTab === 'writing'"
          @click="mobileTab = 'writing'"
        >
          <UIcon
            name="i-lucide-square-pen"
            class="size-4"
          />正文</button
        ><button
          type="button"
          :class="{ 'is-active': mobileTab === 'settings' }"
          :aria-pressed="mobileTab === 'settings'"
          @click="mobileTab = 'settings'"
        >
          <UIcon
            name="i-lucide-settings-2"
            class="size-4"
          />文章设置
        </button>
      </nav>

      <div class="post-editor-layout">
        <div class="post-writing-area">
          <div class="compose-title-area">
            <label for="post-title">文章标题</label
            ><textarea
              id="post-title"
              v-model="form.title"
              rows="1"
              placeholder="给这篇文章起个标题…"
              maxlength="200"
              autocomplete="off"
            />
            <div class="compose-document-meta">
              <span>{{ form.content.replace(/\s/g, '').length.toLocaleString('zh-CN') }} 字符</span
              ><span>Markdown</span
              ><span
                >约 {{ Math.max(1, Math.ceil(form.content.replace(/\s/g, '').length / 400)) }} 分钟阅读</span
              >
            </div>
          </div>
          <PostMarkdownEditor
            v-model="form.content"
            @open-gallery="openGalleryPicker('content')"
            @upload-images="uploadImages"
            @save="save(form.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')"
          />
        </div>
        <section class="admin-panel post-settings-panel">
          <div class="post-panel-title">
            <span>
              <UIcon
                name="i-lucide-settings-2"
                class="size-4"
              />
            </span>
            <div>
              <h2>文章设置</h2>
              <p>完善信息，让内容更容易被发现。</p>
            </div>
          </div>
          <div class="post-settings-form">
            <PostBasicFields
              v-model:title="form.title"
              v-model:slug="form.slug"
              v-model:summary="form.summary"
              v-model:cover="form.cover"
              v-model:is-pinned="form.isPinned"
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
            <PostKnowledgePanel
              v-if="mode === 'edit'"
              :document="knowledgeDocument"
              :pending="knowledgePending"
              @set-enabled="setKnowledgeEnabled"
              @sync="syncKnowledge"
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
    </template>
  </div>
</template>

<script setup lang="ts">
import PostBasicFields from './PostBasicFields.vue'
import PostCategoryCreateModal from './PostCategoryCreateModal.vue'
import PostGalleryPicker from './PostGalleryPicker.vue'
import PostMarkdownEditor from './PostMarkdownEditor.vue'
import PostKnowledgePanel from './PostKnowledgePanel.vue'
import PostRelationsEditor from './PostRelationsEditor.vue'
import PostSeoCheckPanel from './PostSeoCheckPanel.vue'
import PostTagCreateModal from './PostTagCreateModal.vue'
import PostWritingAssistantPanel from './PostWritingAssistantPanel.vue'

const props = defineProps<{
  mode: 'create' | 'edit'
  postId?: number
}>()

const {
  pending,
  loadError,
  isDirty,
  savedAt,
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
  knowledgePending,
  knowledgeDocument,
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
  setKnowledgeEnabled,
  syncKnowledge,
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
const focused = useState('admin-editor-focused', () => false)
const listPath = useState('admin-post-list-path', () => '/admin/posts')
const mobileTab = ref<'writing' | 'settings'>('writing')
onBeforeRouteLeave(() => !isDirty.value || window.confirm('有尚未保存的修改，确定离开编辑器吗？'))
function beforeUnload(event: BeforeUnloadEvent) {
  if (isDirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  focused.value = false
})
</script>

<style>
.post-editor-layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: 23rem minmax(0, 1fr);
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
  overflow: hidden;
  border-color: #e5eaf2;
  box-shadow: 0 12px 32px rgb(15 23 42 / 6%);
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
  max-height: calc(100vh - 9.25rem);
  overflow-y: auto;
  gap: 0.7rem;
  padding: 0.75rem;
  background: #f8fafc;
  scrollbar-color: #cbd5e1 transparent;
  scrollbar-width: thin;
}

.post-settings-form::-webkit-scrollbar {
  width: 6px;
}

.post-settings-form::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #cbd5e1;
}

.post-setting-tool {
  overflow: hidden;
  border: 1px solid #e5eaf2;
  border-radius: 0.85rem;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 3%);
}

.post-setting-tool-summary {
  display: flex;
  min-height: 3.75rem;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  list-style: none;
  transition: background 160ms ease;
}

.post-setting-tool-summary::-webkit-details-marker {
  display: none;
}

.post-setting-tool-summary:hover {
  background: #fbfcfe;
}

.post-setting-tool-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.6rem;
  background: #eef2ff;
  color: #4f46e5;
}

.post-setting-tool-icon.is-orange {
  background: #ffedd5;
  color: #ea580c;
}

.post-setting-tool-icon.is-violet {
  background: #f3e8ff;
  color: #9333ea;
}

.post-setting-tool-icon.is-sky {
  background: #e0f2fe;
  color: #0284c7;
}

.post-setting-tool-copy {
  display: block;
  min-width: 0;
  flex: 1;
}

.post-setting-tool-copy strong,
.post-setting-tool-copy small {
  display: block;
}

.post-setting-tool-copy strong {
  color: #172033;
  font-size: 0.82rem;
  font-weight: 850;
}

.post-setting-tool-copy small {
  overflow: hidden;
  margin-top: 0.12rem;
  color: #7b8798;
  font-size: 0.69rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-setting-tool-count {
  display: grid;
  min-width: 1.35rem;
  height: 1.35rem;
  place-items: center;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.68rem;
  font-weight: 900;
}

.post-setting-tool-chevron {
  flex: 0 0 auto;
  color: #94a3b8;
  transition: transform 180ms ease;
}

.post-setting-tool[open] .post-setting-tool-chevron {
  transform: rotate(180deg);
}

.post-setting-tool[open] .post-setting-tool-summary {
  border-bottom: 1px solid #eef2f7;
  background: #fbfcfe;
}

.post-setting-tool-body {
  padding: 0.8rem;
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

.taxonomy-icon-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.65rem;
  border: 0;
  background: transparent;
  color: #6366f1;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.25rem 0;
}

.taxonomy-icon-toggle:hover {
  color: #4338ca;
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

  .post-settings-form {
    max-height: none;
    overflow: visible;
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

<style scoped>
.admin-page.post-compose-page {
  gap: 24px;
}
.compose-header {
  position: sticky;
  top: 64px;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: -12px;
  padding-block: 14px;
  background: #f5f6f8f5;
  backdrop-filter: blur(10px);
}
.compose-context {
  display: flex;
  align-items: center;
  gap: 14px;
}
.compose-back {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--admin-line);
  border-radius: 6px;
  background: #fff;
  color: var(--admin-muted);
}
.compose-context h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 550;
}
.compose-save-state {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  color: #697386;
  font-size: 11px;
}
.compose-save-state > span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #91a18c;
}
.compose-save-state > span.is-dirty {
  background: #c29b5a;
}
.compose-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.post-editor-layout {
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
}
.post-writing-area {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--admin-line);
  border-radius: 10px;
  background: #fff;
}
.compose-title-area {
  padding: 30px 28px 22px;
  border-bottom: 1px solid var(--admin-line);
}
.compose-title-area label {
  display: block;
  margin-bottom: 12px;
  color: #697386;
  font-size: 11px;
}
.compose-title-area textarea {
  width: 100%;
  min-height: 44px;
  field-sizing: content;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--admin-ink);
  font-family: inherit;
  font-size: 27px;
  line-height: 1.5;
  font-weight: 550;
  letter-spacing: -0.7px;
}
.compose-title-area textarea::placeholder {
  color: #a4a8b4;
}
.compose-document-meta {
  display: flex;
  gap: 16px;
  margin-top: 18px;
  color: #697386;
  font-size: 11px;
}
.post-settings-panel {
  position: sticky;
  top: 150px;
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.post-settings-panel > .post-panel-title {
  padding: 0 0 16px;
  border: 0;
  background: transparent;
}
.post-settings-panel > .post-panel-title > span {
  display: none;
}
.post-panel-title h2 {
  font-size: 13px;
  font-weight: 550;
}
.post-panel-title p {
  font-size: 11px;
}
.post-settings-form {
  max-height: calc(100dvh - 205px);
  padding: 0 2px 8px 0;
  gap: 12px;
  background: transparent;
}
.post-writing-area :deep(.post-editor-panel) {
  border: 0;
  border-radius: 0;
}
.post-writing-area :deep(.post-editor-title) {
  padding: 12px 20px;
  background: #fff;
}
.post-writing-area :deep(.post-panel-title-main > span),
.post-writing-area :deep(.post-panel-title-main p) {
  display: none;
}
.post-writing-area :deep(.post-panel-title-main h2) {
  font-size: 11px;
  font-weight: 450;
  color: #697386;
}
.post-writing-area :deep(.md-editor) {
  --md-color: #344054;
  --md-bk-color: #fff;
  --md-bk-color-outstand: #f8f9fb;
  --md-border-color: #e4e7ec;
  --md-border-hover-color: #b1a8cb;
  --md-theme-color: #6554c0;
  height: calc(100dvh - 365px);
  min-height: 460px;
}
.post-writing-area :deep(.md-editor-input-wrapper) {
  padding: 12px;
  font-size: 14px;
  line-height: 1.9;
}
.post-writing-area :deep(.cm-scroller) {
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Noto Sans SC Variable', monospace;
  line-height: 1.9;
}
.post-writing-area :deep(.md-editor-preview) {
  font-family: 'Noto Sans SC Variable', sans-serif;
  font-size: 14px;
}
.post-settings-form :deep(.post-setting-group),
.post-settings-form :deep(.post-setting-tool) {
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  box-shadow: none;
}
.post-settings-form :deep(.post-setting-tool-icon) {
  width: 24px;
  height: 24px;
  background: #f3f1f7;
  color: #8c80a5;
}
.post-settings-form :deep(.post-setting-tool-copy strong) {
  font-size: 12px;
  font-weight: 550;
}
.post-settings-form :deep(.post-setting-tool-copy small) {
  font-size: 11px;
}
.compose-mobile-tabs {
  display: none;
}
.is-focused .compose-header {
  top: 0;
}
.is-focused .post-editor-layout {
  grid-template-columns: minmax(0, 1fr);
}
.is-focused .post-settings-panel {
  display: none;
}
@media (max-width: 1200px) {
  .post-editor-layout {
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 18px;
  }
  .compose-title-area {
    padding: 24px 20px 18px;
  }
  .compose-title-area textarea {
    font-size: 24px;
  }
}
@media (max-width: 1050px) {
  .post-editor-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .compose-mobile-tabs {
    display: flex;
    gap: 20px;
    border-bottom: 1px solid var(--admin-line);
  }
  .compose-mobile-tabs button {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
    border-bottom: 2px solid transparent;
    color: var(--admin-muted);
    font-size: 12px;
    cursor: pointer;
  }
  .compose-mobile-tabs button.is-active {
    border-color: var(--admin-accent);
    color: var(--admin-accent);
  }
  .post-settings-panel {
    display: none;
    position: static;
  }
  .show-settings .post-settings-panel {
    display: block;
  }
  .show-settings .post-writing-area {
    display: none;
  }
  .is-focused .compose-mobile-tabs {
    display: none;
  }
  .is-focused .post-writing-area {
    display: block;
  }
  .is-focused .post-settings-panel {
    display: none;
  }
  .post-settings-form {
    max-height: none;
    overflow: visible;
  }
}
@media (max-width: 767px) {
  .compose-header {
    top: 56px;
    margin-top: -14px;
    flex-wrap: wrap;
  }
  .compose-actions {
    margin-left: auto;
  }
  .compose-context {
    gap: 8px;
  }
  .compose-context h1 {
    font-size: 14px;
  }
  .compose-save-state {
    font-size: 9px;
  }
  .compose-actions > button {
    font-size: 11px;
  }
  .compose-title-area textarea {
    font-size: 23px;
  }
  .compose-title-area {
    padding: 24px 18px 18px;
  }
  .compose-document-meta {
    gap: 12px;
  }
  .post-writing-area :deep(.post-editor-title) {
    flex-direction: row;
    align-items: center;
    padding: 10px 14px;
  }
}
@media (max-width: 359px) {
  .compose-context {
    flex: 1 0 100%;
  }
  .compose-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
