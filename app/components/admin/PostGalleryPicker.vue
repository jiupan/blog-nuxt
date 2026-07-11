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
  { value: 'images' as const, label: '普通图片', icon: 'i-lucide-image' },
  { value: 'covers' as const, label: '封面', icon: 'i-lucide-panels-top-left' },
  { value: 'memes' as const, label: '表情包', icon: 'i-lucide-smile' }
]

function collectionLabel(collection: GalleryImage['collection']) {
  if (collection === 'covers') return '封面'
  if (collection === 'memes') return '表情包'
  return '普通图片'
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
