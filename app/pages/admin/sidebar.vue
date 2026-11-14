<template>
  <div class="admin-page sidebar-admin-page">
    <AdminPageActions>
      <span v-if="form" class="admin-save-state" :class="{ 'is-dirty': isDirty }">
        {{ isDirty ? '有未保存修改' : saved ? '已保存并应用' : '已保存' }}
      </span>
      <UButton
        icon="i-lucide-check"
        size="sm"
        :loading="saving"
        :disabled="!form || !!compressionError || (!isDirty && !saving)"
        @click="save"
      >
        保存设置
      </UButton>
    </AdminPageActions>
    <div v-if="loadError" class="workspace-error" role="alert">
      <span>侧栏设置加载失败。</span>
      <UButton color="neutral" variant="outline" @click="reloadSettings()"> 重新加载 </UButton>
    </div>
    <div v-else-if="!form" class="workspace-loading" role="status" aria-label="正在加载侧栏设置">
      <span v-for="i in 3" :key="i" />
    </div>
    <div v-if="form" class="sidebar-editor-layout">
      <div class="sidebar-editor-main">
        <section class="admin-panel sidebar-config-card">
          <div class="config-heading">
            <span><UIcon name="i-lucide-user-round" /></span>
            <div>
              <h2>作者卡片</h2>
              <p>统一管理前台侧栏的头像与个人信息。</p>
            </div>
          </div>
          <div class="avatar-editor">
            <div class="avatar-preview">
              <video
                v-if="avatarIsVideo"
                :src="form.avatar"
                autoplay
                muted
                loop
                playsinline
                preload="metadata"
                aria-label="头像视频预览"
              />
              <img v-else-if="form.avatar" :src="form.avatar" alt="头像预览" >
              <span v-else>{{ authorInitial }}</span>
            </div>
            <div>
              <strong>作者头像</strong>
              <p>支持 JPG、PNG、WebP 图片，以及 5MB 以内的 MP4、WebM 循环视频。</p>
              <div class="avatar-actions">
                <input
                  ref="avatarInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.mp4,.webm"
                  class="hidden"
                  @change="uploadAvatar"
                >
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-upload"
                  :loading="uploading"
                  @click="avatarInput?.click()"
                >
                  {{ form.avatar ? '更换头像' : '上传头像' }}
                </UButton>
                <UButton
                  v-if="form.avatar"
                  size="sm"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  @click="form.avatar = ''"
                >
                  移除
                </UButton>
              </div>
              <small v-if="uploadError">{{ uploadError }}</small>
            </div>
          </div>
          <fieldset class="avatar-compression">
            <legend>动图头像压缩</legend>
            <p>保存设置后，重新上传原始 WebP 动图即可使用新参数。</p>
            <div class="field-grid">
              <label>
                <span>最长边（{{ animatedAvatarCompression.maxEdge.min }}–{{ animatedAvatarCompression.maxEdge.max }} px）</span>
                <UInput
                  :model-value="form.avatarMaxEdge"
                  type="number"
                  :min="animatedAvatarCompression.maxEdge.min"
                  :max="animatedAvatarCompression.maxEdge.max"
                  :step="1"
                  @update:model-value="form.avatarMaxEdge = String($event ?? '')"
                />
              </label>
              <label>
                <span>压缩质量（{{ animatedAvatarCompression.quality.min }}–{{ animatedAvatarCompression.quality.max }}）</span>
                <UInput
                  :model-value="form.avatarQuality"
                  type="number"
                  :min="animatedAvatarCompression.quality.min"
                  :max="animatedAvatarCompression.quality.max"
                  :step="1"
                  @update:model-value="form.avatarQuality = String($event ?? '')"
                />
              </label>
            </div>
            <small v-if="compressionError" class="compression-error" role="alert">{{ compressionError }}</small>
          </fieldset>
          <div class="field-grid">
            <label>
              <span>显示名称</span>
              <UInput v-model="form.name" icon="i-lucide-type" placeholder="留空则使用站点名称" />
            </label>
            <label>
              <span>身份文字</span>
              <UInput v-model="form.subtitle" icon="i-lucide-badge" placeholder="独立写作者" />
            </label>
            <label class="field-wide">
              <span>个人简介</span>
              <UTextarea v-model="form.description" :rows="3" placeholder="介绍你自己和博客内容" />
            </label>
            <label class="field-wide">
              <span>手写签名</span>
              <UInput
                v-model="form.signature"
                icon="i-lucide-signature"
                placeholder="留空则使用显示名称"
              />
            </label>
          </div>
        </section>

        <section class="admin-panel sidebar-config-card">
          <div class="config-heading">
            <span><UIcon name="i-lucide-list-ordered" /></span>
            <div>
              <h2>模块顺序</h2>
              <p>拖动手柄调整顺序，或关闭暂时不需要的模块。</p>
            </div>
          </div>
          <AdminSortableList
            :items="form.modules"
            :disabled="saving"
            class="module-list"
            @reorder="reorderModules"
          >
            <article
              v-for="(module, index) in form.modules"
              :key="module.key"
              class="module-item admin-sortable-item"
              :class="{ 'is-hidden': !module.visible }"
            >
              <AdminDragHandle :label="moduleMeta[module.key].label" :disabled="saving" />
              <span class="module-icon"><UIcon :name="moduleMeta[module.key].icon" /></span>
              <div>
                <strong>{{ moduleMeta[module.key].label }}</strong>
                <p>{{ moduleMeta[module.key].description }}</p>
              </div>
              <label class="visibility-toggle">
                <input v-model="module.visible" type="checkbox" >
                <span>{{ module.visible ? '显示' : '隐藏' }}</span>
              </label>
              <div class="order-actions">
                <button
                  type="button"
                  :disabled="index === 0"
                  :aria-label="`上移${moduleMeta[module.key].label}`"
                  @click="move(index, -1)"
                >
                  <UIcon name="i-lucide-chevron-up" />
                </button>
                <button
                  type="button"
                  :disabled="index === form.modules.length - 1"
                  :aria-label="`下移${moduleMeta[module.key].label}`"
                  @click="move(index, 1)"
                >
                  <UIcon name="i-lucide-chevron-down" />
                </button>
              </div>
            </article>
          </AdminSortableList>
        </section>
      </div>

      <aside class="sidebar-preview-panel">
        <div class="preview-label">
          <span>实时预览</span>
          <small>作者卡片</small>
        </div>
        <div class="author-preview-card">
          <span class="preview-decoration" />
          <div class="preview-avatar">
            <video
              v-if="avatarIsVideo"
              :src="form.avatar"
              autoplay
              muted
              loop
              playsinline
              preload="metadata"
              aria-label="头像视频预览"
            />
            <img v-else-if="form.avatar" :src="form.avatar" alt="" >
            <span v-else>{{ authorInitial }}</span>
          </div>
          <h2>{{ authorName }}</h2>
          <strong>{{ form.subtitle || '独立写作者' }}</strong>
          <p>{{ form.description || '个人博客' }}</p>
          <div class="preview-signature">{{ form.signature || authorName }}</div>
          <div class="preview-links">
            <span
              v-for="icon in ['i-lucide-sparkles', 'i-lucide-book-open', 'i-lucide-compass']"
              :key="icon"
            >
              <UIcon :name="icon" />
            </span>
          </div>
        </div>
        <p class="preview-hint">
          <UIcon name="i-lucide-info" />
          保存后所有使用公共侧栏的页面都会同步更新。
        </p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAdminUnsavedChanges } from '~/composables/useAdminUnsavedChanges'
