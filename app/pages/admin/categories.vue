<template>
  <div class="category-page">
    <div class="category-window">
      <aside class="category-tree-panel">
        <div class="category-panel-head">
          <h2>
            <UIcon name="i-lucide-folder-tree" class="size-5" />
            目录结构
          </h2>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-plus" @click="startCreate" />
        </div>

        <div class="category-search">
          <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="搜索分类..." size="sm" />
        </div>

        <div class="category-tree-scroll">
          <div v-if="filteredItems.length" class="category-tree">
            <button
              v-for="item in filteredItems"
              :key="item.id"
              type="button"
              class="category-node"
              :class="{ 'is-active': activeId === item.id }"
              @click="editItem(item)"
            >
              <span class="category-node-main">
                <span class="category-expand-spacer">
                  <UIcon name="i-lucide-chevron-right" class="size-3.5" />
                </span>
                <UIcon :name="item.icon || defaultCategoryIcon" class="category-node-icon size-4" />
                <span class="category-node-name">{{ item.name }}</span>
              </span>
              <span class="category-node-actions">
                <span class="category-count">{{ item._count?.posts || 0 }}</span>
                <button type="button" title="删除分类" @click.stop="deleteItem(item)">
                  <UIcon name="i-lucide-trash-2" class="size-3.5" />
                </button>
              </span>
            </button>
          </div>

          <div v-else class="category-empty-tree">
            <UIcon name="i-lucide-folder-open" class="size-8" />
            <span>{{ searchQuery ? '没有匹配的分类' : '暂无分类' }}</span>
          </div>
        </div>
      </aside>

      <main class="category-editor-panel">
        <header class="category-editor-head">
          <h1>{{ isEditing ? '分类属性设置' : '创建新分类' }}</h1>
          <span v-if="isEditing && activeId" class="category-id">ID: {{ activeId }}</span>
        </header>

        <div class="category-form-scroll">
          <form class="category-form" @submit.prevent="saveItem">
            <div class="category-form-intro">
              <span class="category-form-icon">
                <UIcon :name="form.icon || defaultCategoryIcon" class="size-6" />
              </span>
              <div>
                <h2>{{ form.name || (isEditing ? '未命名分类' : '新分类') }}</h2>
                <p>{{ isEditing ? '编辑分类名称、图标和访问路径。' : '创建一个新的文章分类。' }}</p>
              </div>
            </div>

            <UFormField label="分类名称" required>
              <UInput v-model="form.name" icon="i-lucide-align-left" placeholder="例如：技术分享、生活随笔" />
            </UFormField>

            <UFormField label="别名 (Slug)" :required="isEditing">
              <div class="slug-input">
                <span>/categories/</span>
                <input v-model="form.slug" type="text" placeholder="frontend" />
              </div>
              <p class="category-help">作为 URL 路径，建议使用英文字母、数字和横杠组合。新建时留空会按名称自动生成。</p>
            </UFormField>

            <UFormField label="分类图标">
              <div class="icon-picker" role="radiogroup" aria-label="分类图标">
                <button
                  v-for="option in iconOptions"
                  :key="option.name"
                  type="button"
                  class="icon-option"
                  :class="{ 'is-active': form.icon === option.name }"
                  :title="option.label"
                  role="radio"
                  :aria-checked="form.icon === option.name"
                  @click="form.icon = option.name"
                >
                  <UIcon :name="option.name" class="size-5" />
                  <span>{{ option.label }}</span>
                </button>
              </div>
              <p class="category-help">首页分类胶囊会使用这里选择的图标，未选择时使用默认文件夹图标。</p>
            </UFormField>

            <div class="category-readonly-grid">
              <div>
                <UIcon name="i-lucide-file-text" class="size-4" />
                <span>文章数量</span>
                <strong>{{ activeItem?._count?.posts || 0 }}</strong>
              </div>
              <div>
                <UIcon name="i-lucide-link" class="size-4" />
                <span>访问路径</span>
                <strong>{{ previewPath }}</strong>
              </div>
            </div>

            <div class="category-note">
              <UIcon name="i-lucide-info" class="size-4" />
              <span>当前数据表暂未启用父级分类和分类描述字段，因此本页只展示可真实保存的分类属性。</span>
            </div>
          </form>
        </div>

        <footer class="category-editor-actions">
          <UButton color="neutral" variant="outline" @click="startCreate">取消</UButton>
          <UButton icon="i-lucide-save" :loading="pending" :disabled="!canSave" @click="saveItem">
            {{ isEditing ? '保存修改' : '确认创建' }}
          </UButton>
        </footer>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

