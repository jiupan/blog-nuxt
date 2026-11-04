<template>
  <div
    class="workspace-page gallery-page"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <AdminPageActions>
      <UButton
        icon="i-lucide-upload"
        size="sm"
        :loading="Boolean(uploadingCollection)"
        @click="openActiveUpload"
      >
        上传{{ activeTab.uploadLabel }}
      </UButton>
    </AdminPageActions>
    <input
      ref="imageInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      class="hidden"
      @change="uploadFiles($event, 'images')"
    >
    <input
      ref="coverInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      class="hidden"
      @change="uploadFiles($event, 'covers')"
    >
    <input
      ref="memeInputRef"
      type="file"
      accept="image/*,.gif"
      multiple
      class="hidden"
      @change="uploadFiles($event, 'memes')"
    >
    <section
      class="workspace-panel gallery-library"
      :class="{ 'is-dragging': dragging }"
    >
      <nav
        class="workspace-tabs"
        aria-label="图库分类"
      >
        <button
          v-for="tab in galleryTabs"
          :key="tab.value"
          type="button"
          :class="{ 'is-active': activeCollection === tab.value }"
          :aria-pressed="activeCollection === tab.value"
          @click="activeCollection = tab.value"
        >
          <UIcon
            :name="tab.icon"
            class="size-4"
          />
          {{ tab.label }}
          <span>{{ tab.count }}</span>
        </button>
      </nav>
      <div class="workspace-filterbar">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="搜索文件名或地址…"
          aria-label="搜索图片"
          class="workspace-search"
        />
        <span class="workspace-count">{{ activeFilteredCount }} 张图片</span>
        <UButton
          v-if="searchQuery"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="searchQuery = ''"
        >
          清除
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="pending"
          size="sm"
          aria-label="刷新图库"
          @click="refresh()"
        />
      </div>
      <div
        v-if="activeCollection === 'memes'"
        class="gallery-groups"
      >
        <button
          v-for="group in memeGroupTabs"
          :key="group.id"
          type="button"
          :class="{ 'is-active': activeMemeGroup === group.id }"
          :aria-pressed="activeMemeGroup === group.id"
          @click="selectMemeGroup(group.id)"
        >
          {{ group.name }}
          <span>{{ group.count }}</span>
        </button>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-plus"
          @click="groupOpen = true"
        >
          新建分组
        </UButton>
        <UButton
          v-if="activeMemeGroup !== 'ungrouped'"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          :disabled="Boolean(activeMemeImages.length)"
          :title="activeMemeImages.length ? '请先移除分组内的图片' : '删除空分组'"
          @click="removeActiveGroup"
        >
          删除分组
        </UButton>
      </div>
      <div
        v-if="selectedPaths.length"
        class="gallery-selection"
      >
        <span>已选 {{ selectedPaths.length }} 张</span>
        <div>
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            @click="selectedPaths = []"
          >
            取消选择
          </UButton>
          <UButton
            size="sm"
            color="error"
            variant="soft"
            :loading="batchDeleting"
            @click="deleteSelected"
          >
            删除所选
          </UButton>
        </div>
      </div>
      <div
        v-if="uploadingCollection"
        class="gallery-progress"
        role="status"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 animate-spin"
        />
        <span>正在上传 {{ uploadDone }} / {{ uploadTotal }} 张</span>
        <progress
          :value="uploadDone"
          :max="uploadTotal"
        />
      </div>
      <div
        v-if="error"
        class="workspace-empty"
        role="alert"
      >
        <UIcon name="i-lucide-wifi-off" />
        <h3>图库加载失败</h3>
        <UButton
          color="neutral"
          variant="outline"
          @click="refresh()"
        >
          重新加载
        </UButton>
      </div>
      <div
        v-else-if="pending"
        class="workspace-loading"
        role="status"
        aria-label="正在加载图库"
      >
        <span
          v-for="i in 4"
          :key="i"
        />
      </div>
      <div
        v-else-if="activePageImages.length"
        class="gallery-grid"
      >
        <article
          v-for="image in activePageImages"
          :key="image.path"
          class="gallery-card"
          :class="{ 'is-selected': selectedPaths.includes(image.path) }"
        >
          <label class="gallery-select">
            <input
              v-model="selectedPaths"
              type="checkbox"
              :value="image.path"
              :aria-label="`选择${image.name}`"
            >
          </label>
          <button
            type="button"
            class="gallery-thumb"
            :class="{ 'is-meme': activeCollection === 'memes' }"
            :aria-label="`查看${image.name}`"
            @click="openImage(image)"
          >
            <img
              :src="image.url"
              :alt="image.name"
              loading="lazy"
            >
            <span class="gallery-preview-hint">
              <UIcon
                name="i-lucide-expand"
                class="size-4"
              />
              查看详情
            </span>
          </button>
          <div class="gallery-card-body">
            <button
              type="button"
              :title="image.name"
              @click="openImage(image)"
            >
              {{ image.name }}
            </button>
            <div>
              <span>{{ formatSize(image.size) }}</span>
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                :icon="copied === image.url ? 'i-lucide-check' : 'i-lucide-copy'"
                :aria-label="`复制${image.name}地址`"
                @click="copyUrl(image.url)"
              >
                {{ copied === image.url ? '已复制' : '复制' }}
              </UButton>
            </div>
          </div>
        </article>
      </div>
      <div
        v-else
        class="workspace-empty gallery-empty"
      >
        <UIcon :name="searchQuery ? 'i-lucide-search-x' : 'i-lucide-images'" />
        <h3>{{ searchQuery ? '没有找到匹配的图片' : '这里还没有图片' }}</h3>
        <p>
          {{
            searchQuery
              ? '试试其他文件名，或清除搜索。'
              : activeCollection === 'covers'
                ? '上传封面，文章未指定封面时会从这里选取。'
                : '拖入图片，或点击上传，为下一篇文章准备素材。'
          }}
        </p>
        <UButton
          v-if="searchQuery"
          color="neutral"
          variant="outline"
          @click="searchQuery = ''"
        >
          清除搜索
        </UButton>
        <UButton
          v-else
          variant="soft"
          icon="i-lucide-upload"
          @click="openActiveUpload"
        >
          上传{{ activeTab.uploadLabel }}
        </UButton>
      </div>
      <footer class="workspace-pagination">
        <span>可拖入图片上传，点击缩略图查看详情</span>
        <div>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-left"
            :disabled="activePage <= 1"
            aria-label="上一页"
            @click="activePage--"
          />
          <span>{{ activePage }} / {{ activeTotalPages }}</span>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-right"
            :disabled="activePage >= activeTotalPages"
            aria-label="下一页"
            @click="activePage++"
          />
        </div>
      </footer>
      <div
        v-if="dragging"
        class="gallery-drop-overlay"
      >
        <UIcon
          name="i-lucide-upload-cloud"
          class="size-9"
        />
        <strong>松开以上传到{{ activeTab.label }}</strong>
      </div>
    </section>
    <USlideover
      :open="Boolean(previewImage)"
      :title="previewImage?.name || '图片详情'"
      description="查看原图与文件信息，复制到文章中使用。"
      :ui="{ content: 'sm:max-w-lg' }"
      @update:open="
        (value) => {
          if (!value) previewImage = null
        }
      "
    >
      <template #body>
        <div
          v-if="previewImage"
          class="gallery-detail"
        >
          <div class="gallery-detail-preview">
            <img
              :src="previewImage.url"
              :alt="previewImage.name"
              @load="readDimensions"
            >
          </div>
          <dl>
            <div>
              <dt>文件大小</dt>
              <dd>{{ formatSize(previewImage.size) }}</dd>
            </div>
            <div>
              <dt>图片尺寸</dt>
              <dd>{{ dimensions.width ? `${dimensions.width} × ${dimensions.height}` : '读取中…' }}</dd>
            </div>
            <div>
              <dt>所属图库</dt>
              <dd>{{ activeTab.label }}</dd>
            </div>
            <div>
              <dt>上传 / 更新</dt>
              <dd>{{ formatDate(previewImage.updatedAt) }}</dd>
            </div>
          </dl>
          <UFormField label="图片地址">
            <UInput
              :model-value="previewImage.url"
              readonly
              class="w-full"
              @focus="($event.target as HTMLInputElement).select()"
            />
          </UFormField>
          <div class="gallery-detail-actions">
            <UButton
              :icon="copied === previewImage.url ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copyUrl(previewImage.url)"
            >
              {{ copied === previewImage.url ? '已复制地址' : '复制地址' }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              @click="copyUrl(`![${previewImage.name}](${previewImage.url})`)"
            >
              {{ copied.startsWith('![') ? '已复制 Markdown' : '复制 Markdown' }}
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              :to="previewImage.url"
              target="_blank"
              icon="i-lucide-external-link"
            >
              打开原图
            </UButton>
          </div>
          <div class="gallery-detail-delete">
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :loading="deletingPath === previewImage.path"
              @click="deleteImage(previewImage)"
            >
              删除图片
            </UButton>
            <small>已在文章中引用的图片，删除后会失效。</small>
          </div>
        </div>
      </template>
    </USlideover>
    <UModal
      v-model:open="groupOpen"
      title="新建表情包分组"
      description="用名称归类表情，方便写作时查找。"
    >
      <template #body>
        <form
          class="workspace-form"
          @submit.prevent="createGroup"
        >
          <UFormField
            label="分组名称"
            required
          >
            <UInput
              v-model="groupName"
              class="w-full"
              placeholder="例如：猫猫"
              required
            />
          </UFormField>
          <p
            v-if="groupError"
            class="workspace-inline-error"
            role="alert"
          >
            {{ groupError }}
          </p>
          <div class="workspace-form-actions">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              @click="groupOpen = false"
            >
              取消
            </UButton>
            <UButton
              type="submit"
              :loading="groupSaving"
              :disabled="!groupName.trim()"
            >
              创建分组
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
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
  memeGroup?: string
  updatedAt: string
}

