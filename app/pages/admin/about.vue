<template>
  <div class="admin-page about-editor">
    <AdminPageActions>
      <AdminSaveActions
        :ready="!!draft && !loadError"
        :dirty="isDirty"
        :saving="saving"
        label="保存关于页"
        form="about-editor-form"
        @undo="resetDraft"
      />
    </AdminPageActions>

    <div v-if="loadError" class="editor-message" role="alert">
      <span>关于页设置加载失败。</span>
      <UButton type="button" color="neutral" variant="outline" size="sm" @click="refresh()">重新加载</UButton>
    </div>
    <p v-else-if="!draft" class="editor-message" role="status">正在加载关于页设置…</p>

    <div v-else class="editor-grid">
      <form id="about-editor-form" class="editor-form" novalidate @submit.prevent="save">
        <p v-if="saveError" class="editor-message" role="alert">{{ saveError }}</p>
        <fieldset class="editor-fields" :disabled="saving">
          <section class="editor-section profile-section" aria-labelledby="about-profile-title">
            <div class="section-header">
              <div>
                <h2 id="about-profile-title">个人介绍</h2>
                <p>这里的文案会显示在公开的关于页。</p>
              </div>
              <a class="preview-jump" href="#about-live-preview">查看预览 <UIcon name="i-lucide-arrow-down" /></a>
            </div>

            <div class="profile-fields">
              <UFormField label="显示名">
                <UInput v-model="draft.name" class="w-full" :maxlength="aboutLimits.name" placeholder="例如 Jiupan" />
              </UFormField>
              <UFormField label="副标题">
                <UInput v-model="draft.subtitle" class="w-full" :maxlength="aboutLimits.subtitle" placeholder="你的角色或关注方向" />
              </UFormField>
              <UFormField label="个人简介" class="intro-field">
                <UTextarea
                  v-model="draft.description"
                  class="w-full"
                  :rows="4"
                  :maxlength="aboutLimits.description"
                  placeholder="介绍一下你自己、最近在做的事，或读者可以在这里找到的内容。"
                />
                <span class="character-count">{{ draft.description.length }} / {{ aboutLimits.description }}</span>
              </UFormField>
            </div>
            <div class="avatar-note">
              <span><UIcon name="i-lucide-image" aria-hidden="true" /> 与侧栏共用作者头像</span>
              <NuxtLink to="/admin/sidebar">管理头像 <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" /></NuxtLink>
            </div>
          </section>

          <section class="editor-section technology-section" aria-labelledby="about-technology-title">
            <div class="section-header">
              <div>
                <h2 id="about-technology-title">个人技术栈</h2>
                <p>添加你实际使用的技术，图标和分组均可选。</p>
              </div>
              <UButton
                v-if="draft.groups.length"
                type="button"
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-folder-plus"
                :disabled="draft.groups.length >= aboutLimits.groups"
                @click="addGroup()"
              >添加分组</UButton>
            </div>

            <div v-if="!draft.groups.length" class="stack-empty">
              <span class="empty-icon"><UIcon name="i-lucide-layers" aria-hidden="true" /></span>
              <strong>从一项常用技术开始</strong>
              <p>添加后可实时预览，保存后对读者可见。</p>
              <UButton type="button" size="sm" icon="i-lucide-plus" @click="addGroup(true)">添加技术</UButton>
            </div>

            <AdminSortableList
              v-else
              class="group-list"
              :items="draft.groups"
              :disabled="saving"
              handle=".about-group-handle"
              @reorder="draft.groups = $event"
            >
              <div v-for="(group, groupIndex) in draft.groups" :key="group.id" class="admin-sortable-item stack-editor-group">
                <div class="group-heading">
                  <span class="about-group-handle">
                    <AdminDragHandle label="分组" :disabled="saving || draft.groups.length < 2" />
                  </span>
                  <div class="row-field">
                    <UInput
                      :id="`about-group-${group.id}`"
                      v-model="group.name"
                      :maxlength="aboutLimits.group"
                      :aria-label="`第 ${groupIndex + 1} 组的名称`"
                      :aria-invalid="!!fieldError(`groups.${groupIndex}.name`)"
                      :aria-describedby="fieldError(`groups.${groupIndex}.name`) ? `about-group-error-${group.id}` : undefined"
                      placeholder="分组名称（可选）"
                      class="w-full"
                    />
                    <small v-if="fieldError(`groups.${groupIndex}.name`)" :id="`about-group-error-${group.id}`" class="field-error">{{ fieldError(`groups.${groupIndex}.name`) }}</small>
                  </div>
                  <span class="group-count">{{ group.items.length }} 项</span>
                  <UDropdownMenu :items="groupMenu(group, groupIndex)" :content="{ align: 'end' }">
                    <UButton type="button" color="neutral" variant="ghost" size="sm" class="row-menu" icon="i-lucide-ellipsis" :aria-label="`第 ${groupIndex + 1} 组的操作`" />
                  </UDropdownMenu>
                </div>

                <AdminSortableList
                  class="technology-list"
                  :items="group.items"
                  :disabled="saving"
                  handle=".about-tech-handle"
                  @reorder="group.items = $event"
                >
                  <div v-for="(item, itemIndex) in group.items" :key="item.id" class="admin-sortable-item technology-row">
                    <span class="about-tech-handle">
                      <AdminDragHandle label="技术条目" :disabled="saving || group.items.length < 2" />
                    </span>
                    <AdminAboutIconPicker v-model="item.icon" :disabled="saving" />
                    <div class="row-field">
                      <UInput
                        :id="`about-tech-${item.id}`"
                        v-model="item.name"
                        :maxlength="aboutLimits.technology"
                        :aria-label="`第 ${groupIndex + 1} 组第 ${itemIndex + 1} 项技术名称`"
                        :aria-invalid="!!fieldError(`groups.${groupIndex}.items.${itemIndex}.name`)"
                        :aria-describedby="fieldError(`groups.${groupIndex}.items.${itemIndex}.name`) ? `about-tech-error-${item.id}` : undefined"
                        placeholder="技术名称"
                        class="w-full"
                      />
                      <small v-if="fieldError(`groups.${groupIndex}.items.${itemIndex}.name`)" :id="`about-tech-error-${item.id}`" class="field-error">{{ fieldError(`groups.${groupIndex}.items.${itemIndex}.name`) }}</small>
                    </div>
                    <UDropdownMenu :items="technologyMenu(group, itemIndex)" :content="{ align: 'end' }">
                      <UButton type="button" color="neutral" variant="ghost" size="sm" class="row-menu" icon="i-lucide-ellipsis" :aria-label="`第 ${groupIndex + 1} 组第 ${itemIndex + 1} 项操作`" />
                    </UDropdownMenu>
                  </div>
                </AdminSortableList>
                <UButton
                  :id="`about-add-tech-${group.id}`"
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon="i-lucide-plus"
                  :disabled="group.items.length >= aboutLimits.items"
                  class="add-technology"
                  @click="addTechnology(group)"
                >添加技术</UButton>
              </div>
            </AdminSortableList>
          </section>
        </fieldset>
      </form>

      <aside id="about-live-preview" class="preview" aria-labelledby="about-preview-title">
        <div class="preview-toolbar">
          <h2 id="about-preview-title"><UIcon name="i-lucide-eye" aria-hidden="true" /> 实时预览</h2>
          <NuxtLink to="/about" target="_blank" rel="noopener">打开公开页 <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" /></NuxtLink>
        </div>
        <div class="preview-theme-bar">
          <div class="preview-theme-options" role="group" aria-label="预览主题">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              type="button"
              :aria-pressed="previewTheme === option.value"
              @click="selectedTheme = option.value"
            >
              <UIcon :name="option.icon" aria-hidden="true" />
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="preview-stage about-scene" :data-theme="previewTheme">
          <SiteAboutCard :profile="draft" :author-avatar="avatar" :theme="previewTheme" preview />
        </div>
        <p class="preview-caption">{{ isDirty ? '预览包含未保存的修改' : '预览当前已保存的内容' }}</p>
      </aside>
    </div>

    <UModal v-model:open="groupDialogOpen" title="移除分组？" description="这个分组及其中的技术会从草稿移除，保存后更新公开页。">
      <template #footer>
        <UButton type="button" color="neutral" variant="outline" @click="groupDialogOpen = false">取消</UButton>
        <UButton type="button" color="error" @click="removeSelectedGroup">移除分组</UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { ApiResult } from '~~/types/api'
