<template>
  <div class="workspace-page">
    <AdminPageActions>
      <UButton size="sm" icon="i-lucide-plus" :disabled="locked" @click="openEditor(undefined, $event)">收录链接</UButton>
    </AdminPageActions>

    <section class="workspace-panel">
      <div class="workspace-panel-heading">
        <div>
          <h2>网站导航</h2>
          <p>管理导航页收录的网站、在线工具和文章。</p>
        </div>
        <UButton to="/link" target="_blank" rel="noopener" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-up-right" size="sm" class="shrink-0">查看导航页</UButton>
      </div>

      <nav class="workspace-tabs" aria-label="网站导航管理">
        <button v-for="view in views" :key="view.value" type="button" :class="{ 'is-active': tab === view.value }" :aria-pressed="tab === view.value" :disabled="busy" @click="switchTab(view.value)">
          <UIcon :name="view.icon" class="size-4" aria-hidden="true" />{{ view.label }}
        </button>
      </nav>

      <div class="bookmark-body" :aria-busy="busy || status === 'pending'">
        <div v-if="loadError || failure" class="bookmark-feedback" role="alert">
          <p>{{ failure || '收录列表暂时没能加载。' }}</p>
          <UButton v-if="loadError || stale" size="sm" color="neutral" variant="outline" :loading="status === 'pending'" @click="reload">重新加载</UButton>
        </div>
        <p v-if="feedback" class="bookmark-success" role="status">{{ feedback }}</p>
        <p v-if="status === 'pending' && !payload" class="bookmark-muted" role="status">正在加载收录列表…</p>

        <template v-if="payload && !loadError">
          <div v-if="tab === 'items'">
            <div class="bookmark-toolbar">
              <UInput v-model="query" icon="i-lucide-search" aria-label="搜索链接" placeholder="搜索标题或网址" class="bookmark-search" />
              <USelect v-model="sectionFilter" :items="sectionOptions" aria-label="筛选分组" />
              <USelect v-model="statusFilter" :items="statusOptions" aria-label="筛选状态" />
            </div>
            <p class="bookmark-count bookmark-muted" role="status">显示 {{ filtered.length }} 条，共 {{ items.length }} 条</p>
            <ul v-if="filtered.length" class="bookmark-list">
              <li v-for="item in filtered" :key="item.id" class="bookmark-row">
                <div class="bookmark-copy">
                  <strong>{{ item.title }}</strong>
                  <small>{{ bookmarkSectionLabel(item) }} · {{ domain(item.url) }}</small>
                </div>
                <div class="bookmark-badges">
                  <UBadge :color="item.status === 'PUBLISHED' ? 'primary' : 'neutral'" variant="soft" size="sm">{{ statusLabels[item.status] }}</UBadge>
                  <UBadge v-if="item.status === 'PUBLISHED' && isSpotlight(item)" color="warning" variant="soft" size="sm">精选</UBadge>
                </div>
                <div class="bookmark-actions">
                  <UButton
                    v-if="item.status === 'PUBLISHED'"
                    :icon="isSpotlight(item) ? 'i-lucide-star-off' : 'i-lucide-star'"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :title="isSpotlight(item) ? '移出精选' : '加入精选'"
                    :aria-label="`${isSpotlight(item) ? '移出精选' : '加入精选'} ${item.title}`"
                    :disabled="locked"
                    @click="toggleSpotlight(item)"
                  />
                  <UButton size="sm" color="neutral" variant="outline" :disabled="locked" :aria-label="`编辑 ${item.title}`" @click="openEditor(item, $event)">编辑</UButton>
                </div>
              </li>
            </ul>
            <div v-else class="bookmark-empty">
              <p>{{ items.length ? '没有符合条件的链接。' : '还没有收录链接。' }}</p>
              <UButton v-if="items.length" size="sm" color="neutral" variant="outline" @click="resetFilters">清除筛选</UButton>
              <UButton v-else size="sm" icon="i-lucide-plus" :disabled="locked" @click="openEditor(undefined, $event)">收录第一条链接</UButton>
            </div>
          </div>

          <div v-else-if="tab === 'order'">
            <div class="bookmark-toolbar">
              <USelect :model-value="sortSection" :items="sortOptions" aria-label="选择排序分组" :disabled="busy" @update:model-value="value => { if (value) selectSortSection(value) }" />
              <div class="bookmark-actions">
                <UButton size="sm" color="neutral" variant="outline" :disabled="!orderDirty || busy" @click="order = null">撤销调整</UButton>
                <UButton size="sm" :loading="busy" :disabled="!orderDirty || stale" @click="saveOrder">保存顺序</UButton>
              </div>
            </div>
            <p class="bookmark-hint bookmark-muted">选择前台分组，拖动手柄或用上下箭头调整。保存后更新前台默认顺序。</p>
            <AdminSortableList v-if="sortItems.length" :key="sortSection" :items="sortItems" :disabled="locked" role="list" @reorder="setOrder">
              <div v-for="(item, index) in sortItems" :key="item.id" class="admin-sortable-item bookmark-row bookmark-sort-row" role="listitem">
                <span class="admin-drag-handle" aria-hidden="true"><UIcon name="i-lucide-grip-vertical" /></span>
                <div class="bookmark-copy"><strong>{{ item.title }}</strong><small>{{ domain(item.url) }}</small></div>
                <div class="admin-order-buttons">
                  <button type="button" :aria-label="`上移 ${item.title}`" :disabled="locked || index === 0" @click="moveItem(index, -1)"><UIcon name="i-lucide-chevron-up" /></button>
                  <button type="button" :aria-label="`下移 ${item.title}`" :disabled="locked || index === sortItems.length - 1" @click="moveItem(index, 1)"><UIcon name="i-lucide-chevron-down" /></button>
                </div>
              </div>
            </AdminSortableList>
            <p v-else class="bookmark-empty bookmark-muted">这个分组还没有已发布的链接。</p>
          </div>

          <form v-else class="bookmark-settings" @submit.prevent="saveSettings">
            <fieldset>
              <legend>页面文案</legend>
              <UFormField label="页面标题" required>
                <UInput v-model="settings.title" required maxlength="32" class="w-full" :disabled="busy" />
              </UFormField>
              <UFormField label="页面引言" help="显示在网站导航标题下方，留空时隐藏。">
                <UTextarea v-model="settings.intro" :rows="3" maxlength="120" class="w-full" :disabled="busy" />
              </UFormField>
            </fieldset>
            <fieldset>
              <legend>访客入口</legend>
              <USwitch v-model="settings.showRandom" label="显示「随机访问」" :disabled="busy" />
              <UFormField label="推荐与反馈邮箱" help="填写后显示「推荐站点」。邮箱也用于接收链接问题反馈。">
                <UInput v-model="settings.applicationEmail" type="email" maxlength="254" class="w-full" :disabled="busy" />
              </UFormField>
              <UFormField label="链接巡查记录" help="填写后公开「链接巡查记录」。留空时，访客可以通过已配置的邮箱报告问题。">
                <UInput v-model="settings.reportUrl" type="url" maxlength="2048" placeholder="https://" class="w-full" :disabled="busy" />
              </UFormField>
            </fieldset>
            <div class="bookmark-actions">
              <UButton type="submit" size="sm" :loading="busy" :disabled="!settingsDirty || locked">保存设置</UButton>
              <UButton type="button" size="sm" color="neutral" variant="ghost" :disabled="!settingsDirty || busy" @click="resetSettings">撤销修改</UButton>
            </div>
          </form>
        </template>
      </div>
    </section>

    <USlideover
      :open="!!editor"
      :title="editor?.id ? '编辑链接' : '收录链接'"
      :description="editor?.id ? editor.fields.title : '填写链接信息，再保存草稿或发布。'"
      :dismissible="!busy && !uploading"
      :close="!busy && !uploading"
      :ui="{ content: 'w-full max-w-full sm:max-w-xl motion-reduce:animate-none', footer: 'justify-between' }"
      :content="{ onCloseAutoFocus: restoreEditorFocus }"
      @update:open="closeEditor"
    >
      <template #body>
        <form v-if="editor" id="bookmark-editor-form" ref="editorForm" class="bookmark-editor" novalidate @submit.prevent="saveEditor('PUBLISHED')">
          <div v-if="failure" class="bookmark-feedback" role="alert">
            <p>{{ failure }}</p>
            <UButton v-if="stale" size="sm" color="neutral" variant="outline" :loading="status === 'pending'" @click="reload">重新加载</UButton>
          </div>
          <UFormField label="网址" required :error="fieldErrors.url">
            <UInput v-model="editor.fields.url" name="url" type="url" required maxlength="2048" placeholder="https://" class="w-full" :disabled="busy" @update:model-value="delete fieldErrors.url" />
          </UFormField>
          <UFormField label="标题" required :error="fieldErrors.title">
            <UInput v-model="editor.fields.title" name="title" required maxlength="80" class="w-full" :disabled="busy" @update:model-value="delete fieldErrors.title" />
          </UFormField>
          <div class="bookmark-fields">
            <UFormField label="类型" required>
              <USelect v-model="editor.fields.category" :items="categoryOptions" class="w-full" :disabled="busy" />
            </UFormField>
            <UFormField v-if="editor.fields.category === 'SITE'" label="网站分组">
              <USelect v-model="editor.fields.friendGroup" :items="groupOptions" class="w-full" :disabled="busy" />
            </UFormField>
          </div>
          <UFormField label="推荐语" help="发布时必填。写一句它适合谁，或为什么值得收藏。" :error="fieldErrors.note">
            <UTextarea v-model="editor.fields.note" name="note" :rows="3" maxlength="180" class="w-full" :disabled="busy" @update:model-value="delete fieldErrors.note" />
          </UFormField>
          <details class="bookmark-appearance" :open="appearanceOpen" @toggle="appearanceOpen = ($event.currentTarget as HTMLDetailsElement).open">
            <summary>卡片展示<span v-if="editor.fields.isSpotlight" class="bookmark-muted">将在精选区展示</span></summary>
            <div class="bookmark-appearance-body">
              <USwitch v-model="editor.fields.isSpotlight" label="加入精选" description="发布后显示在导航页顶部的精选区。" :disabled="busy" />
              <div v-for="image in imageFields" :key="image.key" class="bookmark-image">
                <div class="bookmark-thumbnail" :class="{ 'is-cover': image.key === 'cover' }">
                  <img v-if="editor.fields[image.key] && failedImages[image.key] !== editor.fields[image.key]" :src="editor.fields[image.key]" alt="" @error="failedImages[image.key] = editor?.fields[image.key]">
                  <UIcon v-else name="i-lucide-image" aria-hidden="true" />
                </div>
                <div>
                  <strong>{{ image.label }}</strong>
                  <p v-if="failedImages[image.key] && failedImages[image.key] === editor.fields[image.key]" class="bookmark-muted">图片加载失败</p>
                  <div class="bookmark-actions">
                    <UButton type="button" color="neutral" variant="outline" size="sm" :aria-label="`${editor.fields[image.key] ? '替换' : '上传'}${image.label}`" :disabled="busy || !!uploading || stale" :loading="uploading === image.key" @click="openImageInput(image.key)">{{ editor.fields[image.key] ? '替换' : '上传' }}</UButton>
                    <UButton v-if="editor.fields[image.key]" type="button" color="neutral" variant="ghost" size="sm" :aria-label="`移除${image.label}`" :disabled="busy || !!uploading" @click="editor.fields[image.key] = ''">移除</UButton>
                    <input :id="`bookmark-image-${image.key}`" type="file" accept="image/*" hidden :disabled="busy || !!uploading" @change="uploadImage($event, image.key)">
                  </div>
                </div>
              </div>
            </div>
          </details>
        </form>
      </template>
      <template #footer>
        <UButton v-if="editor?.status === 'PUBLISHED'" size="md" color="warning" variant="ghost" :disabled="locked || !!uploading" @click="hideEditor">下架</UButton>
        <div v-else />
        <div class="bookmark-actions">
          <UButton v-if="editor?.status === 'DRAFT'" type="button" size="md" color="neutral" variant="outline" :disabled="locked || !!uploading" @click="saveEditor('DRAFT')">保存草稿</UButton>
          <UButton type="submit" form="bookmark-editor-form" size="md" :loading="busy" :disabled="locked || !!uploading">{{ editor?.status === 'PUBLISHED' ? '保存修改' : '发布链接' }}</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import { bookmarkCategories, bookmarkSection, bookmarkSectionLabel, bookmarkSections, friendLinkGroups, isBookmarkSpotlight } from '~~/types/dto/bookmark'
