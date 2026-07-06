<template>
  <div class="tag-page">
    <div class="tag-window">
      <aside class="tag-list-panel">
        <div class="tag-panel-head">
          <h2>
            <UIcon name="i-lucide-tags" class="size-5" />
            标签库
          </h2>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-plus" @click="startCreate" />
        </div>

        <div class="tag-search">
          <UInput v-model="searchQuery" icon="i-lucide-search" placeholder="搜索标签名称或别名..." size="sm" />
        </div>

        <div class="tag-list-scroll">
          <div v-if="filteredItems.length" class="tag-list">
            <button
              v-for="item in filteredItems"
              :key="item.id"
              type="button"
              class="tag-card"
              :class="{ 'is-active': activeId === item.id }"
              @click="editItem(item)"
            >
              <span class="tag-mark" :class="tagColorClass(item)">
                #
              </span>
              <span class="tag-card-copy">
                <strong>{{ item.name }}</strong>
                <small>/{{ item.slug }}</small>
              </span>
              <span class="tag-card-meta">
                <span>{{ item._count?.posts || 0 }} 篇</span>
                <button type="button" title="删除标签" @click.stop="deleteItem(item)">
                  <UIcon name="i-lucide-trash-2" class="size-3.5" />
                </button>
              </span>
            </button>
          </div>

          <div v-else class="tag-empty-list">
            <UIcon name="i-lucide-hash" class="size-8" />
            <span>{{ searchQuery ? '没有匹配的标签' : '暂无标签' }}</span>
          </div>
        </div>
      </aside>

      <main class="tag-editor-panel">
        <header class="tag-editor-head">
          <h1>{{ isEditing ? '标签属性设置' : '创建新标签' }}</h1>
          <span v-if="isEditing && activeId" class="tag-id">ID: {{ activeId }}</span>
        </header>

        <div class="tag-form-scroll">
          <form class="tag-form" @submit.prevent="saveItem">
            <div v-if="!isEditing" class="tag-info">
              <UIcon name="i-lucide-info" class="size-5" />
              <p>标签用于更细粒度地组织文章。名称建议短而明确，别名建议使用英文、数字和横杠。</p>
            </div>

            <div class="tag-form-intro">
              <span class="tag-form-icon" :class="currentColorClass">
                <UIcon name="i-lucide-hash" class="size-6" />
              </span>
              <div>
                <h2>{{ form.name || (isEditing ? '未命名标签' : '新标签') }}</h2>
                <p>{{ isEditing ? '编辑标签名称和访问路径。' : '创建一个新的文章标签。' }}</p>
              </div>
            </div>

            <UFormField label="标签名称" required>
              <UInput v-model="form.name" icon="i-lucide-align-left" placeholder="例如：React、性能优化" />
            </UFormField>

            <UFormField label="别名 (Slug)" :required="isEditing">
              <div class="slug-input">
                <span>/tags/</span>
                <input v-model="form.slug" type="text" placeholder="react" />
              </div>
            </UFormField>

            <div class="tag-preview-block">
              <div>
                <label>
                  <UIcon name="i-lucide-palette" class="size-4" />
                  前台渲染预览
                </label>
                <span class="tag-preview" :class="currentColorClass">
                  <UIcon name="i-lucide-hash" class="size-3.5" />
                  {{ form.name || '标签名称' }}
                </span>
              </div>
              <div>
                <label>
                  <UIcon name="i-lucide-file-text" class="size-4" />
                  文章数量
                </label>
                <strong>{{ activeItem?._count?.posts || 0 }}</strong>
              </div>
            </div>

            <div class="tag-note">
              <UIcon name="i-lucide-info" class="size-4" />
              <span>当前数据表暂未启用标签颜色和描述字段，因此主题色按标签稳定生成，仅用于后台视觉区分。</span>
            </div>
          </form>
        </div>

        <footer class="tag-editor-actions">
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