import type { AdminSettingsPayload } from '~~/types/dto/settings'
import { aboutLimits, aboutProfileSchema, emptyAboutProfile, parseAboutProfile, type AboutProfile } from '~~/shared/about-profile'
import { getApiErrorMessage } from '~/utils/api-error'
import { moveArrayItem } from '~/utils/reorder'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

type DraftTechnology = AboutProfile['groups'][number]['items'][number] & { id: number }
type DraftGroup = { id: number; name: string; items: DraftTechnology[] }
type AboutDraft = Omit<AboutProfile, 'groups'> & { groups: DraftGroup[] }

const { data, error: loadError, refresh } = await useFetch<ApiResult<AdminSettingsPayload>>('/api/admin/settings')
const draft = ref<AboutDraft | null>(null)
const saving = ref(false)
const saveError = ref('')
const showErrors = ref(false)
const groupDialogOpen = ref(false)
const selectedGroupId = ref<number>()
const toast = useToast()
const { isDirty, markSaved, snapshot } = useAdminUnsavedChanges(() => draft.value)
let savedDraft = ''
let nextId = 0

watch(data, result => {
  if (!result?.data) return
  const parsed = parseAboutProfile(result.data.about_profile)
  const profile = parsed?.success ? parsed.data : emptyAboutProfile
  draft.value = {
    ...profile,
    groups: profile.groups.map(group => ({
      id: ++nextId,
      name: group.name,
      items: group.items.map(item => ({ id: ++nextId, ...item }))
    }))
  }
  savedDraft = snapshot()
  markSaved(savedDraft)
}, { immediate: true })

