<template>
  <div class="gallery-page">
    <section class="gallery-window">
      <header class="gallery-head">
        <div class="gallery-title">
          <span class="gallery-title-icon">
            <UIcon name="i-lucide-images" class="size-5" />
          </span>
          <div>
            <h1>图库</h1>
            <p>管理上传图片，复制地址后可直接用于文章内容。</p>
          </div>
        </div>
        <div class="gallery-actions">
          <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="搜索文件名或路径..." size="sm" class="gallery-search" />
          <input ref="fileInputRef" type="file" accept="image/*" multiple class="hidden" @change="uploadFiles" />
          <UButton icon="i-lucide-upload" :loading="uploading" @click="fileInputRef?.click()">上传图片</UButton>
        </div>
      </header>

      <div class="gallery-toolbar">
        <span>共 {{ images.length }} 张图片</span>
        <span v-if="filteredImages.length !== images.length">当前显示 {{ filteredImages.length }} 张</span>
      </div>

      <div class="gallery-scroll">
        <div v-if="filteredImages.length" class="gallery-grid">
          <article v-for="image in filteredImages" :key="image.path" class="gallery-card">
            <a :href="image.url" target="_blank" class="gallery-thumb">
              <img :src="image.url" :alt="image.name" loading="lazy" />
            </a>
            <div class="gallery-card-body">
              <strong :title="image.name">{{ image.name }}</strong>
              <small :title="image.url">{{ image.url }}</small>
              <div class="gallery-meta">
                <span>{{ formatSize(image.size) }}</span>
                <span>{{ formatDate(image.updatedAt) }}</span>
              </div>
            </div>
            <div class="gallery-card-actions">
              <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-copy" @click="copyUrl(image.url)">复制地址</UButton>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-external-link" :to="image.url" target="_blank" />
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :loading="deletingPath === image.path" @click="deleteImage(image)" />
            </div>
          </article>
        </div>

        <div v-else class="gallery-empty">
          <UIcon name="i-lucide-image-off" class="size-12" />
          <strong>{{ searchQuery ? '没有匹配的图片' : '暂无上传图片' }}</strong>
          <span>{{ searchQuery ? '换个关键词试试。' : '上传图片后可在文章里复用图片地址。' }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

type GalleryImage = {
  name: string
  path: string
  url: string
  size: number
  type: string
  updatedAt: string
}

const toast = useToast()
const searchQuery = ref('')
const uploading = ref(false)
const deletingPath = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const { data, refresh } = await useFetch<{ data: GalleryImage[] }>('/api/admin/gallery')

const images = computed(() => data.value?.data || [])
const filteredImages = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return images.value
  return images.value.filter((image) => {
    return image.name.toLowerCase().includes(query) || image.url.toLowerCase().includes(query)
  })
})

async function uploadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return

  uploading.value = true
  try {
    for (const file of files) {
      const body = new FormData()
      body.append('file', file)
      await $fetch('/api/admin/upload', { method: 'POST', body })
    }
    await refresh()
    toast.add({ title: '图片已上传', description: `已上传 ${files.length} 张图片`, color: 'success' })
  } catch (error: any) {
    toast.add({ title: '上传失败', description: getErrorMessage(error), color: 'error' })
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.add({ title: '图片地址已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败', description: '当前浏览器不允许访问剪贴板。', color: 'error' })
  }
}

async function deleteImage(image: GalleryImage) {
  if (!window.confirm(`确定删除图片“${image.name}”吗？已在文章中引用的图片会失效。`)) return

  deletingPath.value = image.path
  try {
    await $fetch('/api/admin/gallery', {
      method: 'DELETE',
      body: { path: image.path }
    })
    await refresh()
    toast.add({ title: '图片已删除', color: 'success' })
  } catch (error: any) {
    toast.add({ title: '删除失败', description: getErrorMessage(error), color: 'error' })
  } finally {
    deletingPath.value = null
  }
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

function getErrorMessage(error: any) {
  return error?.data?.message || error?.statusMessage || error?.message || '操作失败，请稍后重试。'
}
</script>

<style scoped>
.gallery-page {
  display: grid;
  min-height: calc(100vh - 1.75rem);
}

.gallery-window {
  display: flex;
  min-height: min(760px, calc(100vh - 1.75rem));
  overflow: hidden;
  flex-direction: column;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 20px 48px rgba(15, 23, 42, 0.08);
}

.gallery-head,
.gallery-title,
.gallery-actions,
.gallery-toolbar,
.gallery-card-actions,
.gallery-meta {
  display: flex;
  align-items: center;
}

.gallery-head {
  min-height: 3.75rem;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.75rem 1rem;
}

.gallery-title {
  min-width: 0;
  gap: 0.75rem;
}

.gallery-title-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.6rem;
  background: #eef2ff;
  color: #4f46e5;
}

.gallery-title h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.1rem;
  font-weight: 850;
}

.gallery-title p {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.gallery-actions {
  gap: 0.5rem;
}

.gallery-search {
  width: min(22rem, 34vw);
}

.gallery-toolbar {
  min-height: 2.75rem;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #eef2f7;
  padding: 0 1rem;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
}

.gallery-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem;
}

.gallery-grid {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
}

.gallery-card {
  overflow: hidden;
  border: 1px solid #eef2f7;
  border-radius: 0.85rem;
  background: #fff;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.gallery-card:hover {
  border-color: #c7d2fe;
  box-shadow: 0 14px 30px rgba(79, 70, 229, 0.1);
  transform: translateY(-1px);
}

.gallery-thumb {
  display: block;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: #f8fafc;
}

.gallery-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-card-body {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
}

.gallery-card-body strong,
.gallery-card-body small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-card-body strong {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 800;
}

.gallery-card-body small {
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.74rem;
}

.gallery-meta {
  justify-content: space-between;
  gap: 0.75rem;
  color: #64748b;
  font-size: 0.76rem;
}

.gallery-card-actions {
  justify-content: flex-end;
  gap: 0.25rem;
  border-top: 1px solid #f1f5f9;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.55rem 0.65rem;
}

.gallery-empty {
  display: grid;
  min-height: 28rem;
  place-items: center;
  align-content: center;
  gap: 0.5rem;
  color: #94a3b8;
  text-align: center;
}

.gallery-empty strong {
  color: #334155;
  font-size: 1rem;
}

.gallery-empty span {
  color: #64748b;
  font-size: 0.85rem;
}

@media (max-width: 760px) {
  .gallery-head,
  .gallery-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .gallery-search {
    width: 100%;
  }
}
</style>
