<template>
  <section class="admin-panel post-editor-panel">
    <div class="post-panel-title post-editor-title">
      <div class="post-panel-title-main">
        <span>
          <UIcon name="i-lucide-file-pen-line" class="size-4" />
        </span>
        <div>
          <h2>Markdown 工作区</h2>
          <p>编辑正文内容，支持图片上传</p>
        </div>
      </div>
      <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-images" @click="$emit('openGallery')">插入图库图片</UButton>
    </div>
    <ClientOnly>
      <MdEditor
        v-model="content"
        class="admin-md-editor"
        :toolbars-exclude="['github']"
        @on-upload-img="handleUploadImages"
      />
    </ClientOnly>
  </section>
</template>

<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'

const content = defineModel<string>({ required: true })

const emit = defineEmits<{
  openGallery: []
  uploadImages: [files: File[], callback: (urls: string[]) => void]
}>()

function handleUploadImages(files: File[], callback: (urls: string[]) => void) {
  emit('uploadImages', files, callback)
}
</script>