import type { AdminBookmark, AdminBookmarksPayload, BookmarkAction, BookmarkFields } from '~~/types/dto/bookmark'
import { getApiErrorMessage } from '~/utils/api-error'
import { moveArrayItem } from '~/utils/reorder'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const endpoint = '/api/admin/bookmarks'
const { data, error: loadError, status, refresh } = await useFetch<ApiResult<AdminBookmarksPayload>>(endpoint)
const payload = computed(() => data.value?.data)
const views = [
  { value: 'items', label: '收录列表', icon: 'i-lucide-bookmark' },
  { value: 'order', label: '展示排序', icon: 'i-lucide-list-ordered' },
  { value: 'settings', label: '页面设置', icon: 'i-lucide-sliders-horizontal' }
] as const
const tab = ref<typeof views[number]['value']>('items')
const busy = ref(false)
const stale = ref(false)
const failure = ref('')
const feedback = ref('')
const locked = computed(() => !payload.value || !!loadError.value || busy.value || stale.value || status.value === 'pending')

const items = computed(() => payload.value?.items ?? [])
const isSpotlight = (item: AdminBookmark) => isBookmarkSpotlight(item, payload.value?.settings.featuredId)
const options = <T extends Record<string, string>>(labels: T) => (Object.keys(labels) as Array<keyof T & string>).map(value => ({ value, label: labels[value] }))
const categoryOptions = options(bookmarkCategories)
const groupOptions = options(friendLinkGroups)
type SortSection = keyof typeof bookmarkSections | 'spotlight'
const sortOptions: Array<{ value: SortSection; label: string }> = [{ value: 'spotlight', label: '精选收录' }, ...options(bookmarkSections)]
const sectionOptions = [{ value: 'all', label: '全部分组' }, ...sortOptions]
const statusLabels = { DRAFT: '草稿', PUBLISHED: '已发布', HIDDEN: '已下架' }
const statusOptions = [{ value: 'all', label: '全部状态' }, ...options(statusLabels)]
const query = ref('')
const sectionFilter = ref<SortSection | 'all'>('all')
const statusFilter = ref<AdminBookmark['status'] | 'all'>('all')
const domain = (url: string) => new URL(url).hostname.replace(/^www\./, '')
const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return items.value.filter(item =>
    (!keyword || item.title.toLowerCase().includes(keyword) || item.url.toLowerCase().includes(keyword))
    && (statusFilter.value === 'all' || item.status === statusFilter.value)
    && (sectionFilter.value === 'all' || (sectionFilter.value === 'spotlight' ? item.status === 'PUBLISHED' && isSpotlight(item) : bookmarkSection(item) === sectionFilter.value))
  )
})

