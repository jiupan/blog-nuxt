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
      :aria-busy="pending || updatingImages || batchDeleting"
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
          :disabled="batchDeleting || updatingImages"
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
      <p class="gallery-purpose-note">{{ activeCollection === 'covers' ? '保存文章时，未指定封面会从启用的图片中随机选取并固定保存。停用只影响后续选取，不会改变已有文章。' : activeCollection === 'memes' ? '用于首页装饰及写作插图；这里的图片暂未接入评论表情选择器。调整分组不改变图片地址。' : '正文插图和手动指定的文章封面，默认不参与随机选取。' }}</p>
      <div class="workspace-filterbar">
        <UInput
          v-model="searchQuery"
          :disabled="batchDeleting || updatingImages"
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
          :disabled="batchDeleting || updatingImages"
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
          title="删除分组，图片保留并移到未分组"
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
          <template v-if="activeCollection === 'memes'">
            <USelect v-model="moveGroup" :items="memeGroupTabs.map(group => ({ label: group.name, value: group.id }))" class="min-w-48" aria-label="移动到分组" />
            <UButton size="sm" :loading="updatingImages" @click="updateImages(selectedPaths, { memeGroup: moveGroup === 'ungrouped' ? null : moveGroup })">移动分组</UButton>
          </template>
          <UButton v-else size="sm" :loading="updatingImages" @click="updateImages(selectedPaths, { inRandomPool: activeCollection !== 'covers', randomEnabled: true })">{{ activeCollection === 'covers' ? '移出随机池' : '加入随机池' }}</UButton>
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
      <div v-if="failedUploads.length" class="gallery-upload-failures" role="status">
        <strong>{{ failedUploads.length }} 张上传失败</strong>
        <p v-for="item in failedUploads" :key="item.file.name + item.file.size">{{ item.file.name }}：{{ item.error }}</p>
        <UButton size="sm" :disabled="Boolean(uploadingCollection)" @click="retryUploads">仅重试失败项</UButton>
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
        v-else-if="pending && !images.length"
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
        ref="galleryGrid"
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
            :class="{ 'is-meme': activeCollection === 'memes', 'is-cover': activeCollection === 'covers' }"
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
            <small v-if="activeCollection === 'covers'">{{ image.randomEnabled === false ? '已停用' : '参与随机选取' }}</small>
            <small v-if="image.type === 'image/gif'">GIF 动图</small>
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
        <span>每页三行，最多 {{ pageSize }} 张；可拖入图片上传，点击缩略图查看详情</span>
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
      description="查看图片用途、站内引用和文件信息。"
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
            <div><dt>文件格式</dt><dd>{{ previewImage.type }}</dd></div>
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
              <dd>{{ previewImage.collection === 'covers' ? '随机封面池' : previewImage.collection === 'memes' ? '表情素材' : '图片素材' }}</dd>
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
          <section class="gallery-usage" aria-label="站内引用">
            <strong>站内引用</strong>
            <p v-if="usageLoading">正在检查…</p>
            <p v-else-if="usageError">{{ usageError }}</p>
            <template v-else>
              <p v-if="!usage.posts.length && !usage.settings.length">未发现文章或站点设置中的直接引用。</p>
              <NuxtLink v-for="post in usage.posts" :key="post.id" :to="'/admin/posts/' + post.id">{{ post.title }} · {{ post.use }}</NuxtLink>
              <p v-for="key in usage.settings" :key="key">站点设置：{{ key }}</p>
            </template>
            <small>首页动态装饰和复制到站外的地址不计入此列表。</small>
          </section>
          <UButton v-if="previewImage.collection !== 'memes'" :loading="updatingImages" @click="updateImages([previewImage.path], previewImage.collection === 'covers' ? { randomEnabled: previewImage.randomEnabled === false } : { inRandomPool: true, randomEnabled: true })">{{ previewImage.collection === 'covers' ? (previewImage.randomEnabled === false ? '启用随机选取' : '停止随机选取') : '加入随机封面池' }}</UButton>
          <div class="gallery-detail-delete">
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              :loading="deletingPath === previewImage.path"
              :disabled="usageLoading || Boolean(usageError) || Boolean(usage.posts.length || usage.settings.length)"
              @click="deleteImage(previewImage)"
            >
              删除图片
            </UButton>
            <small>已被文章或站点设置直接引用的图片禁止删除；请先替换引用。</small>
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
import { uploadGalleryFiles, type FailedGalleryUpload } from '~/utils/gallery-upload'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