const avatar = computed(() => data.value?.data.sidebar_author_avatar || '')
const colorMode = useColorMode()
const themeOptions = [
  { value: 'light', label: '日间', icon: 'i-lucide-sun' },
  { value: 'dark', label: '夜间', icon: 'i-lucide-moon' }
] as const
const selectedTheme = ref<(typeof themeOptions)[number]['value']>()
const previewTheme = computed(() => selectedTheme.value ?? (colorMode.value === 'dark' ? 'dark' : 'light'))
const validation = computed(() => aboutProfileSchema.safeParse(draft.value))
const errors = computed(() => validation.value.error?.issues ?? [])

function fieldError(path: string) {
  const issue = errors.value.find(error => error.path.join('.') === path)
  return issue && (showErrors.value || issue.code === 'custom') ? issue.message : ''
}

async function focusField(id: string) {
  await nextTick()
  document.getElementById(id)?.focus()
}

function addTechnology(group: DraftGroup) {
  if (group.items.length >= aboutLimits.items) return
  const id = ++nextId
  group.items.push({ id, name: '', icon: '' })
  void focusField(`about-tech-${id}`)
}

function addGroup(withTechnology = false) {
  if (!draft.value || draft.value.groups.length >= aboutLimits.groups) return
  const group: DraftGroup = { id: ++nextId, name: '', items: withTechnology ? [{ id: ++nextId, name: '', icon: '' }] : [] }
  draft.value.groups.push(group)
  const firstItem = group.items[0]
  void focusField(firstItem ? `about-tech-${firstItem.id}` : `about-group-${group.id}`)
}

function groupMenu(group: DraftGroup, index: number): DropdownMenuItem[][] {
  const groups = draft.value?.groups ?? []
  function move(to: number) {
    if (draft.value) draft.value.groups = moveArrayItem(draft.value.groups, index, to)
  }
  return [[
    { label: '上移分组', icon: 'i-lucide-arrow-up', disabled: index === 0, onSelect: () => move(index - 1) },
    { label: '下移分组', icon: 'i-lucide-arrow-down', disabled: index === groups.length - 1, onSelect: () => move(index + 1) }
  ], [{
    label: '移除分组',
    icon: 'i-lucide-trash-2',
    color: 'error',
    onSelect: () => {
      selectedGroupId.value = group.id
      if (group.items.length) groupDialogOpen.value = true
      else removeSelectedGroup()
    }
  }]]
}

function removeSelectedGroup() {
  if (draft.value) draft.value.groups = draft.value.groups.filter(group => group.id !== selectedGroupId.value)
  groupDialogOpen.value = false
}

