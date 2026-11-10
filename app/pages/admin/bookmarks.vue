<template>
  <div class="workspace-page bookmarks-admin">
    <AdminPageActions>
      <UButton size="sm" icon="i-lucide-plus" :disabled="!payload || busy || stale || !!order" @click="openEditor()">
        新建书签
      </UButton>
    </AdminPageActions>

    <section class="workspace-panel">
      <div class="workspace-panel-heading">
        <div>
          <h2>站外散步</h2>
          <p>管理前台「书签」页收录的内容。</p>
        </div>
        <UButton to="/link" target="_blank" rel="noopener" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-up-right" size="sm">
          查看书签页
        </UButton>
      </div>

      <nav class="workspace-tabs" aria-label="书签管理">
        <button type="button" :class="{ 'is-active': tab === 'items' }" :aria-pressed="tab === 'items'" :disabled="busy" @click="tab = 'items'">
          <UIcon name="i-lucide-bookmark" class="size-4" />
          书签列表
        </button>
        <button type="button" :class="{ 'is-active': tab === 'settings' }" :aria-pressed="tab === 'settings'" :disabled="busy" @click="tab = 'settings'">
          <UIcon name="i-lucide-sliders-horizontal" class="size-4" />
          页面设置
        </button>
      </nav>

      <div class="bookmark-admin-body" :aria-busy="busy || status === 'pending'">
        <div v-if="loadError || failure" class="bookmark-feedback" role="alert">
          <p>{{ failure || '书签暂时没能加载。' }}</p>
          <UButton v-if="loadError || stale" color="neutral" variant="outline" size="sm" :loading="status === 'pending'" @click="reload">
            重新加载
          </UButton>
        </div>
        <p v-if="status === 'pending' && !payload" class="bookmark-meta" role="status">正在加载书签…</p>

        <template v-if="payload">
          <div v-show="tab === 'items'">
            <form v-if="editor" class="bookmark-form bookmark-editor" @submit.prevent="saveEditor('PUBLISHED')">
              <div class="bookmark-toolbar">
                <h3>{{ editor.id ? '编辑书签' : '新建书签' }}</h3>
                <UButton color="neutral" variant="ghost" size="sm" :disabled="busy" @click="closeEditor">关闭</UButton>
              </div>
              <div class="bookmark-fields">
                <UFormField label="标题" required>
                  <UInput ref="titleInput" v-model="editor.fields.title" required maxlength="80" class="w-full" :disabled="busy" />
                </UFormField>
                <UFormField label="分类" required>
                  <USelect v-model="editor.fields.category" :items="categoryOptions" class="w-full" :disabled="busy" />
                </UFormField>
                <UFormField class="full-width" label="链接" required>
                  <UInput v-model="editor.fields.url" type="url" required maxlength="2048" placeholder="https://" class="w-full" :disabled="busy" />
                </UFormField>
                <UFormField class="full-width" label="推荐语" description="发布前写一句为什么把它留下来，最多 180 字。">
                  <UTextarea v-model="editor.fields.note" :rows="3" maxlength="180" class="w-full" :disabled="busy" />
                </UFormField>
              </div>
              <div class="bookmark-toolbar">
                <UButton v-if="editor.status === 'PUBLISHED'" color="warning" variant="soft" size="sm" :disabled="busy || stale" @click="hideEditor">
                  下架
                </UButton>
                <div class="bookmark-actions">
                  <UButton v-if="editor.status === 'DRAFT'" type="button" color="neutral" variant="outline" size="sm" :disabled="busy || stale" @click="saveDraft">
                    保存草稿
                  </UButton>
                  <UButton type="submit" size="sm" :loading="busy" :disabled="stale">
                    {{ editor.status === 'PUBLISHED' ? '保存修改' : '发布书签' }}
                  </UButton>
                </div>
              </div>
            </form>

            <div class="bookmark-toolbar bookmark-summary">
              <div class="bookmark-meta">
                <p>{{ payload.items.length }} 条书签 · {{ published.length }} 条已发布</p>
                <p>主推荐 {{ featuredTitle || '未设置' }}</p>
              </div>
              <div v-if="order" class="bookmark-actions">
                <UButton size="sm" color="neutral" variant="ghost" :disabled="busy" @click="cancelOrder">取消排序</UButton>
                <UButton size="sm" :loading="busy" :disabled="stale" @click="saveOrder">保存顺序</UButton>
              </div>
              <UButton
                v-else-if="payload.items.length > 1"
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-list-ordered"
                :disabled="!!editor || busy || stale"
                @click="startOrder"
              >
                调整顺序
              </UButton>
            </div>

            <ul v-if="items.length" class="bookmark-admin-list">
              <li v-for="(item, index) in items" :key="item.id" class="bookmark-admin-row">
                <div class="bookmark-admin-copy">
                  <strong>{{ item.title }}</strong>
                  <small>{{ bookmarkCategories[item.category] }} · {{ domain(item.url) }}</small>
                </div>
                <UBadge :color="item.status === 'PUBLISHED' ? 'primary' : 'neutral'" variant="soft" size="sm">
                  {{ statusLabels[item.status] }}
                </UBadge>
                <div v-if="order" class="bookmark-actions">
                  <UButton icon="i-lucide-arrow-up" size="sm" color="neutral" variant="outline" :disabled="index === 0 || busy" :aria-label="`上移 ${item.title}`" @click="moveItem(index, -1)" />
                  <UButton icon="i-lucide-arrow-down" size="sm" color="neutral" variant="outline" :disabled="index === items.length - 1 || busy" :aria-label="`下移 ${item.title}`" @click="moveItem(index, 1)" />
                </div>
                <UButton v-else size="sm" color="neutral" variant="outline" :disabled="busy || stale || !!editor" :aria-label="`编辑 ${item.title}`" @click="openEditor(item)">
                  编辑
                </UButton>
              </li>
            </ul>
            <p v-else class="bookmark-empty">还没有书签。新建一条，把想分享的链接收进来。</p>
          </div>

          <form v-show="tab === 'settings'" class="bookmark-form" @submit.prevent="saveSettings">
            <div class="bookmark-fields">
              <UFormField label="页面标题" required>
                <UInput v-model="settings.title" required maxlength="32" class="w-full" :disabled="busy" />
              </UFormField>
              <UFormField label="主推荐" description="可以选任意一条已发布的书签。">
                <USelect v-model="featuredValue" :items="featureOptions" class="w-full" :disabled="busy" />
              </UFormField>
              <UFormField class="full-width" label="页面引言">
                <UTextarea v-model="settings.intro" :rows="3" maxlength="120" class="w-full" :disabled="busy" />
              </UFormField>
              <USwitch v-model="settings.showRandom" class="full-width" label="显示「随便逛一个」" :disabled="busy" />
            </div>
            <UButton type="submit" size="sm" :loading="busy" :disabled="stale">保存设置</UButton>
          </form>
          <p v-if="feedback" class="bookmark-status" role="status">{{ feedback }}</p>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import { bookmarkCategories } from '~~/types/dto/bookmark'