type GalleryImage = {
  randomEnabled?: boolean
  filename?: string
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

type FailedUpload = FailedGalleryUpload
const failedUploads = ref<FailedUpload[]>([])
const moveGroup = ref('ungrouped')
const updatingImages = ref(false)
const usageLoading = ref(false)
const usageError = ref('')
const usage = ref<{ posts: Array<{ id: number, title: string, use: string }>, settings: string[] }>({ posts: [], settings: [] })
async function loadUsage(path: string) {
  usageLoading.value = true
  usageError.value = ''
  usage.value = { posts: [], settings: [] }
  try {
    const result = await $fetch<{ data: typeof usage.value }>('/api/admin/gallery/usage', { query: { path } })
    if (previewImage.value?.path === path) usage.value = result.data
  } catch (error) {
    if (previewImage.value?.path === path) usageError.value = getApiErrorMessage(error)
  } finally { if (previewImage.value?.path === path) usageLoading.value = false }
}
async function updateImages(paths: string[], changes: { inRandomPool?: boolean, randomEnabled?: boolean, memeGroup?: string | null }) {
  if (updatingImages.value) return
  updatingImages.value = true
  try {
    await $fetch('/api/admin/gallery', { method: 'PUT', body: { paths: [...paths], changes } })
    await refresh()
    if (previewImage.value) previewImage.value = images.value.find(item => item.path === previewImage.value?.path) || null
    selectedPaths.value = []
    toast.add({ title: '图片用途已更新，图片地址保持不变', color: 'success' })
  } catch (error) { toast.add({ title: '更新失败', description: getApiErrorMessage(error), color: 'error' }) }
  finally { updatingImages.value = false }
}
async function retryUploads() {
  if (uploadingCollection.value) return
  const groups = new Map<string, FailedUpload[]>()
  for (const item of failedUploads.value) {
    const key = item.collection + ':' + item.group
    groups.set(key, [...(groups.get(key) || []), item])
  }
  for (const items of groups.values()) await uploadSelectedFiles(items.map(item => item.file), items[0]!.collection, items[0]!.group)
}

const toast = useToast()
const searchQuery = ref('')
const activeCollection = ref<'images' | 'covers' | 'memes'>('images')
const uploadingCollection = ref<'images' | 'covers' | 'memes' | null>(null)
const deletingPath = ref<string | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const coverInputRef = ref<HTMLInputElement | null>(null)
const memeInputRef = ref<HTMLInputElement | null>(null)
const galleryGrid = ref<HTMLElement | null>(null)
const gridColumns = ref(4)
const pageSize = computed(() => gridColumns.value * 3)
let gridObserver: ResizeObserver | undefined
watch(galleryGrid, grid => {
  gridObserver?.disconnect()
  if (!grid) return
  const measure = () => {
    const tracks = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(value => value.endsWith('px'))
    if (tracks.length) gridColumns.value = tracks.length
  }
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    gridObserver = new ResizeObserver(measure)
    gridObserver.observe(grid)
  }
}, { flush: 'post' })
watch(gridColumns, () => {
  regularPage.value = 1
  coverPage.value = 1
  memePage.value = 1
})
onBeforeUnmount(() => gridObserver?.disconnect())
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
    label: '图片素材',
    uploadLabel: '图片',
    icon: 'i-lucide-image',
    count: regularImages.value.length
  },
  {
    value: 'covers' as const,
    label: '随机封面池',
    uploadLabel: '封面',
    icon: 'i-lucide-panels-top-left',
    count: coverImages.value.length
  },
  {
    value: 'memes' as const,
    label: '表情素材',
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
  if (!group || !window.confirm(`删除分组“${group.name}”？分组内图片将保留并移到未分组。`)) return
  try {
    await $fetch('/api/admin/gallery/groups', { method: 'DELETE', body: { id: group.id } })
    activeMemeGroup.value = 'ungrouped'
    await Promise.all([refreshMemeGroups(), refresh()])
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
async function uploadSelectedFiles(files: File[], collection: 'images' | 'covers' | 'memes', targetGroup?: string) {
  if (!files.length || uploadingCollection.value) return
  uploadingCollection.value = collection
  uploadTotal.value = files.length
  uploadDone.value = 0
  const group = targetGroup ?? activeMemeGroup.value
  const remainingFailures = failedUploads.value.filter(item => !files.includes(item.file))
  try {
    const failures = await uploadGalleryFiles(files, {
      collection, group, upload: (url, body) => $fetch<unknown, '/api/admin/upload'>(url as '/api/admin/upload', { method: 'POST', body }),
      errorMessage: getApiErrorMessage, onProgress: processed => { uploadDone.value = processed }
    })
    if (activeCollection.value === collection && (collection !== 'memes' || activeMemeGroup.value === group) && files.length > failures.length) {
      searchQuery.value = ''
      activePage.value = 1
    }
    failedUploads.value = [...remainingFailures, ...failures]
    toast.add({ title: failures.length ? '部分图片上传失败' : '上传完成', description: `成功 ${files.length - failures.length} 张，失败 ${failures.length} 张`, color: failures.length ? 'error' : 'success' })
  } catch (error: unknown) {
    toast.add({
      title: '上传未全部完成',
      description: `已成功 ${uploadDone.value} 张。${getApiErrorMessage(error)}`,
      color: 'error'
    })
  } finally {
    try { await refresh() } finally { uploadingCollection.value = null }
  }
}

function filterImages(source: GalleryImage[]) {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return source
  return source.filter((image) => {
    return image.name.toLowerCase().includes(query) || image.url.toLowerCase().includes(query) || Boolean(image.filename?.toLowerCase().includes(query))
  })
}

function totalPages(total: number) {
  return Math.max(1, Math.ceil(total / pageSize.value))
}

function clampPage(page: number, total: number) {
  return Math.min(Math.max(page, 1), total)
}

function paginateImages(source: GalleryImage[], page: number) {
  const start = (clampPage(page, totalPages(source.length)) - 1) * pageSize.value
  return source.slice(start, start + pageSize.value)
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
  void loadUsage(image.path)
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
  if (!selectedPaths.value.length || batchDeleting.value) return
  batchDeleting.value = true
  const paths = [...selectedPaths.value]
  try {
    const references = await Promise.all(paths.map(path => $fetch<{ data: typeof usage.value }>('/api/admin/gallery/usage', { query: { path } })))
    const protectedPaths = paths.filter((_, index) => references[index]!.data.posts.length || references[index]!.data.settings.length)
    const deletable = paths.filter(path => !protectedPaths.includes(path))
    if (!deletable.length) {
      toast.add({ title: '所选图片均有站内引用，请先替换引用', color: 'error' })
      return
    }
    if (!confirm('删除 ' + deletable.length + ' 张图片？另有 ' + protectedPaths.length + ' 张存在站内引用，将保留。')) return
    const results = await Promise.allSettled(deletable.map(path => $fetch('/api/admin/gallery', { method: 'DELETE', body: { path } })))
    const failed = deletable.filter((_, index) => results[index]?.status === 'rejected')
    selectedPaths.value = [...protectedPaths, ...failed]
    toast.add({ title: '已删除 ' + (deletable.length - failed.length) + ' 张，保留引用图片 ' + protectedPaths.length + ' 张，失败 ' + failed.length + ' 张', color: failed.length ? 'error' : 'success' })
    await refresh()
    if (previewImage.value && !images.value.some(image => image.path === previewImage.value?.path)) previewImage.value = null
  } catch (error) {
    toast.add({ title: '批量删除未完成', description: getApiErrorMessage(error), color: 'error' })
  } finally { batchDeleting.value = false }
}
</script>

<style scoped>
.gallery-purpose-note, .gallery-upload-failures { padding: 14px 24px; color: var(--admin-muted); font-size: 13px; }
.gallery-upload-failures { border-bottom: 1px solid var(--admin-line); overflow-wrap: anywhere; }
.gallery-usage { display: grid; gap: 8px; font-size: 13px; }
.gallery-usage a { color: var(--admin-accent); }
.gallery-usage small { color: var(--admin-muted); }
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
.gallery-thumb.is-cover { aspect-ratio: 16/9; }
.gallery-thumb.is-meme { background: conic-gradient(#eef1f5 25%, #fff 0 50%, #eef1f5 0 75%, #fff 0) 0 0 / 16px 16px; }
.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.gallery-thumb.is-cover img { object-fit: cover; }
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
