<template>
  <div class="workspace-page">
    <AdminPageActions>
      <AdminSaveActions
        v-if="tab === 'settings'"
        form="bookmark-settings-form"
        :ready="!!payload && !loadError"
        :dirty="settingsDirty"
        :saving="busy"
        :disabled="locked"
        @undo="resetSettings"
      />
      <UButton v-else size="sm" icon="i-lucide-plus" :disabled="locked || !!sectionEditor || !sections.length" @click="openEditor(undefined, $event)">收录链接</UButton>
    </AdminPageActions>

    <section class="workspace-panel">
      <div class="workspace-panel-heading">
        <div>
          <h2>网站导航</h2>
          <p>管理导航页收录的网站、在线工具和文章。</p>
        </div>
        <UButton to="/link" target="_blank" rel="noopener" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-up-right" size="sm" class="shrink-0">查看导航页</UButton>
      </div>

      <nav class="workspace-tabs bookmark-tabs" aria-label="网站导航管理">
        <button v-for="view in views" :key="view.value" type="button" :class="{ 'is-active': tab === view.value }" :aria-pressed="tab === view.value" :disabled="busy" @click="switchTab(view.value)">
          <UIcon :name="view.icon" class="size-4" aria-hidden="true" />{{ view.label }}
        </button>
      </nav>

      <div class="bookmark-body" :aria-busy="busy || status === 'pending'">
        <div v-if="loadError || (failure && !sectionEditor)" class="bookmark-feedback" role="alert">
          <p>{{ failure || '收录列表暂时没能加载。' }}</p>
          <UButton v-if="loadError || stale" size="sm" color="neutral" variant="outline" :loading="status === 'pending'" @click="reload">重新加载</UButton>
        </div>
        <p v-if="feedback" class="bookmark-success" role="status">{{ feedback }}</p>
        <p v-if="status === 'pending' && !payload" class="bookmark-muted" role="status">正在加载收录列表…</p>

        <template v-if="payload && !loadError">
          <div v-if="tab === 'items'">
            <div class="bookmark-toolbar">
              <UInput v-model="query" icon="i-lucide-search" aria-label="搜索链接" placeholder="搜索标题或网址" class="bookmark-search" :disabled="!!sectionEditor" />
              <USelect v-model="sectionFilter" :items="sectionOptions" aria-label="筛选分类" :disabled="!!sectionEditor" />
              <USelect v-model="statusFilter" :items="statusOptions" aria-label="筛选状态" :disabled="!!sectionEditor" />
              <UButton id="bookmark-new-section" class="bookmark-new-section" size="sm" color="neutral" variant="outline" icon="i-lucide-folder-plus" :disabled="locked || !!sectionEditor" @click="editSection()">新建分类</UButton>
            </div>
            <div class="bookmark-list-summary bookmark-muted">
              <p role="status">{{ filtering ? `找到 ${filtered.length} 条，共 ${items.length} 条` : `共 ${sections.length} 个分类 · ${items.length} 条链接` }}</p>
              <span v-if="sectionEditor">保存或取消后可继续排序</span>
              <span v-else-if="filtering">清除筛选后可拖动排序</span>
              <span v-else-if="sections.length">拖动手柄排序，松手后自动保存</span>
            </div>
            <AdminSortableList :items="visibleCategories" :disabled="sortingDisabled" handle=".bookmark-section-handle" @reorder="reorderSections">
              <section
                v-for="group in renderedGroups"
                :key="group.id"
                class="bookmark-group"
                :class="{ 'admin-sortable-item': typeof group.id === 'number', 'bookmark-group-featured': group.id === 'spotlight', 'bookmark-group-editing': sectionEditor?.id === group.id }"
                :aria-labelledby="'bookmark-group-' + group.id"
              >
                <div class="bookmark-group-header">
                  <AdminDragHandle v-if="typeof group.id === 'number' && !filtering && sections.length > 1" class="bookmark-section-handle" :label="group.name" :disabled="sortingDisabled" />
                  <button
                    v-if="group.id !== 'new'"
                    :id="'bookmark-group-toggle-' + group.id"
                    type="button"
                    class="bookmark-group-arrow"
                    :aria-label="`${isGroupOpen(group.id) ? '折叠' : '展开'} ${group.name}`"
                    :aria-expanded="isGroupOpen(group.id)"
                    :aria-controls="'bookmark-group-content-' + group.id"
                    @click="toggleGroup(group.id)"
                  >
                    <UIcon name="i-lucide-chevron-right" aria-hidden="true" />
                  </button>
                  <span v-else class="bookmark-group-arrow bookmark-group-new-icon"><UIcon name="i-lucide-folder-plus" aria-hidden="true" /></span>
                  <form class="bookmark-group-copy" @submit.prevent="saveSection(group.id)" @keydown.esc="cancelSectionEdit($event, group.id)">
                    <div class="bookmark-group-name">
                      <h3 :id="'bookmark-group-' + group.id" :class="{ 'sr-only': sectionEditor?.id === group.id && sectionEditor.visible.name }">
                        <button
                          v-if="typeof group.id === 'number' && !(sectionEditor?.id === group.id && sectionEditor.visible.name)"
                          :id="`bookmark-section-name-trigger-${group.id}`"
                          type="button"
                          class="bookmark-inline-trigger"
                          :aria-label="`编辑分类名称：${group.name}`"
                          :disabled="locked"
                          @click="editSection(group, 'name')"
                        >
                          <span>{{ sectionEditor?.id === group.id ? sectionEditor.fields.name : group.name }}</span>
                          <UIcon name="i-lucide-pencil" aria-hidden="true" />
                        </button>
                        <span v-else>{{ group.name }}</span>
                      </h3>
                      <UInput
                        v-if="sectionEditor?.id === group.id && sectionEditor.visible.name"
                        id="bookmark-section-name"
                        v-model="sectionEditor.fields.name"
                        class="bookmark-inline-name"
                        aria-label="分类名称"
                        placeholder="分类名称"
                        maxlength="32"
                        required
                        :disabled="busy"
                      />
                      <span v-if="group.id !== 'new'" class="bookmark-group-count">{{ group.items.length }} 条</span>
                    </div>
                    <UTextarea
                      v-if="sectionEditor?.id === group.id && sectionEditor.visible.description"
                      id="bookmark-section-description"
                      v-model="sectionEditor.fields.description"
                      class="bookmark-inline-description"
                      aria-label="分类简介"
                      placeholder="填写分类简介（选填）"
                      :rows="2"
                      autoresize
                      maxlength="120"
                      :disabled="busy"
                    />
                    <button
                      v-else-if="typeof group.id === 'number'"
                      :id="`bookmark-section-description-trigger-${group.id}`"
                      type="button"
                      class="bookmark-inline-trigger bookmark-muted"
                      :aria-label="`编辑分类简介：${group.name}`"
                      :disabled="locked"
                      @click="editSection(group, 'description')"
                    >
                      <span>{{ group.description || '添加简介' }}</span>
                      <UIcon name="i-lucide-pencil" aria-hidden="true" />
                    </button>
                    <span v-else-if="group.description" class="bookmark-muted">{{ group.description }}</span>
                    <template v-if="sectionEditor?.id === group.id">
                      <div v-if="failure" class="bookmark-inline-error" role="alert">
                        <span>{{ failure }}</span>
                        <UButton v-if="stale" size="xs" color="neutral" variant="outline" :loading="status === 'pending'" @click="reload">重新加载</UButton>
                      </div>
                      <div class="bookmark-actions bookmark-inline-actions">
                        <UButton type="submit" size="xs" :loading="busy" :disabled="locked || sectionEditor.missing || !sectionDirty || !sectionEditor.fields.name.trim()">{{ group.id === 'new' ? '创建分类' : '保存' }}</UButton>
                        <UButton type="button" size="xs" color="neutral" variant="ghost" :disabled="busy" @click="closeSection()">取消</UButton>
                      </div>
                    </template>
                  </form>
                  <div v-if="typeof group.id === 'number'" class="bookmark-actions bookmark-group-actions">
                    <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-plus" :disabled="locked || !!sectionEditor" @click="openEditor(undefined, $event, group.id)">收录链接</UButton>
                    <UDropdownMenu :items="categoryActions(group)" :content="{ align: 'end' }">
                      <UButton size="sm" icon="i-lucide-ellipsis" color="neutral" variant="ghost" :aria-label="`${group.name}分类操作`" :disabled="locked || !!sectionEditor" />
                    </UDropdownMenu>
                  </div>
                </div>
                <div v-if="group.id !== 'new'" v-show="isGroupOpen(group.id)" :id="'bookmark-group-content-' + group.id" class="bookmark-group-content">
                  <AdminSortableList
                    v-if="isGroupOpen(group.id) && group.items.length"
                    :items="group.items"
                    :disabled="sortingDisabled"
                    handle=".bookmark-link-handle"
                    role="list"
                    @reorder="reorderLinks"
                  >
                    <div v-for="(item, index) in group.items" :key="item.id" class="admin-sortable-item bookmark-row" :class="{ 'bookmark-row-sortable': !filtering && group.items.length > 1 }" role="listitem">
                      <AdminDragHandle v-if="!filtering && group.items.length > 1" class="bookmark-link-handle" :label="item.title" :disabled="sortingDisabled" />
                      <div class="bookmark-copy">
                        <strong>{{ item.title }}</strong>
                        <small>{{ group.id === 'spotlight' ? item.sectionName + ' · ' : '' }}{{ domain(item.url) }}</small>
                      </div>
                      <div class="bookmark-badges">
                        <UBadge :color="item.status === 'PUBLISHED' ? 'primary' : 'neutral'" variant="soft" size="sm">{{ statusLabels[item.status] }}</UBadge>
                        <UBadge v-if="filtering && item.status === 'PUBLISHED' && isSpotlight(item)" color="warning" variant="soft" size="sm">精选</UBadge>
                      </div>
                      <div class="bookmark-actions">
                        <UButton
                          v-if="item.status === 'PUBLISHED'"
                          :icon="isSpotlight(item) ? 'i-lucide-star-off' : 'i-lucide-star'"
                          color="neutral" variant="ghost" size="sm"
                          :title="isSpotlight(item) ? '移出精选' : '加入精选'"
                          :aria-label="`${isSpotlight(item) ? '移出精选' : '加入精选'} ${item.title}`"
                          :disabled="locked || !!sectionEditor"
                          @click="toggleSpotlight(item)"
                        />
                        <UButton size="sm" color="neutral" variant="outline" :disabled="locked || !!sectionEditor" :aria-label="`编辑 ${item.title}`" @click="openEditor(item, $event)">编辑</UButton>
                        <UDropdownMenu :items="linkActions(item, group.id, group.items, index)" :content="{ align: 'end' }">
                          <UButton :id="'bookmark-link-actions-' + item.id" size="sm" icon="i-lucide-ellipsis" color="neutral" variant="ghost" :aria-label="`${item.title}链接操作`" :disabled="locked || !!sectionEditor" />
                        </UDropdownMenu>
                      </div>
                    </div>
                  </AdminSortableList>
                  <p v-else-if="!group.items.length" class="bookmark-group-empty bookmark-muted">{{ sectionCounts.get(Number(group.id)) ? '此分类的链接已放在精选收录。' : '此分类还没有链接。' }}</p>
                </div>
              </section>
            </AdminSortableList>
            <div v-if="!visibleGroups.length && !sectionEditor" class="bookmark-empty">
              <p>{{ sections.length ? '没有符合条件的链接。' : '还没有分类。先创建分类，再收录链接。' }}</p>
              <UButton v-if="sections.length" size="sm" color="neutral" variant="outline" @click="resetFilters">清除筛选</UButton>
            </div>
          </div>

          <form v-else id="bookmark-settings-form" class="bookmark-settings" @submit.prevent="saveSettings">
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
          <UFormField label="分类" required :error="fieldErrors.sectionId">
            <USelect v-model="editor.fields.sectionId" name="sectionId" :items="categoryOptions" class="w-full" :disabled="busy" @update:model-value="delete fieldErrors.sectionId" />
          </UFormField>
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
        <div class="bookmark-actions">
          <UButton v-if="editor?.status === 'PUBLISHED'" size="md" color="warning" variant="ghost" :disabled="locked || !!uploading" @click="hideEditor">下架</UButton>
          <UButton v-if="editor?.id" size="md" color="neutral" variant="ghost" class="bookmark-delete-trigger" :disabled="locked || !!uploading" @click="requestEditorDelete($event)">删除</UButton>
        </div>
        <div class="bookmark-actions">
          <UButton v-if="editor?.status === 'DRAFT'" type="button" size="md" color="neutral" variant="outline" :disabled="locked || !!uploading" @click="saveEditor('DRAFT')">保存草稿</UButton>
          <UButton type="submit" form="bookmark-editor-form" size="md" :loading="busy" :disabled="locked || !!uploading">{{ editor?.status === 'PUBLISHED' ? '保存修改' : '发布链接' }}</UButton>
        </div>
      </template>
    </USlideover>
    <UModal
      :open="!!deletingItem"
      title="永久删除链接？"
      :description="deletingItem?.status === 'PUBLISHED' ? '删除后会从前台和收录列表移除，此操作无法撤销。只想暂时隐藏时，可在编辑器中选择下架。' : '删除后会从收录列表移除，此操作无法撤销。'"
      :dismissible="!busy"
      :close="false"
      :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
      :content="{ onOpenAutoFocus: focusDeleteCancel, onCloseAutoFocus: restoreDeleteFocus }"
      @update:open="closeDelete"
    >
      <template #body>
        <div v-if="deletingItem" class="bookmark-delete-item">
          <span class="bookmark-delete-icon"><UIcon name="i-lucide-trash-2" aria-hidden="true" /></span>
          <div class="bookmark-copy">
            <strong>{{ deletingItem.title }}</strong>
            <small>{{ deletingItem.url }}</small>
          </div>
        </div>
        <p v-if="deletingItem && editorDirty" class="bookmark-muted mt-3">本次尚未保存的修改也会丢弃。</p>
        <div v-if="failure" class="bookmark-feedback mt-3" role="alert">
          <p>{{ failure }}</p>
          <UButton v-if="stale" size="sm" color="neutral" variant="outline" :loading="status === 'pending'" @click="refreshDeleteItem">重新加载</UButton>
        </div>
      </template>
      <template #footer>
        <UButton id="bookmark-delete-cancel" type="button" color="neutral" variant="outline" :disabled="busy" @click="closeDelete(false)">取消</UButton>
        <UButton type="button" color="error" :loading="busy" :disabled="locked" @click="deleteBookmark">永久删除</UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import { isBookmarkSpotlight } from '~~/types/dto/bookmark'
