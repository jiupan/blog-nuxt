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
          <input ref="imageInputRef" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hidden" @change="uploadFiles($event, 'images')" />
          <input ref="coverInputRef" type="file" accept="image/jpeg,image/png,image/webp" multiple class="hidden" @change="uploadFiles($event, 'covers')" />
          <input ref="memeInputRef" type="file" accept="image/*,.gif" multiple class="hidden" @change="uploadFiles($event, 'memes')" />
          <UButton :icon="activeTab.icon" :loading="uploadingCollection === activeCollection" @click="openActiveUpload">上传{{ activeTab.uploadLabel }}</UButton>
        </div>
      </header>

      <div class="gallery-toolbar">
        <div class="gallery-tabs" role="tablist" aria-label="图库分类">
          <button
            v-for="tab in galleryTabs"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="activeCollection === tab.value"
            :class="{ 'is-active': activeCollection === tab.value }"
            @click="activeCollection = tab.value"
          >
            <UIcon :name="tab.icon" class="size-4" />
            <span>{{ tab.label }}</span>
            <small>{{ tab.count }}</small>
          </button>
        </div>
        <span v-if="searchQuery.trim()">当前显示 {{ activeFilteredCount }} 张</span>
      </div>

      <div class="gallery-scroll">
        <div class="gallery-columns">
          <section v-show="activeCollection === 'images'" class="gallery-column">
            <div class="gallery-column-head">
              <div>
                <h2>普通图片</h2>
                <p>文章封面和正文插图</p>
              </div>
              <span>{{ filteredRegularImages.length }}/{{ regularImages.length }}</span>
            </div>

            <template v-if="filteredRegularImages.length">
              <div class="gallery-grid">
                <article v-for="image in paginatedRegularImages" :key="image.path" class="gallery-card">
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

              <div v-if="regularTotalPages > 1" class="gallery-pagination">
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-chevron-left" :disabled="regularPage <= 1" @click="regularPage--">上一页</UButton>
                <span>第 {{ regularPage }} / {{ regularTotalPages }} 页</span>
                <UButton size="xs" color="neutral" variant="outline" trailing-icon="i-lucide-chevron-right" :disabled="regularPage >= regularTotalPages" @click="regularPage++">下一页</UButton>
              </div>
            </template>

            <div v-else class="gallery-empty">
              <UIcon name="i-lucide-image-off" class="size-10" />
              <strong>{{ searchQuery ? '没有匹配的普通图片' : '暂无普通图片' }}</strong>
              <span>{{ searchQuery ? '换个关键词试试。' : '上传后可作为封面或正文插图。' }}</span>
            </div>
          </section>

          <section v-show="activeCollection === 'covers'" class="gallery-column gallery-column-covers">
            <div class="gallery-column-head">
              <div>
                <h2>封面</h2>
                <p>文章未指定封面时，从这里随机选取</p>
              </div>
              <span>{{ filteredCoverImages.length }}/{{ coverImages.length }}</span>
            </div>

            <template v-if="filteredCoverImages.length">
              <div class="gallery-grid">
                <article v-for="image in paginatedCoverImages" :key="image.path" class="gallery-card">
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

              <div v-if="coverTotalPages > 1" class="gallery-pagination">
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-chevron-left" :disabled="coverPage <= 1" @click="coverPage--">上一页</UButton>
                <span>第 {{ coverPage }} / {{ coverTotalPages }} 页</span>
                <UButton size="xs" color="neutral" variant="outline" trailing-icon="i-lucide-chevron-right" :disabled="coverPage >= coverTotalPages" @click="coverPage++">下一页</UButton>
              </div>
            </template>

            <div v-else class="gallery-empty">
              <UIcon name="i-lucide-panels-top-left" class="size-10" />
              <strong>{{ searchQuery ? '没有匹配的封面' : '暂无封面' }}</strong>
              <span>{{ searchQuery ? '换个关键词试试。' : '上传后可作为文章的随机默认封面。' }}</span>
            </div>
          </section>

          <section v-show="activeCollection === 'memes'" class="gallery-column gallery-column-memes">
            <div class="gallery-column-head">
              <div>
                <h2>表情包</h2>
                <p>单独存放聊天、评论和文章里的表情图片</p>
              </div>
              <span>{{ filteredMemeImages.length }}/{{ memeImages.length }}</span>
            </div>

            <template v-if="filteredMemeImages.length">
              <div class="gallery-grid">
                <article v-for="image in paginatedMemeImages" :key="image.path" class="gallery-card">
                  <a :href="image.url" target="_blank" class="gallery-thumb gallery-thumb-meme">
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

              <div v-if="memeTotalPages > 1" class="gallery-pagination">
                <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-chevron-left" :disabled="memePage <= 1" @click="memePage--">上一页</UButton>
                <span>第 {{ memePage }} / {{ memeTotalPages }} 页</span>
                <UButton size="xs" color="neutral" variant="outline" trailing-icon="i-lucide-chevron-right" :disabled="memePage >= memeTotalPages" @click="memePage++">下一页</UButton>
              </div>
            </template>

            <div v-else class="gallery-empty">
              <UIcon name="i-lucide-smile" class="size-10" />
              <strong>{{ searchQuery ? '没有匹配的表情包' : '暂无表情包' }}</strong>
              <span>{{ searchQuery ? '换个关键词试试。' : '上传后会存到 /uploads/memes/ 目录。' }}</span>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

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
  collection?: 'images' | 'covers' | 'memes'
  updatedAt: string
}