function technologyMenu(group: DraftGroup, index: number): DropdownMenuItem[][] {
  const destinations = (draft.value?.groups ?? []).filter(candidate => candidate.id !== group.id)
  return [[
    { label: '上移技术', icon: 'i-lucide-arrow-up', disabled: index === 0, onSelect: () => { group.items = moveArrayItem(group.items, index, index - 1) } },
    { label: '下移技术', icon: 'i-lucide-arrow-down', disabled: index === group.items.length - 1, onSelect: () => { group.items = moveArrayItem(group.items, index, index + 1) } },
    ...(destinations.length ? [{
      label: '移至分组',
      icon: 'i-lucide-folder-input',
      children: destinations.map(destination => ({
        label: destination.name.trim() || '未分组',
        disabled: destination.items.length >= aboutLimits.items,
        onSelect: () => {
          const item = group.items.splice(index, 1)[0]
          if (item) {
            destination.items.push(item)
            void focusField(`about-tech-${item.id}`)
          }
        }
      }))
    }] : [])
  ], [{
    label: '移除技术',
    icon: 'i-lucide-trash-2',
    color: 'error',
    onSelect: () => {
      group.items.splice(index, 1)
      void focusField(`about-add-tech-${group.id}`)
    }
  }]]
}

async function save() {
  if (!draft.value || !isDirty.value || saving.value) return
  saveError.value = ''
  const parsed = validation.value
  if (!parsed.success) {
    showErrors.value = true
    await nextTick()
    document.querySelector<HTMLElement>('#about-editor-form input[aria-invalid="true"]')?.focus()
    return
  }

  const submittedDraft = snapshot()
  saving.value = true
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: { about_profile: JSON.stringify(parsed.data) } })
    savedDraft = submittedDraft
    markSaved(savedDraft)
    showErrors.value = false
    toast.add({ title: '关于页已保存', color: 'success' })
  } catch (error: unknown) {
    saveError.value = getApiErrorMessage(error, { fallback: '保存失败，请稍后重试。' })
  } finally {
    saving.value = false
  }
}

function resetDraft() {
  if (!savedDraft || saving.value) return
  draft.value = JSON.parse(savedDraft) as AboutDraft
  saveError.value = ''
  showErrors.value = false
}
</script>

<style scoped>
.about-editor {
  max-width: 1180px;
  margin-inline: auto;
}

.editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.38fr) minmax(285px, 1fr);
  align-items: start;
  gap: clamp(16px, 2vw, 30px);
}

.editor-form,
.editor-fields {
  min-inline-size: 0;
}

.editor-fields {
  display: grid;
  gap: 18px;
  margin: 0;
  border: 0;
  padding: 0;
}

.editor-section {
  min-width: 0;
  border: 1px solid var(--admin-line);
  border-radius: 16px;
  background: white;
  padding: clamp(16px, 2vw, 24px);
}

.section-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 720;
  letter-spacing: -.015em;
}

.section-header p {
  margin: 5px 0 0;
  color: var(--admin-muted);
  font-size: 13px;
  line-height: 1.55;
}

.profile-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 14px;
}

.intro-field { grid-column: 1 / -1; }
.profile-fields :deep(input),
.row-field :deep(input) { min-height: 36px; }