function resetFilters() {
  query.value = ''
  sectionFilter.value = 'all'
  statusFilter.value = 'all'
}

function switchTab(value: typeof tab.value) {
  if (tab.value === value) return
  feedback.value = ''
  if (!stale.value) failure.value = ''
  tab.value = value
}

const sortSection = ref<SortSection>('spotlight')
const order = ref<number[] | null>(null)
const originalSortItems = computed(() => items.value.filter(item => item.status === 'PUBLISHED' && (
  sortSection.value === 'spotlight' ? isSpotlight(item) : !isSpotlight(item) && bookmarkSection(item) === sortSection.value
)))
const sortItems = computed(() => {
  if (!order.value) return originalSortItems.value
  const byId = new Map(originalSortItems.value.map(item => [item.id, item]))
  return order.value.flatMap(id => byId.get(id) ?? [])
})
const orderDirty = computed(() => order.value !== null && order.value.some((id, index) => id !== originalSortItems.value[index]?.id))

function selectSortSection(value: SortSection) {
  if (value === sortSection.value) return
  if (orderDirty.value && !window.confirm('这个分组的顺序尚未保存。放弃调整并切换分组？')) return
  order.value = null
  sortSection.value = value
}

function setOrder(reordered: AdminBookmark[]) {
  order.value = reordered.map(item => item.id)
}