import type { ApiResult } from '~~/types/api'
import { animatedAvatarCompression, type AdminSettingsPayload } from '~~/types/dto/settings'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

type ModuleKey = 'author' | 'featured' | 'categories' | 'tags'
type SidebarModule = { key: ModuleKey; visible: boolean }
type SidebarForm = {
  name: string
  subtitle: string
  description: string
  avatar: string
  avatarMaxEdge: string
  avatarQuality: string
  signature: string
  modules: SidebarModule[]
}

const defaultModules: SidebarModule[] = [
  { key: 'author', visible: true },
  { key: 'featured', visible: true },
  { key: 'categories', visible: true },
  { key: 'tags', visible: true }
]
const moduleMeta: Record<ModuleKey, { label: string; description: string; icon: string }> = {
  author: {
    label: '作者卡片',
    description: '头像、名称、简介和快捷链接',
    icon: 'i-lucide-user-round'
  },
  featured: {
    label: '精选阅读',
    description: '按传入数据展示推荐文章',
    icon: 'i-lucide-trending-up'
  },
  categories: { label: '探索话题', description: '展示文章分类与数量', icon: 'i-lucide-compass' },
  tags: { label: '热门标签', description: '展示标签及关联文章数', icon: 'i-lucide-tags' }
}

const {
  data,
  error: loadError,
  refresh: reloadSettings
} = await useFetch<ApiResult<AdminSettingsPayload>>('/api/admin/settings')
const form = ref<SidebarForm | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
const toast = useToast()