.character-count {
  display: block;
  margin-top: 4px;
  color: var(--admin-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.avatar-note,
.editor-message,
.preview-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.avatar-note {
  margin-top: 12px;
  border-top: 1px solid var(--admin-line);
  padding-top: 13px;
  color: var(--admin-muted);
  font-size: 12px;
}

.avatar-note span,
.avatar-note a,
.preview-toolbar a,
.preview-toolbar h2,
.preview-jump {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.avatar-note a,
.preview-toolbar a,
.preview-jump {
  color: var(--admin-accent);
  font-weight: 650;
}

.avatar-note a:hover,
.preview-toolbar a:hover,
.preview-jump:hover { text-decoration: underline; }

.preview-jump { display: none; }

.stack-empty {
  display: grid;
  min-height: 158px;
  justify-items: center;
  align-content: center;
  gap: 6px;
  border: 1px dashed #d8d4eb;
  border-radius: 12px;
  background: #fbfaff;
  padding: 16px;
  text-align: center;
}

.empty-icon {
  display: grid;
  width: 34px;
  height: 34px;
  margin-bottom: 3px;
  place-items: center;
  border-radius: 11px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}

.stack-empty strong { font-size: 14px; }
.stack-empty p { margin: 0 0 5px; color: var(--admin-muted); font-size: 12px; }

.group-list { display: grid; gap: 12px; }

.stack-editor-group {
  min-width: 0;
  border: 1px solid var(--admin-line);
  border-radius: 12px;
  background: #fff;
  padding: 10px;
}

.group-heading,
.technology-row {
  display: grid;
  min-width: 0;
  align-items: start;
  gap: 6px;
}

.group-heading {
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  border-radius: 8px;
  background: #f6f5fa;
  padding: 6px;
}

.group-heading :deep(input) { font-weight: 650; }

.group-count {
  align-self: center;
  padding-inline: 3px;
  color: var(--admin-muted);
  font-size: 11px;
  white-space: nowrap;
}

.technology-list {
  display: grid;
  gap: 5px;
}

.technology-list:not(:empty) { margin-top: 8px; }

.technology-row {
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  border-radius: 8px;
  background: white;
  padding: 4px 6px;
}

.technology-row:hover { background: #f8f8fb; }
.row-field { min-width: 0; }
.row-menu { min-width: 36px; min-height: 36px; justify-content: center; }
.about-group-handle :deep(button),
.about-tech-handle :deep(button) { min-width: 30px; min-height: 36px; }
.add-technology { margin: 5px 0 0 6px; }

.field-error {
  display: block;
  margin: 4px 0 0 2px;
  color: #a51e37;
  font-size: 11px;
}

.editor-message {
  margin: 0 0 12px;
  border: 1px solid var(--admin-line);
  border-radius: 12px;
  background: white;
  padding: 14px 16px;
  color: var(--admin-muted);
  font-size: 13px;
}

.editor-message[role='alert'] { color: #a51e37; }

.preview {
  position: sticky;
  top: 80px;
  min-width: 0;
  scroll-margin-top: 78px;
}

.preview-toolbar { min-height: 36px; margin-bottom: 8px; font-size: 12px; }
.preview-toolbar h2 { margin: 0; color: var(--admin-ink); font-size: 14px; font-weight: 700; }
.preview-toolbar h2 > :first-child { color: var(--admin-accent); }

.preview-theme-bar {
  display: flex;
  margin-bottom: 12px;
}

.preview-theme-options {
  display: inline-flex;
  gap: 3px;
  border: 1px solid var(--admin-line);
  border-radius: 10px;
  background: #eef0f5;
  padding: 3px;
}

.preview-theme-options button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border-radius: 7px;
  color: var(--admin-muted);
  padding-inline: 10px;
  font-size: 12px;
  font-weight: 650;
  cursor: pointer;
}

.preview-theme-options button:hover { color: var(--admin-accent); }

.preview-theme-options button[aria-pressed='true'] {
  background: #fff;
  box-shadow: 0 1px 3px rgb(32 38 51 / 14%);
  color: var(--admin-accent);
}

.preview-theme-options button:focus-visible {
  outline: 2px solid var(--admin-accent);
  outline-offset: 1px;
}

.preview-stage {
  display: grid;
  min-height: 290px;
  max-height: max(360px, calc(100dvh - 220px));
  align-items: safe center;
  justify-items: center;
  overflow: auto;
  border: 1px solid var(--admin-line);
  border-radius: 20px;
  padding: clamp(10px, 1.35vw, 22px);
}

.preview-stage[data-theme="dark"] { border-color: #27324b; }

.preview-caption { margin: 9px 2px 0; color: var(--admin-muted); font-size: 11px; }

@media (max-width: 1050px) {
  .editor-grid { grid-template-columns: minmax(0, 1fr); }
  .preview { position: static; }
  .preview-jump { display: inline-flex; font-size: 12px; }
}

@media (max-width: 560px) {
  .profile-fields { grid-template-columns: minmax(0, 1fr); }
  .technology-row { padding-inline: 0; }
  .group-heading, .technology-row { gap: 4px; }
}
</style>