function moveItem(index: number, direction: -1 | 1) {
  setOrder(moveArrayItem(sortItems.value, index, index + direction))
}

async function saveOrder() {
  if (!orderDirty.value || !order.value) return
  const groupIds = new Set(originalSortItems.value.map(item => item.id))
  const reordered = order.value.values()
  const ids = items.value.map(item => groupIds.has(item.id) ? reordered.next().value ?? item.id : item.id)
  if (await send({ action: 'reorder', ids }, '已保存分组顺序')) order.value = null
}

function pageSettings() {
  const saved = payload.value?.settings
  return {
    title: saved?.title ?? '',
    intro: saved?.intro ?? '',
    showRandom: saved?.showRandom ?? true,
    applicationEmail: saved?.applicationEmail ?? '',
    reportUrl: saved?.reportUrl ?? ''
  }
}

const settings = reactive(pageSettings())
const settingsDirty = computed(() => JSON.stringify(settings) !== JSON.stringify(pageSettings()))

function resetSettings() {
  Object.assign(settings, pageSettings())
}

async function saveSettings() {
  if (settingsDirty.value && await send({ action: 'settings', settings: { ...settings } }, '已保存页面设置')) resetSettings()
}

const editor = ref<{ id?: number; status: AdminBookmark['status']; fields: BookmarkFields } | null>(null)
const editorForm = useTemplateRef<HTMLFormElement>('editorForm')
const imageFields = [{ key: 'avatar', label: '图标' }, { key: 'cover', label: '精选封面' }] as const
type ImageField = typeof imageFields[number]['key']
type InputField = 'url' | 'title' | 'note'
const uploading = ref<ImageField>()
const failedImages = reactive<Partial<Record<ImageField, string>>>({})
const fieldErrors = ref<Partial<Record<InputField, string>>>({})
const appearanceOpen = ref(false)
const editorSnapshot = ref('')
const editorDirty = computed(() => !!editor.value && JSON.stringify(editor.value.fields) !== editorSnapshot.value)
let editorTrigger: HTMLElement | undefined