watch(
  data,
  (value) => {
    if (!value?.data || form.value) return
    form.value = {
      name: value.data.sidebar_author_name || '',
      subtitle: value.data.sidebar_author_subtitle || '独立写作者',
      description: value.data.sidebar_author_description || value.data.sidebar_description || '',
      avatar: value.data.sidebar_author_avatar || '',
      avatarMaxEdge: value.data.sidebar_avatar_webp_max_edge ?? String(animatedAvatarCompression.maxEdge.default),
      avatarQuality: value.data.sidebar_avatar_webp_quality ?? String(animatedAvatarCompression.quality.default),
      signature: value.data.sidebar_author_signature || '',
      modules: parseModules(value.data.sidebar_modules)
    }
  },
  { immediate: true }
)

const { isDirty, markSaved, snapshot } = useAdminUnsavedChanges(() => form.value)

const siteName = computed(() => data.value?.data.site_title || 'Jiupan Blog')
const authorName = computed(() => form.value?.name.trim() || siteName.value)
const authorInitial = computed(() => authorName.value.slice(0, 1).toUpperCase())
const avatarIsVideo = computed(() => isVideoUrl(form.value?.avatar || ''))
const compressionError = computed(() => {
  if (!form.value) return ''
  const { maxEdge, quality } = animatedAvatarCompression
  if (!isIntegerInRange(form.value.avatarMaxEdge, maxEdge.min, maxEdge.max)) {
    return `最长边请输入 ${maxEdge.min}–${maxEdge.max} 之间的整数。`
  }
  if (!isIntegerInRange(form.value.avatarQuality, quality.min, quality.max)) {
    return `压缩质量请输入 ${quality.min}–${quality.max} 之间的整数。`
  }
  return ''
})

function isIntegerInRange(value: string, min: number, max: number) {
  const number = Number(value)
  return Number.isInteger(number) && number >= min && number <= max
}

function parseModules(raw: string): SidebarModule[] {
  try {
    const parsed = JSON.parse(raw) as Array<Partial<SidebarModule>>
    const valid = parsed
      .filter((item) => item.key && item.key in moduleMeta)
      .map((item) => ({ key: item.key as ModuleKey, visible: item.visible !== false }))
    for (const item of defaultModules)
      if (!valid.some((module) => module.key === item.key)) valid.push({ ...item })
    return valid
  } catch {
    return defaultModules.map((item) => ({ ...item }))
  }
}

function reorderModules(modules: SidebarModule[]) {
  if (form.value) form.value.modules = modules
}