type TagItem = {
  id: number
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

const toast = useToast()
const searchQuery = ref('')
const activeId = ref<number | null>(null)
const pending = ref(false)
const form = reactive({
  name: '',
  slug: ''
})

const colorClasses = ['slate', 'indigo', 'rose', 'emerald', 'sky', 'amber', 'purple']

const { data, refresh } = await useFetch<{ data: TagItem[] }>('/api/admin/tags')

const items = computed(() => data.value?.data || [])
const filteredItems = computed(() => {
  const sorted = items.value.slice().sort((a, b) => (b._count?.posts || 0) - (a._count?.posts || 0))
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return sorted
  return sorted.filter((item) => {
    return item.name.toLowerCase().includes(query) || item.slug.toLowerCase().includes(query)
  })
})
const activeItem = computed(() => items.value.find((item) => item.id === activeId.value) || null)
const isEditing = computed(() => Boolean(activeId.value))
const canSave = computed(() => {
  if (!form.name.trim()) return false
  return !isEditing.value || Boolean(form.slug.trim())
})
const currentColorClass = computed(() => activeItem.value ? tagColorClass(activeItem.value) : tagColorClass({ id: 0, name: form.name, slug: form.slug }))

watch(items, (value) => {
  if (!value.length) {
    startCreate()
    return
  }

  if (!activeId.value || !value.some((item) => item.id === activeId.value)) {
    const first = filteredItems.value[0] || value[0]
    if (first) editItem(first)
  }
}, { immediate: true })

function editItem(item: TagItem) {
  activeId.value = item.id
  form.name = item.name
  form.slug = item.slug
}

function startCreate() {
  activeId.value = null
  form.name = ''
  form.slug = ''
}

async function saveItem() {
  if (!canSave.value) return

  pending.value = true
  try {
    if (isEditing.value && activeId.value) {
      await $fetch(`/api/admin/tags/${activeId.value}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim()
        }
      })
      toast.add({ title: '标签已保存', color: 'success' })
    } else {
      const created = await $fetch<{ data: TagItem }>('/api/admin/tags', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          slug: form.slug.trim()
        }
      })
      activeId.value = created.data.id
      toast.add({ title: '标签已创建', color: 'success' })
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

async function deleteItem(item: TagItem) {
  if (!window.confirm(`确定删除“${item.name}”吗？`)) return

  try {
    await $fetch(`/api/admin/tags/${item.id}`, { method: 'DELETE' })
    if (activeId.value === item.id) {
      startCreate()
    }
    await refresh()
    toast.add({ title: '标签已删除', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '删除失败',
      description: getErrorMessage(error),
      color: 'error'
    })
  }
}

function tagColorClass(item: Pick<TagItem, 'id' | 'name' | 'slug'>) {
  const base = item.id || hashText(`${item.name}-${item.slug}`)
  return `tag-color-${colorClasses[Math.abs(base) % colorClasses.length]}`
}

function hashText(value: string) {
  return value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function getErrorMessage(error: any) {
  return getApiErrorMessage(error)
}
</script>

<style scoped>
.tag-page {
  display: grid;
  min-height: calc(100vh - 1.75rem);
  place-items: start center;
}

.tag-window {
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

.tag-list-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
}

.tag-panel-head,
.tag-card,
.tag-card-meta,
.tag-editor-head,
.tag-form-intro,
.tag-preview-block,
.tag-preview-block div,
.tag-preview,
.tag-info,
.tag-note,
.tag-editor-actions {
  display: flex;
  align-items: center;
}

.tag-panel-head {
  justify-content: space-between;
  border-bottom: 1px solid #eef2f7;
  background: rgba(255, 255, 255, 0.72);
  padding: 0.9rem 1rem;
}

.tag-panel-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: #1e293b;
  font-size: 0.95rem;
  font-weight: 850;
}

.tag-panel-head h2 svg {
  color: #4f46e5;
}

.tag-search {
  border-bottom: 1px solid #eef2f7;
  padding: 0.75rem 1rem;
}

.tag-list-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0.75rem;
}

.tag-list {
  display: grid;
  gap: 0.4rem;
}

.tag-card {
  width: 100%;
  gap: 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  background: transparent;
  cursor: pointer;
  padding: 0.65rem;
  text-align: left;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.tag-card:hover,
.tag-card.is-active {
  border-color: #c7d2fe;
  background: #fff;
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.08);
}

.tag-mark {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.55rem;
  font-size: 1rem;
  font-weight: 900;
}

.tag-card-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.tag-card-copy strong,
.tag-card-copy small {
  display: block;
}

.tag-card-copy strong {
  overflow: hidden;
  color: #334155;
  font-size: 0.84rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-card.is-active .tag-card-copy strong {
  color: #312e81;
}

.tag-card-copy small {
  overflow: hidden;
  margin-top: 0.1rem;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.7rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-card-meta {
  flex: 0 0 auto;
  gap: 0.35rem;
}

.tag-card-meta span {
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.68rem;
  font-weight: 750;
  padding: 0.2rem 0.5rem;
  white-space: nowrap;
}

.tag-card.is-active .tag-card-meta span {
  background: #eef2ff;
  color: #4f46e5;
}

.tag-card-meta button {
  display: grid;
  border: 0;
  border-radius: 0.45rem;
  background: transparent;
  color: #e11d48;
  opacity: 0;
  padding: 0.35rem;
  transition: opacity 160ms ease, background-color 160ms ease;
}

.tag-card:hover .tag-card-meta button,
.tag-card.is-active .tag-card-meta button {
  opacity: 1;
}

.tag-card-meta button:hover {
  background: #fff1f2;
}

.tag-empty-list {
  display: grid;
  height: 100%;
  min-height: 18rem;
  place-items: center;
  align-content: center;
  color: #94a3b8;
  gap: 0.5rem;
  font-size: 0.78rem;
}

.tag-editor-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: #fff;
}

.tag-editor-head {
  min-height: 3.75rem;
  justify-content: space-between;
  border-bottom: 1px solid #eef2f7;
  padding: 0 2rem;
}

.tag-editor-head h1 {
  margin: 0;
  color: #1e293b;
  font-size: 0.98rem;
  font-weight: 850;
}

.tag-id {
  border: 1px solid #eef2f7;
  border-radius: 0.4rem;
  background: #f8fafc;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  padding: 0.25rem 0.45rem;
}

.tag-form-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
}

.tag-form {
  display: grid;
  max-width: 35rem;
  gap: 1.35rem;
  margin: 0 auto;
  padding: 2rem;
}

.tag-info,
.tag-note {
  gap: 0.65rem;
  border: 1px solid #e0e7ff;
  border-radius: 0.75rem;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.8rem;
  line-height: 1.6;
  padding: 0.8rem 0.9rem;
}

.tag-info p {
  margin: 0;
}

.tag-form-intro {
  gap: 0.75rem;
  padding-bottom: 0.4rem;
}

.tag-form-icon {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.85rem;
}

.tag-form-intro h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.12rem;
  font-weight: 850;
}

.tag-form-intro p {
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

.tag-preview-block {
  gap: 0.75rem;
  align-items: stretch;
}

.tag-preview-block div {
  flex: 1 1 0;
  align-items: flex-start;
  flex-direction: column;
  gap: 0.55rem;
  border: 1px solid #eef2f7;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.85rem;
}

.tag-preview-block label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 750;
}

.tag-preview-block strong {
  color: #0f172a;
  font-size: 1.15rem;
  font-weight: 850;
}

.tag-preview {
  gap: 0.25rem;
  border: 1px solid;
  border-radius: 0.45rem;
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.35rem 0.55rem;
}

.tag-editor-actions {
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 1rem 2rem;
}

.tag-color-slate {
  border-color: #e2e8f0;
  background: #f1f5f9;
  color: #475569;
}

.tag-color-indigo {
  border-color: #c7d2fe;
  background: #eef2ff;
  color: #4f46e5;
}

.tag-color-rose {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.tag-color-emerald {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #16a34a;
}

.tag-color-sky {
  border-color: #bae6fd;
  background: #f0f9ff;
  color: #0284c7;
}

.tag-color-amber {
  border-color: #fde68a;
  background: #fffbeb;
  color: #d97706;
}

.tag-color-purple {
  border-color: #e9d5ff;
  background: #faf5ff;
  color: #9333ea;
}

@media (max-width: 900px) {
  .tag-page {
    min-height: auto;
  }

  .tag-window {
    min-height: 0;
    grid-template-columns: 1fr;
  }

  .tag-list-panel {
    max-height: 22rem;
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
  }

  .tag-form,
  .tag-editor-head,
  .tag-editor-actions {
    padding-right: 1rem;
    padding-left: 1rem;
  }
}

@media (max-width: 640px) {
  .tag-preview-block {
    flex-direction: column;
  }
}
</style>