import type { AdminBookmark, AdminBookmarksPayload, BookmarkAction, BookmarkFields, BookmarkSection, BookmarkSectionFields } from '~~/types/dto/bookmark'
import { getApiErrorMessage } from '~/utils/api-error'
import { moveArrayItem } from '~/utils/reorder'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const endpoint = '/api/admin/bookmarks'
const { data, error: loadError, status, refresh } = await useFetch<ApiResult<AdminBookmarksPayload>>(endpoint)
const payload = computed(() => data.value?.data)
const views = [
  { value: 'items', label: '收录列表', icon: 'i-lucide-bookmark' },
  { value: 'settings', label: '页面设置', icon: 'i-lucide-sliders-horizontal' }
] as const
const tab = ref<typeof views[number]['value']>('items')
const busy = ref(false)
const stale = ref(false)
const failure = ref('')
const feedback = ref('')
const locked = computed(() => !payload.value || !!loadError.value || busy.value || stale.value || status.value === 'pending')

const items = computed(() => payload.value?.items ?? [])
const sections = computed(() => payload.value?.sections ?? [])
const isSpotlight = (item: AdminBookmark) => item.status === 'PUBLISHED' && isBookmarkSpotlight(item, payload.value?.settings.featuredId)
const options = <T extends Record<string, string>>(labels: T) => (Object.keys(labels) as Array<keyof T & string>).map(value => ({ value, label: labels[value] }))
const categoryOptions = computed(() => sections.value.map(({ id, name }) => ({ value: id, label: name })))
type GroupId = number | 'spotlight'
type CollectionGroup = Omit<BookmarkSection, 'id'> & { id: GroupId; items: AdminBookmark[] }
type CollectionCard = Omit<CollectionGroup, 'id'> & { id: GroupId | 'new' }
const spotlightOption = { value: 'spotlight', label: '精选收录' } as const
const sectionOptions = computed(() => [{ value: 'all', label: '全部分类' } as const, ...categoryOptions.value, spotlightOption])
const statusLabels = { DRAFT: '草稿', PUBLISHED: '已发布', HIDDEN: '已下架' }
const statusOptions = [{ value: 'all', label: '全部状态' }, ...options(statusLabels)]
const query = ref('')
const sectionFilter = ref<GroupId | 'all'>('all')
const statusFilter = ref<AdminBookmark['status'] | 'all'>('all')
const openGroups = reactive(new Set<GroupId>())
const closedSearchGroups = reactive(new Set<GroupId>())
const filtering = computed(() => !!query.value.trim() || sectionFilter.value !== 'all' || statusFilter.value !== 'all')
const domain = (url: string) => new URL(url).hostname.replace(/^www\./, '')
const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  return items.value.filter(item =>
    (!keyword || item.title.toLowerCase().includes(keyword) || item.url.toLowerCase().includes(keyword))
    && (statusFilter.value === 'all' || item.status === statusFilter.value)
    && (sectionFilter.value === 'all' || (sectionFilter.value === 'spotlight' ? item.status === 'PUBLISHED' && isSpotlight(item) : item.sectionId === sectionFilter.value))
  )
})
const pendingLinkOrder = ref<number[]>()
const pendingSectionOrder = ref<number[]>()
const orderedLinks = computed(() => {
  if (!pendingLinkOrder.value) return items.value
  const byId = new Map(items.value.map(item => [item.id, item]))
  return pendingLinkOrder.value.flatMap(id => byId.get(id) ?? [])
})
const visibleCategories = computed(() => {
  const categories = pendingSectionOrder.value
    ? pendingSectionOrder.value.flatMap(id => sections.value.filter(section => section.id === id))
    : sections.value
  const links = filtering.value ? filtered.value : orderedLinks.value
  return categories.flatMap((section) => {
    if (typeof sectionFilter.value === 'number' && sectionFilter.value !== section.id) return []
    const groupItems = links.filter(item => item.sectionId === section.id && (filtering.value || !isSpotlight(item)))
    if (!groupItems.length && filtering.value && sectionFilter.value !== section.id) return []
    return [{ ...section, items: groupItems }]
  })
})
const featuredLinks = computed(() => orderedLinks.value.filter(isSpotlight))
const visibleGroups = computed<CollectionGroup[]>(() => {
  if (filtering.value || !featuredLinks.value.length) return visibleCategories.value
  return [{ id: 'spotlight', name: '精选收录', description: '显示在导航页顶部', items: featuredLinks.value }, ...visibleCategories.value]
})
const renderedGroups = computed<CollectionCard[]>(() => {
  const draft = sectionEditor.value
  if (!draft) return visibleGroups.value
  if (draft.id === 'new') return [{ id: 'new', name: '新建分类', description: '', items: [] }, ...visibleGroups.value]
  if (visibleGroups.value.some(group => group.id === draft.id)) return visibleGroups.value
  return [{ id: draft.id, ...draft.original, items: [] }, ...visibleGroups.value]
})
watch([query, sectionFilter, statusFilter], () => closedSearchGroups.clear())