useAdminUnsavedChanges(() => ({
  editor: editorDirty.value,
  order: orderDirty.value,
  settings: settingsDirty.value
}))

async function send(action: BookmarkAction, message: string) {
  if (locked.value || !payload.value) return false
  busy.value = true
  failure.value = ''
  feedback.value = ''
  try {
    data.value = await $fetch<ApiResult<AdminBookmarksPayload>>(endpoint, {
      method: 'POST',
      body: { ...action, revision: payload.value.revision }
    })
    feedback.value = message
    return true
  } catch (error) {
    failure.value = getApiErrorMessage(error, { fallback: '未能保存，请重试' })
    stale.value = (error as { data?: { data?: { reason?: string } } }).data?.data?.reason === 'STALE_BOOKMARKS'
    return false
  } finally {
    busy.value = false
  }
}

async function reload() {
  if (orderDirty.value && !window.confirm('重新加载会清除尚未保存的顺序调整。继续？')) return
  const previousSettings = pageSettings()
  await refresh()
  if (loadError.value || !payload.value) return
  stale.value = false
  failure.value = ''
  order.value = null
  const latestSettings = pageSettings()
  const mergeSetting = <K extends keyof typeof settings>(key: K) => {
    if (settings[key] === previousSettings[key]) settings[key] = latestSettings[key]
  }
  for (const key of Object.keys(settings) as Array<keyof typeof settings>) mergeSetting(key)
  if (editor.value?.id) {
    const latestItem = items.value.find(item => item.id === editor.value?.id)
    if (latestItem) editor.value.status = latestItem.status
  }
  feedback.value = editor.value ? '已加载最新列表，编辑内容已保留' : '已重新加载收录列表'
}

