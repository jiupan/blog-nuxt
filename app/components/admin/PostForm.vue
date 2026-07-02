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
        <UFormField label="标题">
          <UInput v-model="form.title" placeholder="请输入文章标题" class="w-full" />
        </UFormField>
        <UFormField label="别名">
          <UInput v-model="form.slug" placeholder="留空时自动生成 8 位链接码" class="w-full" />
        </UFormField>
        <UFormField label="摘要">
          <UTextarea v-model="form.summary" :rows="4" class="w-full" />
        </UFormField>
        <UFormField label="封面 URL">
          <div class="post-upload-row">
            <UInput v-model="form.cover" placeholder="/uploads/..." class="flex-1" />
            <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="uploadCover" />
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploadingCover" @click="coverInputRef?.click()">上传</UButton>
            <UButton color="neutral" variant="outline" icon="i-lucide-images" @click="openGalleryPicker('cover')">图库</UButton>
            <span v-if="coverUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
            <span v-if="coverUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
          </div>
          <div v-if="form.cover" class="cover-preview">
            <img :src="form.cover" :alt="form.title || '文章封面预览'" loading="lazy" />
            <div class="cover-preview-meta">
              <span>{{ form.cover }}</span>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="form.cover = ''">移除</UButton>
            </div>
          </div>
        </UFormField>
        <UFormField label="分类">
          <select v-model.number="form.categoryId" class="admin-select w-full">
            <option :value="null">无分类</option>
            <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </UFormField>
        <UFormField label="标签">
          <div class="post-tag-picker" :class="{ 'is-empty': !tags.length }">
            <label v-for="item in tags" :key="item.id" class="admin-check-pill">
              <input v-model="form.tagIds" type="checkbox" :value="item.id" class="accent-slate-950" />
              {{ item.name }}
            </label>
            <p v-if="!tags.length" class="text-sm text-slate-500">暂无标签，可先到标签管理中新增。</p>
          </div>
        </UFormField>
        <UFormField label="SEO 标题">
          <UInput v-model="form.seoTitle" class="w-full" />
        </UFormField>
        <UFormField label="SEO 描述">
          <UTextarea v-model="form.seoDescription" :rows="3" class="w-full" />
        </UFormField>
        </div>
      </section>

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
          <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-images" @click="openGalleryPicker('content')">插入图库图片</UButton>
        </div>
        <ClientOnly>
          <MdEditor
            v-model="form.content"
            class="admin-md-editor"
            :toolbars-exclude="['github']"
            @on-upload-img="uploadImages"
          />
        </ClientOnly>
      </section>
    </div>

    <UModal v-model:open="galleryPickerOpen" :title="galleryPickerTitle" :description="galleryPickerDescription" :ui="{ content: 'max-w-5xl' }">
      <template #body>
        <div class="gallery-picker">
          <div class="gallery-picker-toolbar">
            <UInput v-model="gallerySearchQuery" icon="i-lucide-search" placeholder="搜索文件名或路径..." size="sm" class="gallery-picker-search" />
            <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-refresh-cw" :loading="galleryPending" @click="refreshGallery()">刷新</UButton>
          </div>

          <div v-if="galleryPending" class="gallery-picker-state">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
            <span>正在加载图库...</span>
          </div>

          <div v-else-if="filteredGalleryImages.length" class="gallery-picker-grid">
            <button v-for="image in filteredGalleryImages" :key="image.path" type="button" class="gallery-picker-card" @click="selectGalleryImage(image)">
              <span class="gallery-picker-thumb">
                <img :src="image.url" :alt="image.name" loading="lazy" />
              </span>
              <span class="gallery-picker-info">
                <strong :title="image.name">{{ image.name }}</strong>
                <small>{{ formatSize(image.size) }} · {{ formatDate(image.updatedAt) }}</small>
              </span>
            </button>
          </div>

          <div v-else class="gallery-picker-state">
            <UIcon name="i-lucide-image-off" class="size-8" />
            <strong>{{ gallerySearchQuery ? '没有匹配的图片' : '图库暂无图片' }}</strong>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'

const props = defineProps<{
  mode: 'create' | 'edit'
  postId?: number
}>()

const toast = useToast()
const pending = ref(false)
const uploadingCover = ref(false)
const coverUploaded = ref(false)
const coverUploadError = ref(false)
const coverInputRef = ref<HTMLInputElement | null>(null)
const galleryPickerOpen = ref(false)
const galleryPickerMode = ref<'cover' | 'content'>('cover')
const gallerySearchQuery = ref('')
const form = reactive({
  title: '',
  slug: '',
  summary: '',
  content: '# 标题\n\n开始写作...',
  cover: '',
  categoryId: null as number | null,
  tagIds: [] as number[],
  status: 'DRAFT',
  seoTitle: '',
  seoDescription: ''
})

const { data: categoryData } = await useFetch('/api/admin/categories')
const { data: tagData } = await useFetch('/api/admin/tags')
const { data: galleryData, pending: galleryPending, refresh: refreshGallery } = await useFetch<{ data: GalleryImage[] }>('/api/admin/gallery')
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const galleryImages = computed(() => galleryData.value?.data || [])
const filteredGalleryImages = computed(() => {
  const query = gallerySearchQuery.value.trim().toLowerCase()
  if (!query) return galleryImages.value
  return galleryImages.value.filter((image) => {
    return image.name.toLowerCase().includes(query) || image.url.toLowerCase().includes(query)
  })
})
const galleryPickerTitle = computed(() => galleryPickerMode.value === 'cover' ? '选择封面图' : '插入正文图片')
const galleryPickerDescription = computed(() => galleryPickerMode.value === 'cover' ? '从已上传图片中选择一张作为文章封面。' : '从已上传图片中选择一张插入到正文末尾。')