function isGroupOpen(id: GroupId) {
  return filtering.value ? !closedSearchGroups.has(id) : openGroups.has(id)
}

function toggleGroup(id: GroupId) {
  const groups = filtering.value ? closedSearchGroups : openGroups
  if (groups.has(id)) groups.delete(id)
  else groups.add(id)
}

const sectionCounts = computed(() => {
  const counts = new Map<number, number>()
  for (const item of items.value) counts.set(item.sectionId, (counts.get(item.sectionId) ?? 0) + 1)
  return counts
})

watch(sections, (latest) => {
  if (typeof sectionFilter.value === 'number' && !latest.some(section => section.id === sectionFilter.value)) sectionFilter.value = 'all'
  const validIds = new Set(latest.map(section => section.id))
  for (const id of openGroups) {
    if (id !== 'spotlight' && !validIds.has(id)) openGroups.delete(id)
  }
})

function resetFilters() {
  query.value = ''
  sectionFilter.value = 'all'
  statusFilter.value = 'all'
}

function switchTab(value: typeof tab.value) {
  if (tab.value === value) return true
  if (sectionDirty.value && !window.confirm('分类修改尚未保存。放弃修改并切换？')) return false
  sectionEditor.value = null
  feedback.value = ''
  if (!stale.value) failure.value = ''
  tab.value = value
  return true
}