function openEditor(item: AdminBookmark | undefined, event: MouseEvent) {
  if (locked.value) return
  editorTrigger = event.currentTarget as HTMLElement
  tab.value = 'items'
  failure.value = ''
  feedback.value = ''
  fieldErrors.value = {}
  delete failedImages.avatar
  delete failedImages.cover
  appearanceOpen.value = false
  const fields: BookmarkFields = {
    title: item?.title ?? '',
    url: item?.url ?? '',
    note: item?.note ?? '',
    category: item?.category ?? 'SITE',
    friendGroup: item?.friendGroup ?? 'RECOMMENDED',
    isSpotlight: item ? isSpotlight(item) : false,
    avatar: item?.avatar ?? '',
    cover: item?.cover ?? ''
  }
  editorSnapshot.value = JSON.stringify(fields)
  editor.value = { id: item?.id, status: item?.status ?? 'DRAFT', fields }
}

function closeEditor(open: boolean) {
  if (open || busy.value || uploading.value) return
  if (editorDirty.value && !window.confirm('有尚未保存的修改。放弃修改并关闭？')) return
  editor.value = null
  if (!stale.value) failure.value = ''
}

function restoreEditorFocus(event: Event) {
  event.preventDefault()
  editorTrigger?.focus()
  editorTrigger = undefined
}

function openImageInput(field: ImageField) {
  document.getElementById(`bookmark-image-${field}`)?.click()
}

async function uploadImage(event: Event, field: ImageField) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  const current = editor.value
  if (!file || !current || uploading.value) return
  uploading.value = field
  failure.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ data: { url: string } }>('/api/admin/upload', { method: 'POST', body })
    if (editor.value === current) {
      failedImages[field] = undefined
      current.fields[field] = result.data.url
    }
  } catch (error) {
    failure.value = getApiErrorMessage(error, { fallback: '图片上传失败，请重试' })
  } finally {
    uploading.value = undefined
    input.value = ''
  }
}