import type { AdminBookmark, AdminBookmarksPayload, BookmarkAction, BookmarkFields, BookmarkPageSettings } from '~~/types/dto/bookmark'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const endpoint = '/api/admin/bookmarks'
const { data, error: loadError, status, refresh } = await useFetch<ApiResult<AdminBookmarksPayload>>(endpoint)
const payload = computed(() => data.value?.data)
const tab = ref<'items' | 'settings'>('items')
const busy = ref(false)
const stale = ref(false)
const failure = ref('')
const feedback = ref('')
const editor = ref<{ id?: number; status: AdminBookmark['status']; fields: BookmarkFields } | null>(null)
const titleInput = useTemplateRef<{ inputRef: HTMLInputElement }>('titleInput')
const order = ref<number[] | null>(null)
const settings = reactive<BookmarkPageSettings>({ title: '', intro: '', showRandom: true, featuredId: null })
const published = computed(() => payload.value?.items.filter(item => item.status === 'PUBLISHED') ?? [])
const featuredTitle = computed(() => published.value.find(item => item.id === payload.value?.settings.featuredId)?.title)
const items = computed(() => {
  const current = payload.value?.items ?? []
  if (!order.value) return current
  const byId = new Map(current.map(item => [item.id, item]))
  return order.value.flatMap(id => byId.get(id) ?? [])
})
const categoryOptions = Object.entries(bookmarkCategories).map(([value, label]) => ({ value, label }))
const featureOptions = computed(() => [
  { value: 'none', label: '不展示主推荐' },
  ...published.value.map(item => ({ value: String(item.id), label: item.title }))
])
const featuredValue = computed({
  get: () => settings.featuredId === null ? 'none' : String(settings.featuredId),
  set: (value: string) => { settings.featuredId = value === 'none' ? null : Number(value) }
})
const statusLabels = { DRAFT: '草稿', PUBLISHED: '已发布', HIDDEN: '已下架' }
const domain = (url: string) => new URL(url).hostname.replace(/^www\./, '')