type MemeGroup = { id: string; name: string }

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
const activeMemeGroup = ref('ungrouped')

const { data, refresh, error, pending } = await useFetch<{ data: GalleryImage[] }>('/api/admin/gallery')
const { data: memeGroupsData, refresh: refreshMemeGroups } = await useFetch<{ data: MemeGroup[] }>(
  '/api/admin/gallery/groups'
)

const images = computed(() => data.value?.data || [])
const regularImages = computed(() =>
  images.value.filter((image) => image.collection === 'images' || !image.collection)
)
const coverImages = computed(() => images.value.filter((image) => image.collection === 'covers'))
const memeImages = computed(() => images.value.filter((image) => image.collection === 'memes'))
const memeGroups = computed(() => memeGroupsData.value?.data || [])
const memeGroupTabs = computed(() => [
  { id: 'ungrouped', name: '未分组', count: memeImages.value.filter((image) => !image.memeGroup).length },
  ...memeGroups.value.map((group) => ({
    ...group,
    count: memeImages.value.filter((image) => image.memeGroup === group.id).length
  }))
])
const galleryTabs = computed(() => [
  {
    value: 'images' as const,
    label: '普通图片',
    uploadLabel: '图片',
    icon: 'i-lucide-image',
    count: regularImages.value.length
  },
  {
    value: 'covers' as const,
    label: '封面',
    uploadLabel: '封面',
    icon: 'i-lucide-panels-top-left',
    count: coverImages.value.length
  },
  {
    value: 'memes' as const,
    label: '表情包',
    uploadLabel: '表情包',
    icon: 'i-lucide-smile-plus',
    count: memeImages.value.length
  }
])
const activeTab = computed(
  () => galleryTabs.value.find((tab) => tab.value === activeCollection.value) || galleryTabs.value[0]!
)
const filteredRegularImages = computed(() => filterImages(regularImages.value))
const filteredCoverImages = computed(() => filterImages(coverImages.value))
const activeMemeImages = computed(() =>
  memeImages.value.filter((image) =>
    activeMemeGroup.value === 'ungrouped' ? !image.memeGroup : image.memeGroup === activeMemeGroup.value
  )
)
const filteredMemeImages = computed(() => filterImages(activeMemeImages.value))
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
  const input =
    activeCollection.value === 'covers'
      ? coverInputRef.value
      : activeCollection.value === 'memes'
        ? memeInputRef.value
        : imageInputRef.value
  input?.click()
}