function move(index: number, direction: -1 | 1) {
  if (!form.value) return
  const target = index + direction
  if (target < 0 || target >= form.value.modules.length) return
  const modules = [...form.value.modules]
  ;[modules[index], modules[target]] = [modules[target]!, modules[index]!]
  form.value.modules = modules
}

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !form.value) return
  uploading.value = true
  uploadError.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<ApiResult<{ url: string; mediaType?: 'image' | 'video' }>>(
      '/api/admin/upload?purpose=avatar',
      { method: 'POST', body }
    )
    form.value.avatar = result.data.url
  } catch (error: unknown) {
    uploadError.value = getApiErrorMessage(error, { fallback: '头像上传失败，请更换文件后重试。' })
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function isVideoUrl(value: string) {
  return /\.(?:mp4|webm)(?:$|[?#])/i.test(value)
}

async function save() {
  if (!form.value || saving.value || compressionError.value) return
  const submittedSnapshot = snapshot()
  saving.value = true
  saved.value = false
  saveError.value = ''
  try {
    await $fetch('/api/admin/settings', {
      method: 'PUT',
      body: {
        sidebar_author_name: form.value.name.trim(),
        sidebar_author_subtitle: form.value.subtitle.trim(),
        sidebar_author_description: form.value.description.trim(),
        sidebar_author_avatar: form.value.avatar,
        sidebar_avatar_webp_max_edge: form.value.avatarMaxEdge,
        sidebar_avatar_webp_quality: form.value.avatarQuality,
        sidebar_author_signature: form.value.signature.trim(),
        sidebar_modules: JSON.stringify(form.value.modules)
      }
    })
    markSaved(submittedSnapshot)
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2200)
  } catch (error: unknown) {
    saveError.value = getApiErrorMessage(error, { fallback: '保存失败，请稍后重试。' })
    toast.add({ title: '侧栏设置保存失败', description: saveError.value, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.sidebar-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}
.sidebar-editor-main {
  display: grid;
  gap: 20px;
}
.avatar-compression {
  min-width: 0;
  margin: 0 0 24px;
}
.avatar-compression legend {
  font-size: 14px;
  font-weight: 600;
}
.avatar-compression p {
  margin: 4px 0 12px;
  color: var(--theme-text-muted);
  font-size: 12px;
}
.compression-error {
  display: block;
  margin-top: 8px;
  color: var(--theme-danger);
}
.sidebar-config-card {
  padding: 28px;
}
.config-heading {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 24px;
}
.config-heading > span,
.module-icon {
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #efedf8;
  color: #6554c0;
}
.config-heading > span {
  width: 42px;
  height: 42px;
}
.config-heading svg {
  width: 20px;
  height: 20px;
}
.config-heading h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 550;
}
.config-heading p,
.module-item p,
.avatar-editor p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}
.avatar-editor {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 22px;
  align-items: center;
  padding: 20px;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #f8fafc;
}
.avatar-preview,
.preview-avatar {
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(135deg, #f4e3d2, #d4a373);
  color: white;
  font-size: 34px;
  font-weight: 550;
}
.avatar-preview {
  width: 96px;
  height: 96px;
  border: 4px solid white;
  box-shadow: none;
}
.avatar-preview img,
.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.avatar-editor small {
  display: block;
  margin-top: 8px;
  color: #dc2626;
}
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 24px;
}
.field-grid label {
  display: grid;
  gap: 8px;
}
.field-grid label > span {
  font-size: 13px;
  font-weight: 550;
  color: #334155;
}
.field-wide {
  grid-column: 1/-1;
}
.module-list {
  display: grid;
  gap: 10px;
}
.module-item {
  display: grid;
  grid-template-columns: 20px 42px minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid #e4e7ec;
  border-radius: 14px;
  background: white;
  transition: 0.2s;
}
.module-item.is-hidden {
  background: #f8fafc;
  opacity: 0.68;
}
.module-grip {
  color: #697386;
}
.module-icon {
  width: 42px;
  height: 42px;
}
.module-icon svg {
  width: 19px;
  height: 19px;
}
.module-item strong {
  font-size: 14px;
}
.visibility-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}
.visibility-toggle input {
  accent-color: #6554c0;
}
.order-actions {
  display: flex;
  gap: 4px;
}
.order-actions button {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: white;
  color: #64748b;
}
.order-actions button:disabled {
  opacity: 0.3;
}
.order-actions svg {
  width: 15px;
}
.sidebar-preview-panel {
  position: sticky;
  top: 88px;
}
.preview-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 550;
}
.preview-label small {
  color: #697386;
}
.author-preview-card {
  position: relative;
  overflow: hidden;
  padding: 30px 24px 26px;
  border: 1px solid #f1ebe4;
  border-radius: 10px;
  background: white;
  box-shadow: none;
  text-align: center;
}
.preview-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 110px;
  height: 110px;
  border-radius: 0 24px 0 100%;
  background: #fff6ed;
}
.preview-avatar {
  position: relative;
  width: 104px;
  height: 104px;
  margin: 0 auto 20px;
  border: 4px solid white;
  box-shadow: none;
}
.author-preview-card h2 {
  position: relative;
  margin: 0;
  font-family: Georgia, serif;
  font-size: 23px;
}
.author-preview-card > strong {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.author-preview-card > p {
  margin: 15px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}
.preview-signature {
  margin-top: 14px;
  color: #a58d78;
  font:
    italic 24px 'Segoe Script',
    cursive;
  transform: rotate(-2deg);
}
.preview-links {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}
.preview-links > span {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
}
.preview-links svg {
  width: 17px;
}
.preview-hint {
  display: flex;
  gap: 7px;
  margin: 14px 4px 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}
.preview-hint svg {
  flex: 0 0 15px;
  width: 15px;
}
.save-success {
  color: #059669;
  font-size: 13px;
  font-weight: 700;
}
.save-error {
  max-width: 320px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}
@media (max-width: 1000px) {
  .sidebar-editor-layout {
    grid-template-columns: 1fr;
  }
  .sidebar-preview-panel {
    position: static;
    max-width: 360px;
  }
}
@media (max-width: 640px) {
  .sidebar-config-card {
    padding: 20px;
  }
  .avatar-editor {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .avatar-preview {
    margin: auto;
  }
  .avatar-actions {
    justify-content: center;
  }
  .field-grid {
    grid-template-columns: 1fr;
  }
  .field-wide {
    grid-column: auto;
  }
  .module-item {
    grid-template-columns: 18px 38px minmax(0, 1fr) auto;
  }
  .visibility-toggle {
    grid-column: 3;
  }
  .order-actions {
    grid-column: 4;
    grid-row: 1/3;
  }
  .module-icon {
    width: 38px;
    height: 38px;
  }
}
.avatar-preview video,
.preview-avatar video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

<style scoped>
.sidebar-editor-layout {
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) 290px;
}
.sidebar-config-card {
  padding: 24px;
}
.config-heading {
  gap: 10px;
  margin-bottom: 20px;
}
.config-heading > span {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #f1eef8;
  color: #8b7daf;
}
.config-heading h2 {
  font-size: 14px;
  font-weight: 550;
}
.config-heading p {
  font-size: 11px;
}
.avatar-editor {
  grid-template-columns: 72px 1fr;
  gap: 18px;
  padding: 18px;
  border-radius: 8px;
  background: #fafbfc;
}
.avatar-preview {
  width: 68px;
  height: 68px;
  border-width: 2px;
  box-shadow: none;
  font-size: 24px;
}
.avatar-editor p {
  font-size: 11px;
  line-height: 1.8;
}
.field-grid {
  gap: 18px;
}
.field-grid label > span {
  font-size: 12px;
  font-weight: 500;
}
.module-item {
  grid-template-columns: 32px minmax(0, 1fr) auto auto;
  padding: 14px 12px;
  gap: 10px;
  border-radius: 7px;
}
.module-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: #f5f3f9;
  color: #8b7daf;
}
.module-item strong {
  font-size: 12px;
  font-weight: 500;
}
.module-item p {
  font-size: 11px;
}
.visibility-toggle {
  font-size: 11px;
  font-weight: 450;
}
.sidebar-preview-panel {
  top: 88px;
}
.author-preview-card {
  border-radius: 10px;
  box-shadow: none;
}
.preview-label {
  font-weight: 500;
  font-size: 12px;
}
@media (max-width: 1100px) {
  .sidebar-editor-layout {
    grid-template-columns: 1fr;
  }
  .sidebar-preview-panel {
    position: static;
    max-width: 360px;
  }
}
@media (max-width: 640px) {
  .sidebar-config-card {
    padding: 18px;
  }
  .module-item {
    grid-template-columns: 30px minmax(0, 1fr) auto;
  }
  .visibility-toggle {
    grid-column: 2;
  }
  .order-actions {
    grid-column: 3;
    grid-row: 1/3;
  }
  .avatar-editor {
    grid-template-columns: 1fr;
  }
}
</style>

<style scoped>
.module-item {
  grid-template-columns: 26px 32px minmax(0, 1fr) auto auto;
}
@media (max-width: 640px) {
  .module-item {
    grid-template-columns: 24px 28px minmax(0, 1fr) auto;
    gap: 7px;
  }
  .visibility-toggle {
    grid-column: 3;
  }
  .order-actions {
    grid-column: 4;
    grid-row: 1/3;
  }
}
</style>