if (payload.value) Object.assign(settings, payload.value.settings)

async function send(action: BookmarkAction, message: string) {
  if (busy.value || stale.value || !payload.value) return false
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
  await refresh()
  if (loadError.value || !payload.value) return
  stale.value = false
  failure.value = ''
  feedback.value = '已重新加载书签'
  editor.value = null
  order.value = null
  Object.assign(settings, payload.value.settings)
}

async function openEditor(item?: AdminBookmark) {
  if (editor.value) {
    tab.value = 'items'
    return
  }
  tab.value = 'items'
  failure.value = ''
  feedback.value = ''
  const fields = item
    ? { title: item.title, url: item.url, note: item.note, category: item.category }
    : { title: '', url: '', note: '', category: 'ARTICLE' as const }
  editor.value = { id: item?.id, status: item?.status ?? 'DRAFT', fields }
  await nextTick()
  titleInput.value?.inputRef?.focus()
}

function closeEditor() {
  editor.value = null
  if (!stale.value) failure.value = ''
}

function saveDraft(event: MouseEvent) {
  const form = (event.currentTarget as HTMLButtonElement).form
  if (form?.reportValidity()) void saveEditor('DRAFT')
}

async function saveEditor(status: 'PUBLISHED' | 'DRAFT') {
  if (!editor.value) return
  const { id, fields } = editor.value
  if (await send({ action: 'save', id, fields, status }, status === 'DRAFT' ? '已保存草稿' : '书签已保存，前台已更新')) {
    editor.value = null
  }
}

async function hideEditor() {
  const id = editor.value?.id
  if (id && await send({ action: 'hide', id }, '书签已下架')) {
    editor.value = null
    if (settings.featuredId === id) settings.featuredId = null
  }
}

function startOrder() {
  order.value = payload.value?.items.map(item => item.id) ?? []
  feedback.value = ''
}

function moveItem(index: number, direction: -1 | 1) {
  if (!order.value) return
  const next = index + direction
  const currentId = order.value[index]
  const nextId = order.value[next]
  if (currentId === undefined || nextId === undefined) return
  order.value[index] = nextId
  order.value[next] = currentId
  feedback.value = `已移动到第 ${next + 1} 位，保存后更新前台`
}

function cancelOrder() {
  order.value = null
  feedback.value = ''
}

async function saveOrder() {
  if (order.value && await send({ action: 'reorder', ids: order.value }, '已保存书签顺序')) order.value = null
}

async function saveSettings() {
  if (await send({ action: 'settings', settings: { ...settings } }, '已保存页面设置')) {
    Object.assign(settings, payload.value?.settings)
  }
}
</script>

<style scoped>
.bookmark-admin-body { padding: clamp(14px, 3vw, 24px); }
.bookmark-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}
.bookmark-summary { margin-bottom: 12px; }
.bookmark-meta, .bookmark-empty { color: var(--admin-muted); font-size: 13px; }
.bookmark-meta p { margin: 0; overflow-wrap: anywhere; }
.bookmark-meta p + p { margin-top: 3px; }
.bookmark-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.bookmark-admin-list { margin: 0; padding: 0; list-style: none; }
.bookmark-admin-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  min-height: 64px;
  padding-block: 9px;
  border-top: 1px solid var(--admin-line);
}
.bookmark-admin-copy strong, .bookmark-admin-copy small { display: block; overflow-wrap: anywhere; }
.bookmark-admin-copy small { color: var(--admin-muted); }
.bookmark-form { max-width: 760px; }
.bookmark-editor {
  max-width: none;
  padding: clamp(12px, 2.8vw, 20px);
  margin-bottom: 18px;
  border: 1px solid var(--admin-line);
  border-radius: 9px;
  background: var(--ui-bg-muted);
}
.bookmark-editor h3 { margin: 0; font-weight: 650; }
.bookmark-editor .bookmark-actions { margin-inline-start: auto; }
.bookmark-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 15px;
  margin-block: 10px 16px;
}
.full-width { grid-column: 1 / -1; }
.bookmark-feedback {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 12px;
  color: #b42318;
  font-size: 13px;
}
.bookmark-status { margin: 10px 0 0; color: var(--admin-accent); font-size: 13px; }
@media (max-width: 540px) {
  .bookmark-fields { grid-template-columns: minmax(0, 1fr); }
  .bookmark-admin-row { gap: 6px; }
}
</style>