function selectMemeGroup(id: string) {
  activeMemeGroup.value = id
  memePage.value = 1
}

async function createGroup() {
  const name = groupName.value.trim()
  if (!name || groupSaving.value) return
  groupSaving.value = true
  groupError.value = ''
  try {
    const result = await $fetch<{ data: MemeGroup }>('/api/admin/gallery/groups', {
      method: 'POST',
      body: { name }
    })
    await refreshMemeGroups()
    activeMemeGroup.value = result.data.id
    memePage.value = 1
    groupOpen.value = false
    groupName.value = ''
    toast.add({ title: '分组已创建', color: 'success' })
  } catch (error: unknown) {
    groupError.value = getApiErrorMessage(error)
  } finally {
    groupSaving.value = false
  }
}

async function removeActiveGroup() {
  const group = memeGroups.value.find((item) => item.id === activeMemeGroup.value)
  if (!group || !window.confirm(`确定删除空分组“${group.name}”吗？`)) return
  try {
    await $fetch('/api/admin/gallery/groups', { method: 'DELETE', body: { id: group.id } })
    activeMemeGroup.value = 'ungrouped'
    await refreshMemeGroups()
    toast.add({ title: '分组已删除', color: 'success' })
  } catch (error: unknown) {
    toast.add({ title: '删除失败', description: getErrorMessage(error), color: 'error' })
  }
}

