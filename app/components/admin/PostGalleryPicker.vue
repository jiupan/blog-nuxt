<template>
  <UModal v-model:open="open" :title="title" :description="description" :ui="{ content: 'max-w-5xl' }">
    <template #body>
      <div class="gallery-picker">
        <div class="gallery-picker-toolbar">
          <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="搜索文件名或路径..." size="sm" class="gallery-picker-search" />
          <div class="gallery-picker-filters" aria-label="图库分类">
            <button
              v-for="option in galleryCollectionOptions"
              :key="option.value"
              type="button"
              :class="{ 'is-active': collectionFilter === option.value }"
              @click="collectionFilter = option.value"
            >
              <UIcon :name="option.icon" class="size-4" />
              <span>{{ option.label }}</span>
            </button>
          </div>
          <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-refresh-cw" :loading="pending" @click="$emit('refresh')">刷新</UButton>
        </div>

        <div v-if="pending" class="gallery-picker-state">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
          <span>正在加载图库...</span>
        </div>

        <div v-else-if="filteredImages.length" class="gallery-picker-grid">
          <button v-for="image in filteredImages" :key="image.path" type="button" class="gallery-picker-card" @click="$emit('select', image)">
            <span class="gallery-picker-thumb" :class="{ 'is-meme': image.collection === 'memes' }">
              <img :src="image.url" :alt="image.name" loading="lazy" />
            </span>
            <span class="gallery-picker-info">
              <strong :title="image.name">{{ image.name }}</strong>
              <small>{{ collectionLabel(image.collection) }} · {{ formatSize(image.size) }} · {{ formatDate(image.updatedAt) }}</small>
            </span>
          </button>
        </div>

        <div v-else class="gallery-picker-state">
          <UIcon name="i-lucide-image-off" class="size-8" />
          <strong>{{ searchQuery ? '没有匹配的图片' : '图库暂无图片' }}</strong>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { GalleryImage } from './post-form.types'

const props = defineProps<{
  title: string
  description: string
  pending: boolean
  images: GalleryImage[]
}>()

defineEmits<{
  refresh: []
  select: [image: GalleryImage]
}>()

const open = defineModel<boolean>('open', { required: true })
const collectionFilter = defineModel<GalleryImage['collection']>('collectionFilter', { required: true })
const searchQuery = defineModel<string>('searchQuery', { required: true })

const galleryCollectionOptions = [
  { value: 'images' as const, label: '图片素材', icon: 'i-lucide-image' },
  { value: 'covers' as const, label: '随机封面池', icon: 'i-lucide-panels-top-left' },
  { value: 'memes' as const, label: '表情素材', icon: 'i-lucide-smile' }
]

function collectionLabel(collection: GalleryImage['collection']) {
  if (collection === 'covers') return '随机封面池'
  if (collection === 'memes') return '表情素材'
  return '图片素材'
}

const filteredImages = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return props.images.filter((image) => {
    if (image.collection !== collectionFilter.value) return false
    if (!query) return true
    return image.name.toLowerCase().includes(query) || image.url.toLowerCase().includes(query)
  })
})

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
</script>

<style scoped>
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

@media (max-width: 640px) {
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
}
</style>