const toast = useToast()
const searchQuery = ref('')
const activeCollection = ref<'images' | 'covers' | 'memes'>('images')
const uploadingCollection = ref<'images' | 'covers' | 'memes' | null>(null)
const deletingPath = ref<string | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const memeInputRef = ref<HTMLInputElement | null>(null)
const pageSize = 12
const regularPage = ref(1)
const coverPage = ref(1)
const memePage = ref(1)

const { data, refresh } = await useFetch<{ data: GalleryImage[] }>('/api/admin/gallery')

const images = computed(() => data.value?.data || [])
const regularImages = computed(() => images.value.filter((image) => image.collection === 'images' || !image.collection))
const coverImages = computed(() => images.value.filter((image) => image.collection === 'covers'))
const memeImages = computed(() => images.value.filter((image) => image.collection === 'memes'))
const galleryTabs = computed(() => [
  { value: 'images' as const, label: '普通图片', uploadLabel: '图片', icon: 'i-lucide-image', count: regularImages.value.length },
  { value: 'covers' as const, label: '封面', uploadLabel: '封面', icon: 'i-lucide-panels-top-left', count: coverImages.value.length },
  { value: 'memes' as const, label: '表情包', uploadLabel: '表情包', icon: 'i-lucide-smile-plus', count: memeImages.value.length }
])
const activeTab = computed(() => galleryTabs.value.find(tab => tab.value === activeCollection.value) || galleryTabs.value[0]!)
const filteredRegularImages = computed(() => filterImages(regularImages.value))
const filteredCoverImages = computed(() => filterImages(coverImages.value))
const filteredMemeImages = computed(() => filterImages(memeImages.value))
const activeFilteredCount = computed(() => {
  if (activeCollection.value === 'covers') return filteredCoverImages.value.length
  if (activeCollection.value === 'memes') return filteredMemeImages.value.length
  return filteredRegularImages.value.length
})
const regularTotalPages = computed(() => totalPages(filteredRegularImages.value.length))
const coverTotalPages = computed(() => totalPages(filteredCoverImages.value.length))
const memeTotalPages = computed(() => totalPages(filteredMemeImages.value.length))
const paginatedRegularImages = computed(() => paginateImages(filteredRegularImages.value, regularPage.value))
const paginatedCoverImages = computed(() => paginateImages(filteredCoverImages.value, coverPage.value))
const paginatedMemeImages = computed(() => paginateImages(filteredMemeImages.value, memePage.value))

watch(searchQuery, () => {
  regularPage.value = 1
  coverPage.value = 1
  memePage.value = 1
})

watch(regularTotalPages, (value) => {
  regularPage.value = clampPage(regularPage.value, value)
})

watch(coverTotalPages, (value) => {
  coverPage.value = clampPage(coverPage.value, value)
})

watch(memeTotalPages, (value) => {
  memePage.value = clampPage(memePage.value, value)
})

function openActiveUpload() {
  const input = activeCollection.value === 'covers'
    ? coverInputRef.value
    : activeCollection.value === 'memes'
      ? memeInputRef.value
      : imageInputRef.value
  input?.click()
}