type GalleryImage = {
  name: string
  path: string
  url: string
  size: number
  type: string
  updatedAt: string
}

if (props.mode === 'edit' && props.postId) {
  const { data } = await useFetch(`/api/admin/posts/${props.postId}`)
  if (data.value?.data) {
    Object.assign(form, {
      title: data.value.data.title,
      slug: data.value.data.slug,
      summary: data.value.data.summary || '',
      content: data.value.data.content,
      cover: data.value.data.cover || '',
      categoryId: data.value.data.categoryId,
      tagIds: data.value.data.tagIds || [],
      status: data.value.data.status,
      seoTitle: data.value.data.seoTitle || '',
      seoDescription: data.value.data.seoDescription || ''
    })
  }
}

async function save(status: 'DRAFT' | 'PUBLISHED') {
  const localError = validateForm()

  if (localError) {
    toast.add({
      title: '无法保存',
      description: localError,
      color: 'error'
    })
    return
  }

  pending.value = true
  try {
    const body = {
      ...form,
      status,
      slug: form.slug
    }

    if (props.mode === 'create') {
      await $fetch('/api/admin/posts', { method: 'POST', body })
    } else {
      await $fetch(`/api/admin/posts/${props.postId}`, { method: 'PUT', body })
    }

    toast.add({
      title: successTitle(status),
      description: props.mode === 'create' ? '文章已创建，正在返回文章列表。' : '文章修改已保存。',
      color: 'success'
    })

    if (props.mode === 'create' || status === 'PUBLISHED') {
      await navigateTo('/admin/posts')
    }
  } catch (error: any) {
    toast.add({
      title: '保存失败',
      description: getSaveErrorMessage(error),
      color: 'error'
    })
  } finally {
    pending.value = false
  }
}

function successTitle(status: 'DRAFT' | 'PUBLISHED') {
  if (status === 'DRAFT') {
    return props.mode === 'create' ? '草稿已创建' : '草稿已保存'
  }

  return props.mode === 'create' ? '文章已发布' : '发布成功'
}

function validateForm() {
  if (!form.title.trim()) {
    return '请先填写文章标题。'
  }

  if (!form.content.trim()) {
    return '请先填写文章内容。'
  }

  if (props.mode === 'edit' && !form.slug.trim()) {
    return '文章别名不能为空。'
  }

  return ''
}

function getSaveErrorMessage(error: any) {
  const rawMessage = error?.data?.message || error?.statusMessage || error?.message || ''
  const zodMessage = parseZodMessage(rawMessage)

  if (zodMessage) {
    return zodMessage
  }

  if (rawMessage.includes('Unique constraint') || rawMessage.includes('P2002')) {
    return '文章别名已存在，请换一个别名后重试。'
  }

  if (rawMessage.includes('文章别名不能为空')) {
    return '文章别名不能为空。'
  }

  if (error?.statusCode === 401 || error?.status === 401) {
    return '登录状态已失效，请重新登录后再保存。'
  }

  return rawMessage || '保存时发生未知错误，请稍后重试。'
}

function parseZodMessage(message: string) {
  if (!message.trim().startsWith('[')) {
    return ''
  }

  try {
    const issues = JSON.parse(message)
    const firstIssue = Array.isArray(issues) ? issues[0] : null
    const field = firstIssue?.path?.[0]

    if (field === 'title') {
      return '请先填写文章标题。'
    }

    if (field === 'content') {
      return '请先填写文章内容。'
    }

    if (field === 'slug') {
      return '文章别名不能为空。'
    }

    if (field === 'categoryId') {
      return '分类数据格式不正确，请重新选择分类。'
    }

    if (field === 'tagIds') {
      return '标签数据格式不正确，请重新选择标签。'
    }

    return firstIssue?.message ? `表单内容不完整：${firstIssue.message}` : ''
  } catch {
    return ''
  }
}

async function uploadImages(files: File[], callback: (urls: string[]) => void) {
  const urls: string[] = []
  try {
    for (const file of files) {
      const data = new FormData()
      data.append('file', file)
      const result = await $fetch<{ data: { url: string } }>('/api/admin/upload', {
        method: 'POST',
        body: data
      })
      urls.push(result.data.url)
    }
    callback(urls)
    await refreshGallery()
  } catch (error: any) {
    toast.add({
      title: '图片上传失败',
      description: getUploadErrorMessage(error),
      color: 'error'
    })
  }
}

async function uploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingCover.value = true
  coverUploadError.value = false
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ data: { url: string } }>('/api/admin/upload', { method: 'POST', body })
    form.cover = result.data.url
    await refreshGallery()
    coverUploaded.value = true
    setTimeout(() => { coverUploaded.value = false }, 2000)
  } catch {
    coverUploadError.value = true
    setTimeout(() => { coverUploadError.value = false }, 3000)
  } finally {
    uploadingCover.value = false
    input.value = ''
  }
}

function openGalleryPicker(mode: 'cover' | 'content') {
  galleryPickerMode.value = mode
  gallerySearchQuery.value = ''
  galleryPickerOpen.value = true
  refreshGallery()
}

function selectGalleryImage(image: GalleryImage) {
  if (galleryPickerMode.value === 'cover') {
    form.cover = image.url
  } else {
    const imageMarkdown = `\n\n![${image.name}](${image.url})\n`
    form.content = `${form.content.trimEnd()}${imageMarkdown}`
  }

  galleryPickerOpen.value = false
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function getUploadErrorMessage(error: any) {
  return error?.data?.message || error?.statusMessage || error?.message || '图片处理失败，请稍后重试。'
}
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
  .post-upload-row {
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
}
</style>
