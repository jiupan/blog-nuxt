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
  listPath,
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
const mobileTab = ref<'writing' | 'settings'>('writing')
onBeforeUnmount(() => {
  focused.value = false
})
</script>

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
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
  align-items: start;
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
  align-self: start;
  min-width: 0;
  overflow: visible;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.post-panel-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0 0 16px;
  border: 0;
  background: transparent;
}
.post-panel-title > span {
  display: none;
}
.post-panel-title h2 {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 550;
}
.post-panel-title p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 11px;
}
.post-settings-form {
  display: grid;
  max-height: calc(100dvh - 205px);
  overflow-y: auto;
  padding: 0 2px 8px 0;
  gap: 12px;
  background: transparent;
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
@media (max-width: 1180px) {
  .post-settings-form {
    overflow: visible;
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
