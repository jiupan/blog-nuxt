<template>
  <section class="admin-panel post-editor-panel">
    <div class="post-panel-title post-editor-title">
      <div class="post-panel-title-main">
        <span>
          <UIcon
            name="i-lucide-file-pen-line"
            class="size-4"
          />
        </span>
        <div>
          <h2>Markdown 工作区</h2>
          <p>编辑正文内容，支持图片上传</p>
        </div>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-images"
        @click="$emit('openGallery')"
      >
        插入图库图片
      </UButton>
    </div>
    <ClientOnly>
      <MdEditor
        v-model="content"
        class="admin-md-editor"
        placeholder="从这里开始记录…"
        :preview="false"
        :toolbars-exclude="['github', 'save']"
        @on-save="$emit('save')"
        @on-upload-img="handleUploadImages"
      />
    </ClientOnly>
  </section>
</template>

<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'

const content = defineModel<string>({ required: true })

const emit = defineEmits<{
  save: []
  openGallery: []
  uploadImages: [files: File[], callback: (urls: string[]) => void]
}>()

function handleUploadImages(files: File[], callback: (urls: string[]) => void) {
  emit('uploadImages', files, callback)
}
</script>

<style scoped>
.admin-panel.post-editor-panel {
  min-width: 0;
  overflow: hidden;
  border: 0;
  border-radius: 0;
}

.post-editor-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  border-bottom: 1px solid #eef2f7;
  background: #fff;
  padding: 12px 20px;
}

.post-panel-title-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
}

.post-panel-title-main h2 {
  margin: 0;
  color: #697386;
  font-size: 11px;
  font-weight: 450;
}

.post-panel-title-main > span,
.post-panel-title-main p {
  display: none;
}

:deep(.md-editor) {
  --md-color: #344054;
  --md-bk-color: #fff;
  --md-bk-color-outstand: #f8f9fb;
  --md-border-color: #e4e7ec;
  --md-border-hover-color: #b1a8cb;
  --md-theme-color: #6554c0;
  height: calc(100dvh - 365px);
  min-height: 460px;
}
:deep(.md-editor-input-wrapper) {
  padding: 12px;
  font-size: 14px;
  line-height: 1.9;
}
:deep(.cm-scroller) {
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Noto Sans SC Variable', monospace;
  line-height: 1.9;
}
:deep(.md-editor-preview) {
  font-family: 'Noto Sans SC Variable', sans-serif;
  font-size: 14px;
}

@media (max-width: 767px) {
  .post-editor-title {
    flex-direction: row;
    align-items: center;
    padding: 10px 14px;
  }
}
</style>