async function uploadFiles(event: Event, collection: 'images' | 'covers' | 'memes') {
  const input = event.target as HTMLInputElement
  await uploadSelectedFiles(Array.from(input.files || []), collection)
  input.value = ''
}
async function handleDrop(event: DragEvent) {
  dragDepth = 0
  dragging.value = false
  await uploadSelectedFiles(Array.from(event.dataTransfer?.files || []), activeCollection.value)
}
async function uploadSelectedFiles(files: File[], collection: 'images' | 'covers' | 'memes') {
  if (!files.length || uploadingCollection.value) return
  uploadingCollection.value = collection
  uploadTotal.value = files.length
  uploadDone.value = 0
  const group = activeMemeGroup.value
  try {
    for (const file of files) {
      const body = new FormData()
      body.append('file', file)
      const groupQuery = group === 'ungrouped' ? '' : `&memeGroup=${encodeURIComponent(group)}`
      const url =
        collection === 'memes'
          ? `/api/admin/upload?purpose=meme${groupQuery}`
          : collection === 'covers'
            ? '/api/admin/upload?purpose=cover'
            : '/api/admin/upload'
      await $fetch(url, { method: 'POST', body })
      uploadDone.value++
    }
    if (activeCollection.value === collection && (collection !== 'memes' || activeMemeGroup.value === group)) {
      activePage.value = 1
    }
    toast.add({ title: '上传完成', description: `已上传 ${files.length} 张图片`, color: 'success' })
  } catch (error: unknown) {
    toast.add({
      title: '上传未全部完成',
      description: `已成功 ${uploadDone.value} 张。${getApiErrorMessage(error)}`,
      color: 'error'
    })
  } finally {
    await refresh()
    uploadingCollection.value = null
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
    copied.value = url
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = ''
    }, 2000)
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
    if (previewImage.value?.path === image.path) previewImage.value = null
    toast.add({ title: '图片已删除', color: 'success' })
  } catch (error: unknown) {
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

function getErrorMessage(error: unknown) {
  return getApiErrorMessage(error)
}
const activePage = computed({
  get: () =>
    activeCollection.value === 'covers'
      ? coverPage.value
      : activeCollection.value === 'memes'
        ? memePage.value
        : regularPage.value,
  set: (value) => {
    if (activeCollection.value === 'covers') coverPage.value = value
    else if (activeCollection.value === 'memes') memePage.value = value
    else regularPage.value = value
  }
})
const activeTotalPages = computed(() =>
  activeCollection.value === 'covers'
    ? coverTotalPages.value
    : activeCollection.value === 'memes'
      ? memeTotalPages.value
      : regularTotalPages.value
)
const activePageImages = computed(() =>
  activeCollection.value === 'covers'
    ? paginatedCoverImages.value
    : activeCollection.value === 'memes'
      ? paginatedMemeImages.value
      : paginatedRegularImages.value
)
const selectedPaths = ref<string[]>([])
const batchDeleting = ref(false)
const previewImage = ref<GalleryImage | null>(null)
const dimensions = reactive({ width: 0, height: 0 })
const copied = ref('')
let copyTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(copyTimer))
const dragging = ref(false)
let dragDepth = 0
function handleDragEnter(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragDepth++
  dragging.value = true
}
function handleDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  dragging.value = dragDepth > 0
}
const uploadDone = ref(0)
const uploadTotal = ref(0)
const groupOpen = ref(false)
const groupName = ref('')
const groupError = ref('')
const groupSaving = ref(false)
watch([activeCollection, activeMemeGroup, searchQuery], () => {
  selectedPaths.value = []
})
watch(images, (value) => {
  selectedPaths.value = selectedPaths.value.filter((path) => value.some((image) => image.path === path))
})
function openImage(image: GalleryImage) {
  dimensions.width = 0
  dimensions.height = 0
  copied.value = ''
  previewImage.value = image
}
function readDimensions(event: Event) {
  const image = event.target as HTMLImageElement
  dimensions.width = image.naturalWidth
  dimensions.height = image.naturalHeight
}
async function deleteSelected() {
  if (
    !selectedPaths.value.length ||
    batchDeleting.value ||
    !confirm(`删除选中的 ${selectedPaths.value.length} 张图片？已在文章中引用的图片会失效。`)
  )
    return
  batchDeleting.value = true
  const paths = [...selectedPaths.value]
  const results = await Promise.allSettled(
    paths.map((path) => $fetch('/api/admin/gallery', { method: 'DELETE', body: { path } }))
  )
  const failed = results.filter((result) => result.status === 'rejected').length
  selectedPaths.value = paths.filter((_, index) => results[index]?.status === 'rejected')
  toast.add({
    title: failed ? `${paths.length - failed} 张已删除，${failed} 张删除失败` : '所选图片已删除',
    color: failed ? 'error' : 'success'
  })
  await refresh()
  batchDeleting.value = false
}
</script>