const sortingDisabled = computed(() => locked.value || filtering.value || !!sectionEditor.value)

async function reorderLinks(reordered: AdminBookmark[]) {
  if (sortingDisabled.value) return
  const groupIds = new Set(reordered.map(item => item.id))
  let position = 0
  const ids = items.value.map(item => groupIds.has(item.id) ? reordered[position++]?.id ?? item.id : item.id)
  pendingLinkOrder.value = ids
  try {
    await send({ action: 'reorder', ids }, '链接顺序已保存')
  } finally {
    pendingLinkOrder.value = undefined
  }
}

async function reorderSections(reordered: BookmarkSection[]) {
  if (sortingDisabled.value) return
  const ids = reordered.map(section => section.id)
  pendingSectionOrder.value = ids
  try {
    await send({ action: 'reorderSections', ids }, '分类顺序已保存')
  } finally {
    pendingSectionOrder.value = undefined
  }
}

function categoryActions(group: CollectionCard) {
  if (typeof group.id !== 'number') return []
  const section = { id: group.id, name: group.name, description: group.description }
  const index = visibleCategories.value.findIndex(category => category.id === section.id)
  return [
    [{ label: '编辑分类', icon: 'i-lucide-pencil', onSelect: () => editSection(section) }],
    [
      { label: '上移', icon: 'i-lucide-chevron-up', disabled: sortingDisabled.value || index <= 0, onSelect: () => reorderSections(moveArrayItem(visibleCategories.value, index, index - 1)) },
      { label: '下移', icon: 'i-lucide-chevron-down', disabled: sortingDisabled.value || index >= visibleCategories.value.length - 1, onSelect: () => reorderSections(moveArrayItem(visibleCategories.value, index, index + 1)) }
    ],
    [{ label: '删除分类', icon: 'i-lucide-trash-2', color: 'error' as const, disabled: !!sectionCounts.value.get(section.id), onSelect: () => deleteSection(section) }]
  ]
}