function validateEditor(fields: BookmarkFields, publish: boolean) {
  const errors: Partial<Record<InputField, string>> = {}
  const value = fields.url.trim()
  try {
    const url = new URL(value)
    if (!/^https?:\/\//i.test(value) || url.username || url.password) errors.url = '请输入有效的 HTTP 或 HTTPS 网址'
  } catch {
    errors.url = '请输入有效的 HTTP 或 HTTPS 网址'
  }
  if (!fields.title.trim()) errors.title = '请填写标题'
  if (publish && !fields.note.trim()) errors.note = '发布前请填写推荐语'
  fieldErrors.value = errors
  const first = Object.keys(errors)[0]
  if (first) editorForm.value?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  return !first
}

async function saveEditor(status: 'PUBLISHED' | 'DRAFT') {
  if (!editor.value || uploading.value || !validateEditor(editor.value.fields, status === 'PUBLISHED')) return
  const { id, fields } = editor.value
  if (await send({ action: 'save', id, fields, status }, status === 'DRAFT' ? '已保存草稿' : '链接已保存，前台已更新')) {
    editor.value = null
    const saved = items.value.find(item => item.id === id || item.url === new URL(fields.url.trim()).href)
    if (saved && !filtered.value.some(item => item.id === saved.id)) resetFilters()
  }
}

async function hideEditor() {
  const id = editor.value?.id
  if (!id || !window.confirm(editorDirty.value ? '下架后将从前台移除，并丢弃本次未保存的修改。确定下架？' : '下架后将从前台移除，之后可以重新发布。确定下架？')) return
  if (await send({ action: 'hide', id }, '链接已下架')) editor.value = null
}

async function toggleSpotlight(item: AdminBookmark) {
  const enabled = !isSpotlight(item)
  await send({ action: 'spotlight', id: item.id, enabled }, enabled ? '已加入精选' : '已移出精选')
}
</script>

<style scoped>
.bookmark-body { padding: clamp(14px, 3vw, 24px); }
.bookmark-toolbar, .bookmark-actions, .bookmark-badges, .bookmark-feedback { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.bookmark-toolbar { gap: 10px; }
.bookmark-search { width: min(100%, 320px); }
.bookmark-count, .bookmark-hint { margin: 12px 0; }
.bookmark-muted, .bookmark-copy small { color: var(--admin-muted); font-size: 13px; }
.bookmark-list { margin: 0; padding: 0; list-style: none; }
.bookmark-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; min-height: 61px; padding: 9px 0; border-top: 1px solid var(--admin-line); }
.bookmark-copy strong, .bookmark-copy small { display: block; overflow-wrap: anywhere; }
.bookmark-sort-row { grid-template-columns: auto minmax(0, 1fr) auto; }
.bookmark-empty { display: grid; justify-items: start; gap: 12px; padding: 24px 0; }
.bookmark-feedback { margin-bottom: 12px; color: var(--ui-error); font-size: 13px; }
.bookmark-success { margin-bottom: 12px; color: var(--admin-accent); font-size: 13px; }
.bookmark-settings, .bookmark-editor, .bookmark-appearance-body { display: grid; gap: 16px; }
.bookmark-settings { max-width: 700px; }
.bookmark-settings fieldset { display: grid; gap: 14px; min-width: 0; padding: 14px 16px 16px; border: 1px solid var(--admin-line); border-radius: 8px; }
.bookmark-settings legend { padding-inline: 4px; font-size: 14px; font-weight: 650; }
.bookmark-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.bookmark-appearance { border: 1px solid var(--ui-border); border-radius: 8px; }
.bookmark-appearance summary { padding: 12px; font-weight: 650; cursor: pointer; }
.bookmark-appearance summary span { margin-inline-start: 8px; font-weight: 400; }
.bookmark-appearance-body { padding: 0 12px 12px; }
.bookmark-image { display: flex; align-items: center; gap: 12px; }
.bookmark-image strong { display: block; margin-bottom: 4px; font-size: 13px; }
.bookmark-thumbnail { display: grid; width: 42px; height: 42px; flex: none; place-items: center; overflow: hidden; border: 1px solid var(--ui-border); border-radius: 6px; background: var(--ui-bg-muted); color: var(--ui-text-muted); }
.bookmark-thumbnail.is-cover { width: 68px; }
.bookmark-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
@media (max-width: 540px) {
  .bookmark-search { width: 100%; }
  .bookmark-row { gap: 6px; }
  .bookmark-badges { flex-direction: column; align-items: flex-start; gap: 4px; }
}
</style>