<style scoped>
.gallery-library {
  position: relative;
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  padding: 24px;
}
.gallery-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  background: #fff;
}
.gallery-card.is-selected {
  border-color: var(--admin-accent);
  box-shadow: 0 0 0 1px var(--admin-accent);
}
.gallery-select {
  position: absolute;
  z-index: 2;
  top: 10px;
  left: 10px;
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 1px solid #e4e7ec;
  border-radius: 5px;
  background: #ffffffed;
}
.gallery-select input {
  width: 14px;
  height: 14px;
  accent-color: var(--admin-accent);
}
.gallery-thumb {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
  background: #f5f6f8;
  cursor: pointer;
}
.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.gallery-thumb.is-meme img {
  object-fit: contain;
  padding: 16px;
}
.gallery-preview-hint {
  position: absolute;
  inset: auto 8px 8px auto;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 9px;
  border-radius: 5px;
  background: #ffffffeb;
  color: #344054;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.15s;
}
.gallery-thumb:hover .gallery-preview-hint,
.gallery-thumb:focus-visible .gallery-preview-hint {
  opacity: 1;
}
.gallery-card-body {
  padding: 12px 14px 8px;
}
.gallery-card-body > button {
  display: block;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.gallery-card-body > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 7px;
  color: var(--admin-muted);
  font-size: 11px;
}
.gallery-groups {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--admin-line);
}
.gallery-groups > button:not([data-slot]) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 9px;
  border-radius: 5px;
  font-size: 12px;
  color: var(--admin-muted);
  cursor: pointer;
}
.gallery-groups > button.is-active {
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}
.gallery-groups button span {
  font-size: 10px;
}
.gallery-selection,
.gallery-progress {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--admin-line);
  background: #f8f6fc;
  color: var(--admin-accent);
  font-size: 12px;
}
.gallery-selection > div {
  display: flex;
  gap: 8px;
}
.gallery-progress {
  justify-content: flex-start;
  background: #fafbfc;
}
.gallery-progress progress {
  flex: 1;
  max-width: 180px;
  height: 5px;
  accent-color: var(--admin-accent);
}
.gallery-drop-overlay {
  position: absolute;
  z-index: 10;
  inset: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  border: 2px dashed var(--admin-accent);
  border-radius: 8px;
  background: #f5f2fdee;
  color: var(--admin-accent);
  pointer-events: none;
}
.gallery-detail {
  display: grid;
  gap: 24px;
}
.gallery-detail-preview {
  display: flex;
  height: clamp(160px, 28dvh, 240px);
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #f5f6f8;
}
.gallery-detail-preview img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.gallery-detail dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.gallery-detail dt {
  margin-bottom: 6px;
  color: #667085;
  font-size: 11px;
}
.gallery-detail dd {
  margin: 0;
  font-size: 13px;
}
.gallery-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.gallery-detail-delete {
  border-top: 1px solid #e4e7ec;
  padding-top: 18px;
}
.gallery-detail-delete small {
  display: block;
  margin-top: 8px;
  color: #667085;
  font-size: 11px;
}
@media (max-width: 850px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
    padding: 20px;
  }
}
@media (max-width: 500px) {
  .gallery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 14px;
  }
  .gallery-card-body {
    padding-inline: 10px;
  }
  .gallery-card-body > button {
    font-size: 11px;
  }
  .gallery-card-body > div {
    flex-wrap: wrap;
    gap: 2px;
  }
  .gallery-groups {
    padding-inline: 16px;
  }
}
</style>