type CategoryItem = {
  id: number
  name: string
  slug: string
  icon?: string | null
  _count?: {
    posts: number
  }
}

const defaultCategoryIcon = 'i-lucide-folder'
const iconOptions = [
  { name: 'i-lucide-folder', label: '文件夹' },
  { name: 'i-lucide-code-2', label: '代码' },
  { name: 'i-lucide-terminal', label: '终端' },
  { name: 'i-lucide-cpu', label: '系统' },
  { name: 'i-lucide-brain-circuit', label: '思考' },
  { name: 'i-lucide-sparkles', label: '灵感' },
  { name: 'i-lucide-book-open', label: '阅读' },
  { name: 'i-lucide-newspaper', label: '资讯' },
  { name: 'i-lucide-pen-tool', label: '写作' },
  { name: 'i-lucide-image', label: '图片' },
  { name: 'i-lucide-camera', label: '摄影' },
  { name: 'i-lucide-palette', label: '设计' },
  { name: 'i-lucide-music', label: '音乐' },
  { name: 'i-lucide-gamepad-2', label: '游戏' },
  { name: 'i-lucide-coffee', label: '生活' },
  { name: 'i-lucide-leaf', label: '自然' },
  { name: 'i-lucide-heart', label: '随笔' },
  { name: 'i-lucide-flame', label: '热门' },
  { name: 'i-lucide-rocket', label: '项目' },
  { name: 'i-lucide-globe-2', label: '网络' },
  { name: 'i-lucide-database', label: '数据' },
  { name: 'i-lucide-lock-keyhole', label: '安全' },
  { name: 'i-lucide-wrench', label: '工具' },
  { name: 'i-lucide-archive', label: '归档' }
]

const toast = useToast()
const searchQuery = ref('')
const activeId = ref<number | null>(null)
const pending = ref(false)
const form = reactive({
  name: '',
  slug: '',
  icon: defaultCategoryIcon
})

const { data, refresh } = await useFetch<{ data: CategoryItem[] }>('/api/admin/categories')

const items = computed(() => data.value?.data || [])
const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return items.value
  return items.value.filter((item) => {
    return item.name.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query)
  })
})
const activeItem = computed(() => items.value.find((item) => item.id === activeId.value) || null)
const isEditing = computed(() => Boolean(activeId.value))
const canSave = computed(() => {
  if (!form.name.trim()) return false
  return !isEditing.value || Boolean(form.slug.trim())
})
const previewPath = computed(() => `/categories/${form.slug.trim() || 'auto-slug'}`)

watch(items, (value) => {
  if (!value.length) {
    startCreate()
    return
  }

  if (!activeId.value || !value.some((item) => item.id === activeId.value)) {
    const first = value[0]
    if (first) editItem(first)
  }
}, { immediate: true })

function editItem(item: CategoryItem) {
  activeId.value = item.id
  form.name = item.name
  form.slug = item.slug
  form.icon = item.icon || defaultCategoryIcon
}

function startCreate() {
  activeId.value = null
  form.name = ''
  form.slug = ''
  form.icon = defaultCategoryIcon
}