function linkActions(item: AdminBookmark, groupId: GroupId, groupItems: AdminBookmark[], index: number) {
  return [
    [
      { label: '上移', icon: 'i-lucide-chevron-up', disabled: sortingDisabled.value || index === 0, onSelect: () => reorderLinks(moveArrayItem(groupItems, index, index - 1)) },
      { label: '下移', icon: 'i-lucide-chevron-down', disabled: sortingDisabled.value || index === groupItems.length - 1, onSelect: () => reorderLinks(moveArrayItem(groupItems, index, index + 1)) }
    ],
    [{ label: '永久删除', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => requestDelete(item, document.getElementById('bookmark-link-actions-' + item.id), groupId) }]
  ]
}

type SectionField = keyof BookmarkSectionFields
const sectionEditor = ref<{
  id: number | 'new'
  fields: BookmarkSectionFields
  original: BookmarkSectionFields
  visible: Record<SectionField, boolean>
  missing: boolean
} | null>(null)
let sectionFocusId: string | undefined
const sectionDirty = computed(() => {
  const draft = sectionEditor.value
  return !!draft && (draft.fields.name.trim() !== draft.original.name || draft.fields.description.trim() !== draft.original.description)
})

async function editSection(section?: Pick<CollectionCard, 'id' | SectionField>, field: SectionField = 'name') {
  if (locked.value || (section && typeof section.id !== 'number')) return
  const id = typeof section?.id === 'number' ? section.id : 'new'
  const draft = sectionEditor.value
  if (draft?.id === id) {
    draft.visible[field] = true
  } else {
    if (sectionDirty.value && !window.confirm('放弃当前分类尚未保存的修改？')) return
    const fields = { name: section?.name ?? '', description: section?.description ?? '' }
    sectionEditor.value = {
      id,
      fields,
      original: { ...fields },
      visible: { name: id === 'new' || field === 'name', description: id === 'new' || field === 'description' },
      missing: false
    }
    sectionFocusId = id === 'new' ? 'bookmark-new-section' : `bookmark-section-${field}-trigger-${id}`
    failure.value = ''
  }
  await nextTick()
  document.getElementById(`bookmark-section-${field}`)?.focus()
}

