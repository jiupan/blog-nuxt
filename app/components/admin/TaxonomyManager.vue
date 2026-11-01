<template>
  <div class="workspace-page">
    <AdminPageActions>
      <template v-if="sorting"
        ><span class="admin-save-state" :class="{ 'is-dirty': sortDirty }">{{
          sortDirty ? '顺序已调整' : '拖动手柄调整'
        }}</span
        ><UButton
          size="sm"
          color="neutral"
          variant="ghost"
          :disabled="sortSaving"
          @click="cancelSort"
          >取消</UButton
        ><UButton
          size="sm"
          icon="i-lucide-check"
          :loading="sortSaving"
          :disabled="!sortDirty || sortConflict"
          @click="saveSort"
          >保存顺序</UButton
        ></template
      >
      <template v-else
        ><UButton
          icon="i-lucide-arrow-down-up"
          size="sm"
          color="neutral"
          variant="outline"
          :loading="sortLoading"
          :disabled="pending || Boolean(error)"
          :aria-label="`调整${title}顺序`"
          @click="startSort"
          ><span class="taxonomy-sort-label-long">调整顺序</span
          ><span class="taxonomy-sort-label-short">排序</span></UButton
        ><UButton icon="i-lucide-plus" size="sm" @click="openEditor()"
          >新建{{ title }}</UButton
        ></template
      >
    </AdminPageActions>
    <section v-if="sorting" class="workspace-panel taxonomy-sort-panel">
      <header class="workspace-panel-heading">
        <div>
          <h2>调整{{ title }}顺序</h2>
          <p>已显示全部 {{ sortItems.length }} 项。拖动手柄或使用上下按钮，保存后前台同步生效。</p>
        </div>
      </header>
      <div v-if="sortError" class="workspace-error" role="alert">
        <span>{{ sortError }}</span
        ><UButton
          color="neutral"
          variant="outline"
          size="sm"
          :loading="sortLoading"
          @click="reloadSort"
          >重新加载顺序</UButton
        >
      </div>
      <AdminSortableList
        :items="sortItems"
        :disabled="sortSaving || sortLoading"
        class="taxonomy-sort-list"
        @reorder="applySort"
      >
        <article
          v-for="(item, index) in sortItems"
          :key="item.id"
          class="admin-sortable-item taxonomy-sort-row"
          :data-sort-id="item.id"
        >
          <AdminDragHandle :label="item.name" :disabled="sortSaving" /><span class="taxonomy-icon"
            ><UIcon
              :name="isCategory ? item.icon || defaultCategoryIcon : 'i-lucide-hash'"
              class="size-4"
          /></span>
          <div class="taxonomy-sort-copy">
            <strong>{{ item.name }}</strong
            ><small>{{ item._count?.posts || 0 }} 篇文章</small>
          </div>
          <span class="taxonomy-position">第 {{ index + 1 }} 位</span>
          <div class="admin-order-buttons">
            <button
              type="button"
              :disabled="sortSaving || index === 0"
              :aria-label="`上移${item.name}`"
              @click="applySort(moveArrayItem(sortItems, index, index - 1))"
            >
              <UIcon name="i-lucide-chevron-up" /></button
            ><button
              type="button"
              :disabled="sortSaving || index === sortItems.length - 1"
              :aria-label="`下移${item.name}`"
              @click="applySort(moveArrayItem(sortItems, index, index + 1))"
            >
              <UIcon name="i-lucide-chevron-down" />
            </button>
          </div>
        </article>
      </AdminSortableList>
      <div v-if="!sortItems.length" class="workspace-empty">
        <UIcon name="i-lucide-list-ordered" />
        <h3>暂无可排序的{{ title }}</h3>
        <UButton color="neutral" variant="outline" @click="cancelSort">返回列表</UButton>
      </div>
      <p class="sr-only" role="status" aria-live="polite">{{ sortAnnouncement }}</p>
    </section>
    <section v-else class="workspace-panel taxonomy-panel">
      <div class="workspace-filterbar">
        <UInput
          v-model="searchInput"
          icon="i-lucide-search"
          :placeholder="`搜索${title}名称或别名…`"
          :aria-label="`搜索${title}`"
          class="workspace-search"
        />
        <span class="workspace-count">共 {{ total }} 个{{ title }}</span>
        <UButton
          v-if="searchInput"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="searchInput = ''"
        >
          清除
        </UButton>
      </div>
      <p v-if="isCategory" class="taxonomy-featured-hint">
        <UIcon name="i-lucide-pin" class="size-4 shrink-0" />
        <span>在编辑中开启“推荐展示”，首页和归档分类栏将只展示推荐分类；未设置时沿用默认展示。可通过“调整顺序”排列。</span>
      </p>
      <div v-if="error" class="workspace-empty" role="alert">
        <UIcon name="i-lucide-wifi-off" />
        <h3>{{ title }}加载失败</h3>
        <UButton color="neutral" variant="outline" @click="refresh()"> 重新加载 </UButton>
      </div>
      <div
        v-else-if="pending"
        class="workspace-loading"
        role="status"
        :aria-label="`正在加载${title}`"
      >
        <span v-for="i in 4" :key="i" />
      </div>
      <template v-else-if="items.length">
        <div class="taxonomy-row taxonomy-head">
          <span>{{ title }}名称</span>
          <span class="taxonomy-slug">访问路径</span>
          <span>文章</span>
          <span class="taxonomy-actions">操作</span>
        </div>
        <article v-for="item in items" :key="item.id" class="taxonomy-row">
          <button type="button" class="taxonomy-name" @click="openEditor(item)">
            <span class="taxonomy-icon">
              <UIcon
                :name="isCategory ? item.icon || defaultCategoryIcon : 'i-lucide-hash'"
                class="size-[18px]"
              />
            </span>
            <span>
              <strong>{{ item.name }}</strong>
              <span v-if="isCategory && item.isFeatured" class="taxonomy-featured-badge">推荐</span>
              <small class="taxonomy-mobile-slug">/{{ item.slug }}</small>
            </span>
          </button>
          <NuxtLink :to="publicPath(item)" target="_blank" class="taxonomy-slug taxonomy-path">
            {{ publicPath(item) }}
            <UIcon name="i-lucide-arrow-up-right" class="size-3" />
          </NuxtLink>
          <NuxtLink
            :to="{
              path: '/admin/posts',
              query: { [isCategory ? 'categoryId' : 'tagId']: item.id }
            }"
            class="taxonomy-posts"
            :aria-label="`查看${item.name}下的 ${item._count?.posts || 0} 篇文章`"
          >
            {{ item._count?.posts || 0 }}
            <span>篇</span>
          </NuxtLink>
          <div class="taxonomy-actions">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="`编辑${item.name}`"
              @click="openEditor(item)"
            >
              编辑
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-trash-2"
              :aria-label="`删除${item.name}`"
              @click="deleteTarget = item"
            />
          </div>
        </article>
      </template>
      <div v-else class="workspace-empty">
        <UIcon
          :name="
            search ? 'i-lucide-search-x' : isCategory ? 'i-lucide-folder-plus' : 'i-lucide-hash'
          "
        />
        <h3>{{ search ? `没有匹配的${title}` : `还没有${title}` }}</h3>
        <p>
          {{
            search
              ? '换个关键词，或清除搜索查看全部。'
              : isCategory
                ? '用分类组织内容，让读者更容易发现感兴趣的文章。'
                : '为文章添加关键词，把相关内容串起来。'
          }}
        </p>
        <UButton v-if="search" color="neutral" variant="outline" @click="searchInput = ''">
          清除搜索
        </UButton>
        <UButton v-else variant="soft" icon="i-lucide-plus" @click="openEditor()">
          新建{{ title }}
        </UButton>
      </div>
      <footer class="workspace-pagination">
        <span>{{ isCategory ? '分类用于组织文章主题' : '标签用于关联相近的内容' }}</span>
        <div>
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="page <= 1 || pending"
            aria-label="上一页"
            @click="page--"
          />
          <span>{{ page }} / {{ totalPages }}</span>
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="page >= totalPages || pending"
            aria-label="下一页"
            @click="page++"
          />
        </div>
      </footer>
    </section>
    <UModal
      v-model:open="editorOpen"
      :title="`${editingId ? '编辑' : '新建'}${title}`"
      :description="
        isCategory ? '设置文章主题的名称、访问路径与图标。' : '用简短、明确的关键词关联文章。'
      "
      :dismissible="!saving"
    >
      <template #body>
        <form class="workspace-form" @submit.prevent="saveItem">
          <UFormField :label="`${title}名称`" required>
            <UInput
              v-model="form.name"
              class="w-full"
              :placeholder="isCategory ? '例如：技术实践' : '例如：Nuxt'"
              required
              autofocus
            />
          </UFormField>
          <UFormField label="链接别名" :required="Boolean(editingId)">
            <UInput
              v-model="form.slug"
              class="w-full"
              placeholder="新建时留空将自动生成"
              :required="Boolean(editingId)"
            />
            <p class="workspace-field-hint">
              预览：/{{ isCategory ? 'categories' : 'tags' }}/{{ form.slug.trim() || '自动生成' }}
            </p>
          </UFormField>
          <UFormField v-if="isCategory" label="分类图标">
            <div class="taxonomy-icon-grid">
              <button
                v-for="option in visibleIconOptions"
                :key="option.name"
                type="button"
                :class="{ 'is-active': form.icon === option.name }"
                :aria-label="option.label"
                :title="option.label"
                :aria-pressed="form.icon === option.name"
                @click="form.icon = option.name"
              >
                <UIcon :name="option.name" class="size-5" />
              </button>
            </div>
            <button
              type="button"
              class="workspace-text-link taxonomy-more-icons"
              @click="iconsExpanded = !iconsExpanded"
            >
              {{ iconsExpanded ? '收起图标' : '更多图标' }}
            </button>
          </UFormField>
          <div v-if="isCategory">
            <UCheckbox v-model="form.isFeatured" label="推荐展示" />
            <p class="workspace-field-hint">
              在首页和归档分类栏展示此分类。设置推荐分类后，其他分类将从这两处收起，分类页和文章仍可正常访问。
            </p>
          </div>
          <p v-if="formError" class="workspace-inline-error" role="alert">
            {{ formError }}
          </p>
          <div class="workspace-form-actions">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              :disabled="saving"
              @click="editorOpen = false"
            >
              取消
            </UButton>
            <UButton type="submit" :loading="saving" :disabled="!canSave">
              {{ editingId ? '保存修改' : `创建${title}` }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
    <UModal
      :open="Boolean(deleteTarget)"
      :title="`删除${title}`"
      :description="`删除后无法恢复，请确认所选${title}。`"
      :dismissible="!deleting"
      @update:open="
        (value) => {
          if (!value) deleteTarget = null
        }
      "
    >
      <template #body>
        <div class="workspace-form">
          <p v-if="isCategory && deleteTarget?._count?.posts" class="workspace-field-hint">
            “{{ deleteTarget.name }}”下还有
            {{ deleteTarget._count.posts }} 篇文章，请先将文章移动到其他分类。
          </p>
          <p v-else>
            确定删除“{{ deleteTarget?.name }}”吗？{{
              isCategory ? '' : '文章内容会保留，仅移除标签关联。'
            }}
          </p>
          <div class="workspace-form-actions">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="deleting"
              @click="deleteTarget = null"
            >
              取消
            </UButton>
            <UButton
              v-if="!(isCategory && deleteTarget?._count?.posts)"
              color="error"
              :loading="deleting"
              @click="deleteItem"
            >
              删除{{ title }}
            </UButton>
            <UButton v-else :to="{ path: '/admin/posts', query: { categoryId: deleteTarget.id } }">
              管理相关文章
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useAdminUnsavedChanges } from '~/composables/useAdminUnsavedChanges'
import { moveArrayItem } from '~/utils/reorder'
import { getApiErrorMessage, getApiErrorStatus } from '~/utils/api-error'
import { defaultCategoryIcon, visibleCategoryIcons } from '~/utils/category-icons'
type Item = {
  id: number
  name: string
  slug: string
  icon?: string | null
  isFeatured?: boolean
  _count?: { posts: number }
}
type TagPage = { items: Item[]; pagination: { page: number; total: number; hasMore: boolean } }
const props = defineProps<{ title: string; endpoint: string }>()
const isCategory = computed(() => props.endpoint.endsWith('/categories'))
const toast = useToast()
const searchInput = ref('')
const search = ref('')
const page = ref(1)
const pageSize = 20
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    page.value = 1
  }, 250)
})
onBeforeUnmount(() => clearTimeout(searchTimer))
const query = computed(() => ({ search: search.value, page: page.value, pageSize }))
const { data, error, pending, refresh } = await useFetch<{ data: Item[] | TagPage }>(
  props.endpoint,
  {
    query: isCategory.value ? undefined : query
  }
)
const allCategories = computed(() =>
  Array.isArray(data.value?.data)
    ? data.value.data.filter((item) =>
        `${item.name} ${item.slug}`.toLowerCase().includes(search.value.toLowerCase())
      )
    : []
)
const items = computed(() =>
  isCategory.value
    ? allCategories.value.slice((page.value - 1) * pageSize, page.value * pageSize)
    : !Array.isArray(data.value?.data)
      ? data.value?.data.items || []
      : []
)
const total = computed(() =>
  isCategory.value
    ? allCategories.value.length
    : !Array.isArray(data.value?.data)
      ? data.value?.data.pagination.total || 0
      : 0
)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
watch([data, pending], () => {
  if (!pending.value && data.value && page.value > totalPages.value) page.value = totalPages.value
})
const sorting = ref(false)
const sortItems = ref<Item[]>([])
const originalIds = ref<number[]>([])
const sortLoading = ref(false)
const sortSaving = ref(false)
const sortError = ref('')
const sortConflict = ref(false)
const sortAnnouncement = ref('')
const { isDirty: sortDirty, markSaved: markSortSaved } = useAdminUnsavedChanges(() =>
  sorting.value ? sortItems.value.map((item) => item.id) : null
)
async function startSort() {
  if (sortLoading.value || sortSaving.value) return
  sortLoading.value = true
  try {
    const result = await $fetch<{ data: Item[] }>(props.endpoint)
    sortItems.value = result.data.map((item) => ({ ...item }))
    originalIds.value = result.data.map((item) => item.id)
    sortError.value = ''
    sortConflict.value = false
    sorting.value = true
    markSortSaved()
  } catch (error: unknown) {
    toast.add({ title: '排序列表加载失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    sortLoading.value = false
  }
}
function applySort(items: Item[]) {
  sortItems.value = items
  sortAnnouncement.value = `顺序已调整，共 ${items.length} 项，请保存顺序。`
}
function cancelSort() {
  sorting.value = false
  sortError.value = ''
  markSortSaved()
}
async function reloadSort() {
  if (!sortDirty.value || confirm('重新加载会丢弃当前未保存的顺序，继续吗？')) await startSort()
}
async function saveSort() {
  if (!sortDirty.value || sortSaving.value || sortConflict.value) return
  sortSaving.value = true
  sortError.value = ''
  try {
    await $fetch(`${props.endpoint}/reorder`, {
      method: 'PUT',
      body: { ids: sortItems.value.map((item) => item.id), expectedIds: originalIds.value }
    })
    sorting.value = false
    markSortSaved()
    searchInput.value = ''
    search.value = ''
    page.value = 1
    await refresh()
    toast.add({ title: `${props.title}顺序已保存`, color: 'success' })
  } catch (error: unknown) {
    sortError.value = getApiErrorMessage(error)
    sortConflict.value = getApiErrorStatus(error) === 409
  } finally {
    sortSaving.value = false
  }
}

const editorOpen = ref(false)
const editingId = ref<number | null>(null)
const form = reactive({ name: '', slug: '', icon: defaultCategoryIcon, isFeatured: false })
const iconsExpanded = ref(false)
const visibleIconOptions = computed(() => visibleCategoryIcons(form.icon, iconsExpanded.value))
const saving = ref(false)
const formError = ref('')
const deleteTarget = ref<Item | null>(null)
const deleting = ref(false)
const canSave = computed(() => Boolean(form.name.trim() && (!editingId.value || form.slug.trim())))
function publicPath(item: Item) {
  return `/${isCategory.value ? 'categories' : 'tags'}/${item.slug}`
}
function openEditor(item?: Item) {
  editingId.value = item?.id || null
  Object.assign(form, {
    name: item?.name || '',
    slug: item?.slug || '',
    icon: item?.icon || defaultCategoryIcon,
    isFeatured: item?.isFeatured ?? false
  })
  formError.value = ''
  iconsExpanded.value = false
  editorOpen.value = true
}
async function saveItem() {
  if (!canSave.value || saving.value) return
  saving.value = true
  formError.value = ''
  try {
    await $fetch(editingId.value ? `${props.endpoint}/${editingId.value}` : props.endpoint, {
      method: editingId.value ? 'PUT' : 'POST',
      body: {
        name: form.name.trim(),
        slug: form.slug.trim(),
        ...(isCategory.value ? { icon: form.icon, isFeatured: form.isFeatured } : {})
      }
    })
    editorOpen.value = false
    toast.add({ title: `${props.title}已${editingId.value ? '保存' : '创建'}`, color: 'success' })
    await refresh()
  } catch (error: unknown) {
    formError.value = getApiErrorMessage(error)
  } finally {
    saving.value = false
  }
}
async function deleteItem() {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  try {
    await $fetch(`${props.endpoint}/${deleteTarget.value.id}`, { method: 'DELETE' })
    deleteTarget.value = null
    toast.add({ title: `${props.title}已删除`, color: 'success' })
    await refresh()
  } catch (error: unknown) {
    toast.add({ title: '删除失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.taxonomy-featured-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 14px 24px;
  border-bottom: 1px solid var(--admin-line);
  color: var(--admin-muted);
  font-size: 12px;
  line-height: 1.7;
}
.taxonomy-featured-hint > .iconify {
  margin-top: 2px;
  color: var(--admin-accent);
}
.taxonomy-featured-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 10px;
  vertical-align: 1px;
}
.taxonomy-row {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1.3fr) 80px 100px;
  align-items: center;
  gap: 20px;
  min-height: 75px;
  padding: 12px 24px;
  border-bottom: 1px solid #eef0f3;
}
.taxonomy-head {
  min-height: 38px;
  background: #fafbfc;
  color: var(--admin-muted);
  font-size: 11px;
}
.taxonomy-name {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  text-align: left;
  cursor: pointer;
}
.taxonomy-icon {
  display: grid;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 7px;
  background: #f3f1f8;
  color: #8b7daf;
}
.taxonomy-name strong {
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.taxonomy-name:hover strong {
  color: var(--admin-accent);
}
.taxonomy-path {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--admin-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.taxonomy-path:hover,
.taxonomy-posts:hover {
  color: var(--admin-accent);
}
.taxonomy-posts {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.taxonomy-posts span {
  font-size: 11px;
  color: var(--admin-muted);
}
.taxonomy-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.taxonomy-mobile-slug {
  display: none;
}
.taxonomy-icon-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 7px;
  max-height: 240px;
  overflow-y: auto;
  padding: 3px;
}
.taxonomy-icon-grid button {
  display: grid;
  height: 36px;
  place-items: center;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  color: #667085;
  cursor: pointer;
}
.taxonomy-icon-grid button.is-active {
  border-color: #b7abd6;
  background: #efedf8;
  color: #6554c0;
}
.taxonomy-more-icons {
  margin-top: 12px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .taxonomy-row {
    grid-template-columns: minmax(0, 1fr) 45px 83px;
    padding-inline: 16px;
    gap: 8px;
  }
  .taxonomy-slug {
    display: none;
  }
  .taxonomy-mobile-slug {
    display: block;
    margin-top: 3px;
    color: var(--admin-muted);
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  .taxonomy-name {
    gap: 8px;
  }
  .taxonomy-name strong {
    font-size: 13px;
  }
  .taxonomy-icon {
    width: 28px;
    height: 32px;
  }
}
</style>

<style scoped>
.taxonomy-sort-label-short {
  display: none;
}
.taxonomy-sort-panel > .workspace-panel-heading {
  border-bottom: 1px solid var(--admin-line);
}
.taxonomy-sort-panel > .workspace-error {
  margin: 14px 20px;
}
.taxonomy-sort-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 70px;
  padding: 14px 24px;
  border-bottom: 1px solid #eef0f3;
  background: #fff;
}
.taxonomy-sort-row:last-child {
  border-bottom: 0;
}
.taxonomy-sort-copy {
  flex: 1;
  min-width: 0;
}
.taxonomy-sort-copy strong {
  display: block;
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 500;
}
.taxonomy-sort-copy small {
  display: block;
  margin-top: 5px;
  color: var(--admin-muted);
  font-size: 11px;
}
.taxonomy-position {
  color: var(--admin-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 767px) {
  .taxonomy-sort-label-long {
    display: none;
  }
  .taxonomy-sort-label-short {
    display: inline;
  }
  .taxonomy-sort-row {
    gap: 8px;
    padding: 13px 12px;
  }
  .taxonomy-position {
    display: none;
  }
  .taxonomy-sort-panel > .workspace-panel-heading p {
    line-height: 1.8;
  }
}
</style>