async function uploadFiles(event: Event, collection: 'images' | 'covers' | 'memes') {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return

  uploadingCollection.value = collection
  try {
    for (const file of files) {
      const body = new FormData()
      body.append('file', file)
      const url = collection === 'memes' ? '/api/admin/upload?purpose=meme' : collection === 'covers' ? '/api/admin/upload?purpose=cover' : '/api/admin/upload'
      await $fetch(url, { method: 'POST', body })
    }
    await refresh()
    if (collection === 'memes') {
      memePage.value = 1
    } else if (collection === 'covers') {
      coverPage.value = 1
    } else {
      regularPage.value = 1
    }
    const collectionName = collection === 'memes' ? '表情包' : collection === 'covers' ? '封面' : '图片'
    toast.add({ title: `${collectionName}已上传`, description: `已上传 ${files.length} 张${collectionName}`, color: 'success' })
  } catch (error: any) {
    toast.add({ title: '上传失败', description: getErrorMessage(error), color: 'error' })
  } finally {
    uploadingCollection.value = null
    input.value = ''
  }
}

function filterImages(source: GalleryImage[]) {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return source
  return source.filter((image) => {
    return image.name.toLowerCase().includes(query) || image.url.toLowerCase().includes(query)
  })
}

function totalPages(total: number) {
  return Math.max(1, Math.ceil(total / pageSize))
}

function clampPage(page: number, total: number) {
  return Math.min(Math.max(page, 1), total)
}

function paginateImages(source: GalleryImage[], page: number) {
  const start = (clampPage(page, totalPages(source.length)) - 1) * pageSize
  return source.slice(start, start + pageSize)
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
  return getApiErrorMessage(error)
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

.gallery-tabs {
  display: flex;
  min-width: 0;
  align-self: stretch;
  gap: 0.25rem;
}

.gallery-tabs button {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #64748b;
  padding: 0 0.75rem;
  font: inherit;
  cursor: pointer;
}

.gallery-tabs button:hover,
.gallery-tabs button.is-active {
  border-bottom-color: #4f46e5;
  color: #4338ca;
}

.gallery-tabs button.is-active {
  background: #eef2ff;
}

.gallery-tabs small {
  border-radius: 999px;
  background: #e2e8f0;
  padding: 0.1rem 0.4rem;
  color: #475569;
  font-size: 0.7rem;
}

.gallery-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem;
}

.gallery-columns {
  display: block;
}

.gallery-column {
  display: grid;
  min-width: 0;
  gap: 0.875rem;
}

.gallery-column-head {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid #eef2f7;
  border-radius: 0.85rem;
  background: #f8fafc;
  padding: 0.75rem 0.85rem;
}

.gallery-column-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 850;
}

.gallery-column-head p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
}

.gallery-column-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.gallery-column-memes .gallery-column-head {
  background: #fff7ed;
}

.gallery-column-covers .gallery-column-head {
  background: #eff6ff;
}

.gallery-column-covers .gallery-column-head > span {
  background: #dbeafe;
  color: #1d4ed8;
}

.gallery-column-memes .gallery-column-head > span {
  background: #ffedd5;
  color: #c2410c;
}

.gallery-grid {
  display: grid;
  gap: 0.875rem;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
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

.gallery-thumb-meme {
  background:
    linear-gradient(45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f8fafc 75%),
    linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
  background-color: #fff;
  background-position: 0 0, 0 0.5rem, 0.5rem -0.5rem, -0.5rem 0;
  background-size: 1rem 1rem;
}

.gallery-thumb-meme img {
  object-fit: contain;
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

.gallery-pagination {
  display: flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border: 1px solid #eef2f7;
  border-radius: 0.75rem;
  background: #fff;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.45rem 0.6rem;
}

.gallery-pagination span {
  min-width: 5.5rem;
  text-align: center;
}

.gallery-empty {
  display: grid;
  min-height: 22rem;
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

  .gallery-toolbar {
    align-items: stretch;
    flex-direction: column;
    padding: 0.5rem;
  }

  .gallery-tabs {
    overflow-x: auto;
  }

  .gallery-tabs button {
    min-height: 2.5rem;
    flex: 0 0 auto;
  }

  .gallery-pagination {
    justify-content: space-between;
  }
}
</style>