async function closeSection(focusId = sectionFocusId) {
  if (busy.value) return
  sectionEditor.value = null
  sectionFocusId = undefined
  if (!stale.value) failure.value = ''
  await nextTick()
  if (focusId) (document.getElementById(focusId) ?? document.getElementById('bookmark-new-section'))?.focus()
}

function cancelSectionEdit(event: KeyboardEvent, id: GroupId | 'new') {
  if (event.isComposing || sectionEditor.value?.id !== id) return
  event.preventDefault()
  event.stopPropagation()
  void closeSection()
}

async function saveSection(groupId: GroupId | 'new') {
  const draft = sectionEditor.value
  if (!draft || draft.id !== groupId || draft.missing || !sectionDirty.value || !draft.fields.name.trim()) return
  const id = draft.id === 'new' ? undefined : draft.id
  const fields = { name: draft.fields.name.trim(), description: draft.fields.description.trim() }
  if (!await send({ action: 'saveSection', id, fields }, id === undefined ? '已创建分类' : '已保存分类')) return
  if (id === undefined) {
    const created = sections.value.find(section => section.name === fields.name)
    if (created && filtering.value) resetFilters()
    await closeSection(created ? `bookmark-section-name-trigger-${created.id}` : undefined)
  } else {
    await closeSection()
  }
}

async function deleteSection(section: BookmarkSection) {
  if (!window.confirm(`确定删除空分类「${section.name}」？`)) return
  await send({ action: 'deleteSection', id: section.id }, '已删除分类')
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
  if (!stale.value) failure.value = ''
}

async function saveSettings() {
  if (settingsDirty.value && await send({ action: 'settings', settings: { ...settings } }, '已保存页面设置')) resetSettings()
}

const editor = ref<{ id?: number; status: AdminBookmark['status']; fields: BookmarkFields } | null>(null)
const editorForm = useTemplateRef<HTMLFormElement>('editorForm')
const imageFields = [{ key: 'avatar', label: '图标' }, { key: 'cover', label: '精选封面' }] as const
type ImageField = typeof imageFields[number]['key']
type InputField = 'url' | 'title' | 'note' | 'sectionId'
const uploading = ref<ImageField>()
const failedImages = reactive<Partial<Record<ImageField, string>>>({})
const fieldErrors = ref<Partial<Record<InputField, string>>>({})
const appearanceOpen = ref(false)
const editorSnapshot = ref('')
const editorDirty = computed(() => !!editor.value && JSON.stringify(editor.value.fields) !== editorSnapshot.value)
let editorTrigger: HTMLElement | undefined
const deletingItem = ref<AdminBookmark>()
let deleteTrigger: HTMLElement | undefined
let deleteFallbackSection: GroupId | undefined