async function saveItem() {
  if (!canSave.value) return

  pending.value = true
  try {
    if (isEditing.value && activeId.value) {
      await $fetch(`/api/admin/categories/${activeId.value}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim(),
          icon: form.icon
        }
      })
      toast.add({ title: '分类已保存', color: 'success' })
    } else {
      const created = await $fetch<{ data: CategoryItem }>('/api/admin/categories', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim(),
          icon: form.icon
        }
      })
      activeId.value = created.data.id
      toast.add({ title: '分类已创建', color: 'success' })
    }
    await refresh()
  } catch (error: any) {
    toast.add({
      title: isEditing.value ? '保存失败' : '创建失败',
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    pending.value = false
  }
}

async function deleteItem(item: CategoryItem) {
  if (item._count?.posts) {
    toast.add({
      title: '无法删除',
      description: '该分类下仍有文章，请先移动或删除相关文章。',
      color: 'warning'
    })
    return
  }

  if (!window.confirm(`确定删除“${item.name}”吗？`)) return

  try {
    await $fetch(`/api/admin/categories/${item.id}`, { method: 'DELETE' })
    if (activeId.value === item.id) {
      startCreate()
    }
    await refresh()
    toast.add({ title: '分类已删除', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '删除失败',
      description: getErrorMessage(error),
      color: 'error'
    })
  }
}

function getErrorMessage(error: any) {
  return getApiErrorMessage(error)
}
</script>

<style scoped>
.category-page {
  display: grid;
  min-height: calc(100vh - 1.75rem);
  place-items: start center;
}

.category-window {
  display: grid;
  width: 100%;
  min-height: min(720px, calc(100vh - 1.75rem));
  overflow: hidden;
  grid-template-columns: 20rem minmax(0, 1fr);
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
}

.category-tree-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
}

.category-panel-head,
.category-node,
.category-node-main,
.category-node-actions,
.category-editor-head,
.category-form-intro,
.category-readonly-grid div,
.category-note,
.category-editor-actions {
  display: flex;
  align-items: center;
}

.category-panel-head {
  justify-content: space-between;
  border-bottom: 1px solid #eef2f7;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.9rem 1rem;
}

.category-panel-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: #1e293b;
  font-size: 0.95rem;
  font-weight: 850;
}

.category-panel-head h2 svg {
  color: #4f46e5;
}

.category-search {
  border-bottom: 1px solid #eef2f7;
  padding: 0.75rem 1rem;
}

.category-tree-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0.75rem;
}

.category-tree {
  display: grid;
  gap: 0.2rem;
}

.category-node {
  width: 100%;
  justify-content: space-between;
  gap: 0.75rem;
  border: 0;
  border-radius: 0.65rem;
  background: transparent;
  color: #475569;
  cursor: pointer;
  padding: 0.55rem 0.65rem 0.55rem 0.3rem;
  text-align: left;
  transition: background-color 160ms ease, color 160ms ease;
}

.category-node:hover,
.category-node.is-active {
  background: rgba(238, 242, 255, 0.9);
  color: #4338ca;
}

.category-node-main {
  min-width: 0;
  gap: 0.4rem;
}

.category-expand-spacer {
  display: grid;
  width: 1.25rem;
  height: 1.25rem;
  place-items: center;
  color: #cbd5e1;
}

.category-node-icon {
  flex: 0 0 auto;
  color: #94a3b8;
}

.category-node.is-active .category-node-icon {
  color: #4f46e5;
}

.category-node-name {
  overflow: hidden;
  font-size: 0.84rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-node-actions {
  flex: 0 0 auto;
  gap: 0.35rem;
}

.category-count {
  border-radius: 0.35rem;
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 0.68rem;
  font-weight: 850;
  line-height: 1;
  padding: 0.22rem 0.4rem;
}

.category-node.is-active .category-count {
  background: #e0e7ff;
  color: #4f46e5;
}

.category-node-actions button {
  display: grid;
  width: 1.65rem;
  height: 1.65rem;
  place-items: center;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: #94a3b8;
  opacity: 0;
  padding: 0.25rem;
  pointer-events: none;
  transition: background-color 160ms ease, color 160ms ease, opacity 160ms ease;
}

.category-node:hover .category-node-actions button {
  opacity: 1;
  pointer-events: auto;
}

.category-node-actions button:hover {
  background: #fff1f2;
  color: #e11d48;
}

.category-empty-tree {
  display: grid;
  height: 100%;
  min-height: 18rem;
  place-items: center;
  align-content: center;
  color: #94a3b8;
  gap: 0.5rem;
  font-size: 0.78rem;
}

.category-editor-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: #fff;
}

.category-editor-head {
  min-height: 3.75rem;
  justify-content: space-between;
  border-bottom: 1px solid #eef2f7;
  padding: 0 2rem;
}

.category-editor-head h1 {
  margin: 0;
  color: #1e293b;
  font-size: 0.98rem;
  font-weight: 850;
}

.category-id {
  border: 1px solid #eef2f7;
  border-radius: 0.4rem;
  background: #f8fafc;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  padding: 0.25rem 0.45rem;
}

.category-form-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
}

.category-form {
  display: grid;
  max-width: 35rem;
  gap: 1.35rem;
  margin: 0 auto;
  padding: 2rem;
}

.category-form-intro {
  gap: 0.75rem;
  padding-bottom: 0.4rem;
}

.category-form-icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.85rem;
  background: #eef2ff;
  color: #4f46e5;
}

.category-form-intro h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.12rem;
  font-weight: 850;
}

.category-form-intro p,
.category-help {
  margin: 0.2rem 0 0;
  color: #64748b;
  font-size: 0.78rem;
}

.slug-input {
  display: flex;
  overflow: hidden;
  border: 1px solid #dbe4f0;
  border-radius: 0.55rem;
  background: #fff;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.slug-input:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

.slug-input span {
  display: inline-flex;
  align-items: center;
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  padding: 0 0.75rem;
}

.slug-input input {
  min-width: 0;
  flex: 1 1 auto;
  border: 0;
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
  outline: none;
  padding: 0.55rem 0.75rem;
}

.icon-picker {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
}

.icon-option {
  display: inline-flex;
  min-width: 0;
  height: 2.65rem;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid #dbe4f0;
  border-radius: 0.55rem;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 750;
  padding: 0 0.65rem;
  text-align: left;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.icon-option:hover,
.icon-option.is-active {
  border-color: #818cf8;
  background: #eef2ff;
  color: #4338ca;
}

.icon-option.is-active {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}

.icon-option svg {
  flex: 0 0 auto;
}

.icon-option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-readonly-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.category-readonly-grid div {
  align-items: flex-start;
  flex-direction: column;
  gap: 0.3rem;
  border: 1px solid #eef2f7;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.85rem;
}

.category-readonly-grid svg {
  color: #94a3b8;
}

.category-readonly-grid span {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
}

.category-readonly-grid strong {
  max-width: 100%;
  overflow: hidden;
  color: #0f172a;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-note {
  gap: 0.5rem;
  border: 1px solid #e0e7ff;
  border-radius: 0.75rem;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.78rem;
  line-height: 1.6;
  padding: 0.8rem 0.9rem;
}

.category-editor-actions {
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 1rem 2rem;
}

@media (max-width: 900px) {
  .category-page {
    min-height: auto;
  }

  .category-window {
    min-height: 0;
    grid-template-columns: 1fr;
  }

  .category-tree-panel {
    max-height: 22rem;
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
  }

  .category-form,
  .category-editor-head,
  .category-editor-actions {
    padding-right: 1rem;
    padding-left: 1rem;
  }
}

@media (max-width: 640px) {
  .category-readonly-grid {
    grid-template-columns: 1fr;
  }
}
</style>