useAdminUnsavedChanges(() => ({
  editor: editorDirty.value,
  settings: settingsDirty.value,
  sections: sectionDirty.value
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
  const previousSettings = pageSettings()
  await refresh()
  if (loadError.value || !payload.value) return
  stale.value = false
  failure.value = ''
  const latestSettings = pageSettings()
  const mergeSetting = <K extends keyof typeof settings>(key: K) => {
    if (settings[key] === previousSettings[key]) settings[key] = latestSettings[key]
  }
  for (const key of Object.keys(settings) as Array<keyof typeof settings>) mergeSetting(key)
  if (editor.value?.id) {
    const latestItem = items.value.find(item => item.id === editor.value?.id)
    if (latestItem) editor.value.status = latestItem.status
  }
  if (sectionEditor.value && sectionEditor.value.id !== 'new') {
    const draft = sectionEditor.value
    const latestSection = sections.value.find(section => section.id === draft.id)
    draft.missing = !latestSection
    if (latestSection) {
      for (const field of ['name', 'description'] as const) {
        if (draft.fields[field].trim() === draft.original[field]) draft.fields[field] = latestSection[field]
        draft.original[field] = latestSection[field]
      }
    } else {
      failure.value = '这个分类已被删除。'
    }
  }
  feedback.value = editor.value || sectionEditor.value ? '已加载最新列表，编辑内容已保留' : '已重新加载收录列表'
}

function openEditor(item: AdminBookmark | undefined, event: MouseEvent, groupId?: number) {
  const sectionId = item?.sectionId ?? groupId ?? (typeof sectionFilter.value === 'number' ? sectionFilter.value : sections.value[0]?.id)
  if (locked.value || sectionId === undefined || !switchTab('items')) return
  editorTrigger = event.currentTarget as HTMLElement
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
    sectionId,
    isSpotlight: item ? isBookmarkSpotlight(item, payload.value?.settings.featuredId) : false,
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

function requestDelete(item: AdminBookmark, trigger: HTMLElement | null, groupId: GroupId = item.sectionId) {
  if (locked.value || uploading.value) return
  deleteTrigger = trigger ?? undefined
  deleteFallbackSection = groupId
  failure.value = ''
  deletingItem.value = item
}

function requestEditorDelete(event: MouseEvent) {
  const item = items.value.find(item => item.id === editor.value?.id)
  if (item) requestDelete(item, event.currentTarget as HTMLElement, !filtering.value && isSpotlight(item) && item.status === 'PUBLISHED' ? 'spotlight' : item.sectionId)
}

function closeDelete(open: boolean) {
  if (open || busy.value) return
  deletingItem.value = undefined
  if (!stale.value) failure.value = ''
}

function focusDeleteCancel(event: Event) {
  event.preventDefault()
  document.getElementById('bookmark-delete-cancel')?.focus()
}

function restoreDeleteFocus(event: Event) {
  event.preventDefault()
  if (deleteTrigger?.isConnected) deleteTrigger.focus()
  else bookmarkGroupFocusTarget(deleteFallbackSection)?.focus()
  deleteTrigger = undefined
  deleteFallbackSection = undefined
}

function bookmarkGroupFocusTarget(sectionId?: GroupId) {
  return document.getElementById('bookmark-group-toggle-' + sectionId)
    ?? document.querySelector<HTMLElement>('.bookmark-search input') ?? undefined
}

async function refreshDeleteItem() {
  const id = deletingItem.value?.id
  await reload()
  if (stale.value) return
  deletingItem.value = items.value.find(item => item.id === id)
  if (!deletingItem.value && editor.value?.id === id) editor.value = null
}

async function deleteBookmark() {
  const id = deletingItem.value?.id
  if (id === undefined) return
  if (await send({ action: 'delete', id }, '链接已永久删除')) {
    deleteTrigger = undefined
    if (editor.value?.id === id) {
      editorTrigger = bookmarkGroupFocusTarget(deleteFallbackSection)
      editor.value = null
    }
    deletingItem.value = undefined
  }
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
  if (!sections.value.some(section => section.id === fields.sectionId)) errors.sectionId = '请选择分类'
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
    if (saved) {
      const group = saved.status === 'PUBLISHED' && isSpotlight(saved) ? 'spotlight' : saved.sectionId
      openGroups.add(group)
      closedSearchGroups.delete(saved.sectionId)
      if (!filtered.value.some(item => item.id === saved.id)) resetFilters()
    }
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
.bookmark-list-summary { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; margin-block: 12px; }
.bookmark-new-section { margin-inline-start: auto; }
.bookmark-muted, .bookmark-copy small { color: var(--admin-muted); font-size: 13px; }
.bookmark-group { margin-block: 12px; padding-inline: 14px; border: 1px solid var(--admin-line); border-radius: 10px; }
.bookmark-group-header { display: flex; align-items: center; gap: 8px; padding-block: 10px; }
.bookmark-group-featured { border-color: var(--admin-accent-soft); }
.bookmark-group-editing { border-color: color-mix(in srgb, var(--admin-accent) 34%, var(--admin-line)); box-shadow: 0 1px 4px rgb(32 38 51 / 5%); }
.bookmark-group-copy { display: grid; flex: 1; gap: 3px; min-width: 0; padding-block: 3px; overflow-wrap: anywhere; }
.bookmark-group-name { display: flex; align-items: center; gap: 6px 8px; font-weight: 650; }
.bookmark-group-name h3 { min-width: 0; font-size: 15px; line-height: 1.4; }
.bookmark-group-count { flex: none; padding: 2px 7px; border-radius: 999px; background: var(--ui-bg-muted); color: var(--admin-muted); font-size: 11px; font-weight: 500; }
.bookmark-group-arrow { display: grid; width: 30px; height: 30px; flex: none; place-items: center; border-radius: 7px; background: var(--ui-bg-muted); color: var(--admin-muted); }
button.bookmark-group-arrow { cursor: pointer; }
.bookmark-group-arrow .iconify { width: 15px; height: 15px; transition: transform .18s ease; }
button.bookmark-group-arrow:hover,
.bookmark-group-arrow[aria-expanded="true"],
.bookmark-group-new-icon { background: var(--admin-accent-soft); color: var(--admin-accent); }
.bookmark-group-arrow[aria-expanded="true"] .iconify { transform: rotate(90deg); }
.bookmark-inline-trigger { display: inline-flex; align-items: baseline; justify-self: start; gap: 5px; max-width: 100%; margin-inline-start: -4px; padding: 1px 4px; border-radius: 4px; text-align: start; cursor: pointer; }
.bookmark-inline-trigger > span:first-child { min-width: 0; overflow-wrap: anywhere; }
.bookmark-inline-trigger .iconify { align-self: start; flex: none; width: 12px; height: 12px; margin-top: .32em; color: var(--admin-muted); opacity: .65; transition: opacity .14s ease; }
.bookmark-group-name .bookmark-inline-trigger { align-items: center; width: max-content; margin-inline-start: 0; padding-inline-start: 0; }
.bookmark-group-name .bookmark-inline-trigger > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bookmark-group-name .bookmark-inline-trigger .iconify { align-self: center; margin-top: 0; }
.bookmark-inline-trigger:not(:disabled):is(:hover, :focus-visible) { background: var(--admin-accent-soft); color: var(--admin-accent); }
.bookmark-inline-trigger:is(:hover, :focus-visible) .iconify { color: inherit; opacity: 1; }
.bookmark-inline-trigger:disabled { cursor: default; }
.bookmark-inline-name { width: min(100%, 32ch); min-width: 0; }
.bookmark-inline-description { width: min(100%, 52ch); }
.bookmark-inline-actions { margin-top: 4px; }
.bookmark-inline-error { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; color: var(--ui-error); }
.bookmark-group-actions { flex: none; }
@media (hover: hover) and (pointer: fine) {
  .bookmark-inline-trigger:not(:hover, :focus-visible) .iconify { opacity: 0; }
}
.bookmark-group-content {
  margin-block: 0 12px;
  margin-inline-start: 38px;
  padding-inline: 10px;
  border: 1px solid var(--admin-line);
  border-radius: 8px;
  background: #f8f9fc;
}
.bookmark-group-empty { padding-block: 12px; }
.bookmark-delete-trigger:hover { color: var(--ui-error); }
.bookmark-delete-item { display: flex; gap: 10px; align-items: center; padding: 12px; border: 1px solid var(--ui-border); border-radius: 8px; }
.bookmark-delete-icon { display: grid; width: 32px; height: 32px; flex: none; place-items: center; border-radius: 7px; background: var(--ui-bg-muted); color: var(--ui-error); }
.bookmark-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; min-height: 54px; padding: 8px 2px; }
.bookmark-row + .bookmark-row { border-top: 1px solid var(--admin-line); }
.bookmark-copy strong, .bookmark-copy small { display: block; overflow-wrap: anywhere; }
.bookmark-row .bookmark-copy strong { font-size: 13px; font-weight: 550; }
.bookmark-row .bookmark-copy small { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.bookmark-row-sortable { grid-template-columns: auto minmax(0, 1fr) auto auto; }
.bookmark-section-handle, .bookmark-link-handle { width: 26px; }
.bookmark-empty { display: grid; justify-items: start; gap: 12px; padding: 24px 0; }
.bookmark-feedback { margin-bottom: 12px; color: var(--ui-error); font-size: 13px; }
.bookmark-success { margin-bottom: 12px; color: var(--admin-accent); font-size: 13px; }
.bookmark-settings, .bookmark-editor, .bookmark-appearance-body { display: grid; gap: 16px; }
.bookmark-settings { max-width: 700px; }
.bookmark-settings fieldset { display: grid; gap: 14px; min-width: 0; padding: 14px 16px 16px; border: 1px solid var(--admin-line); border-radius: 8px; }
.bookmark-settings legend { padding-inline: 4px; font-size: 14px; font-weight: 650; }
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
  .bookmark-group-header { flex-wrap: wrap; gap: 6px; }
  .bookmark-group-content { margin-inline-start: 12px; padding-inline: 6px; }
  .bookmark-link-handle { width: 20px; }
  .bookmark-group-copy { flex-basis: calc(100% - 72px); }
  .bookmark-group-actions { margin-inline-start: auto; }
}
</style>
