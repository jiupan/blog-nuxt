<template>
  <div class="menu-page">
    <header class="menu-topbar">
      <div class="menu-title-block">
        <span class="menu-title-icon">
          <UIcon name="i-lucide-panel-top" class="size-5" />
        </span>
        <span>
          <strong>菜单配置</strong>
          <small>管理站点各个位置的导航链接</small>
        </span>
      </div>

      <div class="menu-topbar-actions">
        <UBadge v-if="isDirty" color="warning" variant="soft">有未保存修改</UBadge>
        <UButton color="neutral" variant="outline" icon="i-lucide-rotate-ccw" :disabled="!isDirty" @click="resetMenus">
          丢弃修改
        </UButton>
        <UButton icon="i-lucide-save" :loading="saving" @click="saveMenus">保存当前菜单</UButton>
      </div>
    </header>

    <div class="menu-shell">
      <aside class="menu-groups">
        <div class="menu-groups-head">
          <span>选择菜单组</span>
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-plus" @click="createQuickMenu" />
        </div>

        <button
          v-for="menu in menus"
          :key="menu.id ?? menu.name"
          type="button"
          class="menu-group-button"
          :class="{ 'is-active': selectedMenuId === menu.id }"
          @click="selectMenu(menu)"
        >
          <span>
            <strong>{{ menu.name || '未命名菜单' }}</strong>
            <small>{{ menuLocationHint(menu) }}</small>
          </span>
          <UBadge :color="menu.location === 'PRIMARY' ? 'primary' : 'neutral'" variant="soft" size="xs">
            {{ locationLabel(menu.location) }}
          </UBadge>
        </button>
      </aside>

      <main v-if="selectedMenu" class="menu-workspace">
        <section class="menu-settings-card">
          <div class="menu-card-head">
            <div>
              <h2>{{ selectedMenu.name || '未命名菜单' }} 设置</h2>
              <p>
                标识符:
                <code>{{ selectedMenu.slug || '保存后自动生成' }}</code>
              </p>
            </div>
            <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="deleteMenu" />
          </div>

          <div class="menu-settings-row">
            <UFormField label="菜单名称">
              <UInput v-model="selectedMenu.name" placeholder="主导航" />
            </UFormField>
            <UFormField label="标识符">
              <UInput v-model="selectedMenu.slug" placeholder="primary" />
            </UFormField>
            <UFormField label="显示位置">
              <select v-model="selectedMenu.location" class="menu-select">
                <option v-for="option in locationOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </UFormField>
            <label class="menu-check menu-check-inline">
              <input v-model="selectedMenu.isActive" type="checkbox" />
              <span>启用</span>
            </label>
          </div>

          <div class="menu-render-hint">
            <button type="button" :class="{ 'is-on': selectedMenu.location === 'PRIMARY' }" @click="setPrimaryMenu">
              设为主导航 (Primary)
            </button>
            <span>将在主题的 <strong>header</strong> 对应位置渲染</span>
          </div>
        </section>

        <section class="menu-structure-card">
          <div class="menu-card-head is-sticky">
            <div>
              <h2>菜单结构</h2>
              <p>支持拖拽式层级思路，当前最多展示 2 级嵌套</p>
            </div>
            <UButton icon="i-lucide-plus" variant="soft" @click="toggleAddPanel">添加项目</UButton>
          </div>

          <div v-if="showAddPanel" class="menu-add-panel">
            <div class="menu-add-types">
              <button
                v-for="option in quickAddOptions"
                :key="option.type"
                type="button"
                :class="{ 'is-active': itemForm.type === option.type }"
                @click="pickAddType(option.type)"
              >
                <UIcon :name="option.icon" class="size-4" />
                {{ option.label }}
              </button>
            </div>
            <div class="menu-add-fields">
              <UInput v-model="itemForm.title" placeholder="显示名称" />
              <UInput v-model="itemForm.url" placeholder="/about 或 https://..." />
              <UButton icon="i-lucide-plus" @click="addMenuItem">添加到菜单</UButton>
            </div>
          </div>

          <div class="menu-tree-scroll">
            <div v-if="treeItems.length" class="menu-tree">
              <template v-for="root in treeItems" :key="root.item.id">
                <MenuTreeItem
                  :item="root.item"
                  :children="root.children"
                  :expanded-item-id="expandedItemId"
                  :item-type-options="itemTypeOptions"
                  :can-move-up="canMove(root.item, -1)"
                  :can-move-down="canMove(root.item, 1)"
                  :can-indent="canIndent(root.item)"
                  :can-outdent="false"
                  :type-label="typeLabel"
                  :item-url="itemUrl"
                  :item-icon="itemIcon"
                  @toggle="toggleItem"
                  @move="moveItem"
                  @indent="indentItem"
                  @outdent="outdentItem"
                  @duplicate="duplicateItem"
                  @delete="deleteMenuItem"
                />

                <div v-if="root.children.length" class="menu-child-list">
                  <MenuTreeItem
                    v-for="child in root.children"
                    :key="child.id ?? `${root.item.id}-${child.title}`"
                    :item="child"
                    :children="[]"
                    :expanded-item-id="expandedItemId"
                    :item-type-options="itemTypeOptions"
                    :can-move-up="canMove(child, -1)"
                    :can-move-down="canMove(child, 1)"
                    :can-indent="false"
                    :can-outdent="true"
                    :type-label="typeLabel"
                    :item-url="itemUrl"
                    :item-icon="itemIcon"
                    is-child
                    @toggle="toggleItem"
                    @move="moveItem"
                    @indent="indentItem"
                    @outdent="outdentItem"
                    @duplicate="duplicateItem"
                    @delete="deleteMenuItem"
                  />
                </div>
              </template>
            </div>

            <button v-else type="button" class="menu-empty-add" @click="showAddPanel = true">
              <span><UIcon name="i-lucide-plus" class="size-5" /></span>
              <strong>添加一级菜单项</strong>
              <small>从页面、分类、标签，或添加自定义链接</small>
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, resolveComponent } from 'vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

type MenuLocation = 'PRIMARY' | 'FOOTER' | 'MOBILE' | 'CUSTOM'
type MenuItemType = 'CUSTOM' | 'POST' | 'CATEGORY' | 'TAG' | 'PAGE' | 'ARCHIVE' | 'HOME'

type MenuItem = {
  id: number | null
  parentId: number | null
  title: string
  url: string
  type: MenuItemType
  targetId: number | null
  targetSlug: string
  targetBlank: boolean
  badge: string
  icon: string
  sort: number
  isVisible: boolean
}

type MenuGroup = {
  id: number | null
  name: string
  slug: string
  description: string
  location: MenuLocation
  isActive: boolean
  items: MenuItem[]
}

type TreeNode = {
  item: MenuItem
  children: MenuItem[]
}

const MenuTreeItem = defineComponent({
  name: 'MenuTreeItem',
  props: {
    item: { type: Object as () => MenuItem, required: true },
    children: { type: Array as () => MenuItem[], required: true },
    expandedItemId: { type: Number as () => number | null, default: null },
    itemTypeOptions: { type: Array as () => Array<{ label: string, value: MenuItemType }>, required: true },
    canMoveUp: { type: Boolean, default: false },
    canMoveDown: { type: Boolean, default: false },
    canIndent: { type: Boolean, default: false },
    canOutdent: { type: Boolean, default: false },
    isChild: { type: Boolean, default: false },
    typeLabel: { type: Function as unknown as () => (value: MenuItemType) => string, required: true },
    itemUrl: { type: Function as unknown as () => (item: MenuItem) => string, required: true },
    itemIcon: { type: Function as unknown as () => (item: MenuItem) => string, required: true }
  },
  emits: ['toggle', 'move', 'indent', 'outdent', 'duplicate', 'delete'],
  setup(props, { emit }) {
    const UIcon = resolveComponent('UIcon')
    const UButton = resolveComponent('UButton')
    const UInput = resolveComponent('UInput')
    const UBadge = resolveComponent('UBadge')
    const UFormField = resolveComponent('UFormField')

    return () => h('article', {
      class: [
        'tree-item',
        props.isChild ? 'is-child' : '',
        props.expandedItemId === props.item.id ? 'is-expanded' : '',
        !props.item.isVisible ? 'is-muted' : ''
      ]
    }, [
      h('div', { class: 'tree-item-row' }, [
        h('button', { type: 'button', class: 'tree-grip', title: '调整排序' }, [
          h(UIcon, { name: 'i-lucide-grip-vertical', class: 'size-4' })
        ]),
        h('button', { type: 'button', class: 'tree-main', onClick: () => emit('toggle', props.item) }, [
          h('span', { class: 'tree-icon' }, [
            h(UIcon, { name: props.itemIcon(props.item), class: 'size-4' })
          ]),
          h('span', { class: 'tree-copy' }, [
            h('strong', props.item.title || '未命名菜单项'),
            h('small', [
              props.itemUrl(props.item),
              props.item.targetBlank ? h(UIcon, { name: 'i-lucide-external-link', class: 'size-3' }) : null
            ])
          ])
        ]),
        h('div', { class: 'tree-meta' }, [
          h(UBadge, { color: 'neutral', variant: 'soft', size: 'xs' }, () => props.typeLabel(props.item.type)),
          props.children.length ? h(UBadge, { color: 'primary', variant: 'soft', size: 'xs' }, () => `${props.children.length} 项`) : null,
          !props.item.isVisible ? h(UBadge, { color: 'warning', variant: 'soft', size: 'xs' }, () => '隐藏') : null
        ]),
        h('div', { class: 'tree-actions' }, [
          h(UButton, { size: 'xs', color: 'neutral', variant: 'ghost', icon: 'i-lucide-arrow-up', disabled: !props.canMoveUp, onClick: () => emit('move', props.item, -1) }),
          h(UButton, { size: 'xs', color: 'neutral', variant: 'ghost', icon: 'i-lucide-arrow-down', disabled: !props.canMoveDown, onClick: () => emit('move', props.item, 1) }),
          h(UButton, { size: 'xs', color: 'neutral', variant: 'ghost', icon: 'i-lucide-corner-down-right', disabled: !props.canIndent, onClick: () => emit('indent', props.item) }),
          h(UButton, { size: 'xs', color: 'neutral', variant: 'ghost', icon: 'i-lucide-corner-up-left', disabled: !props.canOutdent, onClick: () => emit('outdent', props.item) }),
          h(UButton, { size: 'xs', color: 'neutral', variant: 'ghost', icon: 'i-lucide-copy', onClick: () => emit('duplicate', props.item) })
        ]),
        h('button', { type: 'button', class: 'tree-toggle', onClick: () => emit('toggle', props.item) }, [
          h(UIcon, { name: 'i-lucide-sliders-horizontal', class: 'size-4' })
        ])
      ]),
      props.expandedItemId === props.item.id
        ? h('div', { class: 'tree-editor' }, [
            h(UFormField, { label: '显示名称' }, () => h(UInput, { modelValue: props.item.title, 'onUpdate:modelValue': (value: string) => { props.item.title = value } })),
            h(UFormField, { label: 'URL' }, () => h(UInput, { modelValue: props.item.url, placeholder: '/about 或 https://...', 'onUpdate:modelValue': (value: string) => { props.item.url = value } })),
            h(UFormField, { label: '类型' }, () => h('select', {
              class: 'menu-select',
              value: props.item.type,
              onChange: (event: Event) => { props.item.type = (event.target as HTMLSelectElement).value as MenuItemType }
            }, props.itemTypeOptions.map((option) => h('option', { value: option.value }, option.label)))),
            h(UFormField, { label: '图标' }, () => h(UInput, { modelValue: props.item.icon, placeholder: 'i-lucide-home', 'onUpdate:modelValue': (value: string) => { props.item.icon = value } })),
            h(UFormField, { label: '标记' }, () => h(UInput, { modelValue: props.item.badge, placeholder: '可选', 'onUpdate:modelValue': (value: string) => { props.item.badge = value } })),
            h('label', { class: 'menu-check' }, [
              h('input', { type: 'checkbox', checked: props.item.targetBlank, onChange: (event: Event) => { props.item.targetBlank = (event.target as HTMLInputElement).checked } }),
              h('span', '在新标签页中打开')
            ]),
            h('label', { class: 'menu-check' }, [
              h('input', { type: 'checkbox', checked: props.item.isVisible, onChange: (event: Event) => { props.item.isVisible = (event.target as HTMLInputElement).checked } }),
              h('span', '显示该菜单项')
            ]),
            h('button', { type: 'button', class: 'tree-delete', onClick: () => emit('delete', props.item.id) }, '删除')
          ])
        : null
    ])
  }
})

const toast = useToast()
const saving = ref(false)
const menus = ref<MenuGroup[]>([])
const snapshot = ref('')
const selectedMenuId = ref<number | null>(null)
const expandedItemId = ref<number | null>(null)
const showAddPanel = ref(false)

const itemForm = reactive({
  type: 'CUSTOM' as MenuItemType,
  title: '',
  url: ''
})

const locationOptions: Array<{ label: string, value: MenuLocation }> = [
  { label: '主菜单', value: 'PRIMARY' },
  { label: '页脚链接', value: 'FOOTER' },
  { label: '移动端菜单', value: 'MOBILE' },
  { label: '社交媒体', value: 'CUSTOM' }
]

const itemTypeOptions: Array<{ label: string, value: MenuItemType }> = [
  { label: '自定义链接', value: 'CUSTOM' },
  { label: '首页', value: 'HOME' },
  { label: '归档', value: 'ARCHIVE' },
  { label: '文章', value: 'POST' },
  { label: '分类', value: 'CATEGORY' },
  { label: '标签', value: 'TAG' },
  { label: '页面', value: 'PAGE' }
]

const quickAddOptions: Array<{ label: string, type: MenuItemType, icon: string, title: string, url: string }> = [
  { label: '自定义链接', type: 'CUSTOM', icon: 'i-lucide-link', title: '', url: '' },
  { label: '首页', type: 'HOME', icon: 'i-lucide-house', title: '首页', url: '/' },
  { label: '分类', type: 'CATEGORY', icon: 'i-lucide-folder', title: '内容分类', url: '/categories' },
  { label: '页面', type: 'PAGE', icon: 'i-lucide-file-text', title: '关于我', url: '/about' },
  { label: '外链', type: 'CUSTOM', icon: 'i-lucide-globe', title: 'GitHub', url: 'https://github.com/yourname' }
]

const { data } = await useFetch<{ data: MenuGroup[] }>('/api/admin/menus')

watch(data, (val) => {
  if (val?.data) {
    setMenus(val.data)
  }
}, { immediate: true })

const selectedMenu = computed(() => menus.value.find((menu) => menu.id === selectedMenuId.value) || null)
const selectedItems = computed(() => normalizeItems(selectedMenu.value?.items || []))
const treeItems = computed<TreeNode[]>(() => {
  const roots = selectedItems.value.filter((item) => !item.parentId)
  return roots.map((item) => ({
    item,
    children: selectedItems.value.filter((child) => child.parentId === item.id)
  }))
})
const isDirty = computed(() => JSON.stringify(menus.value) !== snapshot.value)

function setMenus(value: MenuGroup[]) {
  menus.value = structuredClone(value)
  snapshot.value = JSON.stringify(menus.value)
  selectedMenuId.value = menus.value.find((menu) => menu.location === 'PRIMARY')?.id ?? menus.value[0]?.id ?? null
  expandedItemId.value = null
  showAddPanel.value = false
}

function resetMenus() {
  if (!snapshot.value) return
  menus.value = JSON.parse(snapshot.value)
  selectedMenuId.value = menus.value.find((menu) => menu.location === 'PRIMARY')?.id ?? menus.value[0]?.id ?? null
  expandedItemId.value = null
  showAddPanel.value = false
}

function selectMenu(menu: MenuGroup) {
  selectedMenuId.value = menu.id
  expandedItemId.value = null
}

function createQuickMenu() {
  const menu: MenuGroup = {
    id: createTempId(),
    name: `新菜单 ${menus.value.length + 1}`,
    slug: '',
    description: '',
    location: menus.value.length === 0 ? 'PRIMARY' : 'CUSTOM',
    isActive: true,
    items: []
  }
  menus.value.push(menu)
  selectedMenuId.value = menu.id
  showAddPanel.value = true
}

function setPrimaryMenu() {
  if (!selectedMenu.value) return
  const id = selectedMenu.value.id
  menus.value.forEach((menu) => {
    menu.location = menu.id === id ? 'PRIMARY' : (menu.location === 'PRIMARY' ? 'CUSTOM' : menu.location)
  })
}

function deleteMenu() {
  if (!selectedMenu.value) return
  if (!window.confirm(`确定删除菜单“${selectedMenu.value.name}”吗？`)) return

  const deletedId = selectedMenu.value.id
  menus.value = menus.value.filter((menu) => menu.id !== deletedId)
  if (!menus.value.some((menu) => menu.location === 'PRIMARY') && menus.value[0]) {
    menus.value[0].location = 'PRIMARY'
  }
  selectedMenuId.value = menus.value[0]?.id ?? null
}

function toggleAddPanel() {
  showAddPanel.value = !showAddPanel.value
}

function pickAddType(type: MenuItemType) {
  const preset = quickAddOptions.find((option) => option.type === type && (type !== 'CUSTOM' || option.title || option.url)) || quickAddOptions.find((option) => option.type === type)
  itemForm.type = type
  if (preset) {
    itemForm.title = preset.title
    itemForm.url = preset.url
  }
}

function addMenuItem() {
  if (!selectedMenu.value) return
  const title = itemForm.title.trim()
  const url = itemForm.url.trim()
  if (!title || !url) {
    toast.add({ title: '请填写菜单项名称和链接', color: 'warning' })
    return
  }

  const item: MenuItem = {
    id: createTempId(),
    parentId: null,
    title,
    url,
    type: itemForm.type,
    targetId: null,
    targetSlug: '',
    targetBlank: url.startsWith('http'),
    badge: '',
    icon: '',
    sort: nextSort(null),
    isVisible: true
  }
  selectedMenu.value.items.push(item)
  expandedItemId.value = item.id
  itemForm.type = 'CUSTOM'
  itemForm.title = ''
  itemForm.url = ''
}

function toggleItem(item: MenuItem) {
  expandedItemId.value = expandedItemId.value === item.id ? null : item.id
}

function moveItem(item: MenuItem, direction: -1 | 1) {
  if (!selectedMenu.value) return
  const siblings = getSiblings(item)
  const index = siblings.findIndex((sibling) => sibling.id === item.id)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return

  const target = siblings[targetIndex]
  if (!target) return
  const currentSort = item.sort
  item.sort = target.sort
  target.sort = currentSort
  normalizeSort(item.parentId)
}

function indentItem(item: MenuItem) {
  if (!selectedMenu.value || item.parentId) return
  const roots = getSiblings(item)
  const index = roots.findIndex((sibling) => sibling.id === item.id)
  const parent = roots[index - 1]
  if (!parent?.id) return
  item.parentId = parent.id
  item.sort = nextSort(parent.id)
  normalizeSort(null)
  normalizeSort(parent.id)
}

function outdentItem(item: MenuItem) {
  if (!selectedMenu.value || !item.parentId) return
  const parent = selectedMenu.value.items.find((menuItem) => menuItem.id === item.parentId)
  item.parentId = null
  item.sort = parent ? parent.sort + 1 : nextSort(null)
  normalizeSort(null)
}

function duplicateItem(item: MenuItem) {
  if (!selectedMenu.value) return
  const copy = {
    ...structuredClone(item),
    id: createTempId(),
    title: `${item.title} 副本`,
    sort: nextSort(item.parentId)
  }
  selectedMenu.value.items.push(copy)
  expandedItemId.value = copy.id
}

function deleteMenuItem(id: number | null) {
  if (!selectedMenu.value) return
  const childIds = selectedMenu.value.items.filter((item) => item.parentId === id).map((item) => item.id)
  selectedMenu.value.items = selectedMenu.value.items.filter((item) => item.id !== id && !childIds.includes(item.id))
  normalizeSort(null)
}

async function saveMenus() {
  saving.value = true
  try {
    const saved = await $fetch<{ data: MenuGroup[] }>('/api/admin/menus', {
      method: 'PUT',
      body: menus.value.map((menu) => ({
        ...menu,
        id: menu.id,
        name: menu.name.trim(),
        slug: menu.slug?.trim() || '',
        description: menu.description?.trim() || '',
        location: menu.location,
        isActive: menu.isActive,
        items: normalizeItems(menu.items).map((item, index) => ({
          ...item,
          id: item.id,
          parentId: item.parentId,
          title: item.title.trim(),
          url: item.url.trim(),
          badge: item.badge?.trim() || '',
          icon: item.icon?.trim() || '',
          targetSlug: item.targetSlug?.trim() || '',
          sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : index
        }))
      }))
    })
    setMenus(saved.data)
    toast.add({ title: '菜单已保存', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '保存失败',
      description: error?.data?.message || error?.statusMessage || '请检查菜单名称和链接是否完整。',
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

function getSiblings(item: MenuItem) {
  return selectedItems.value.filter((sibling) => sibling.parentId === item.parentId)
}

function canMove(item: MenuItem, direction: -1 | 1) {
  const siblings = getSiblings(item)
  const index = siblings.findIndex((sibling) => sibling.id === item.id)
  return direction === -1 ? index > 0 : index >= 0 && index < siblings.length - 1
}

function canIndent(item: MenuItem) {
  if (item.parentId) return false
  const siblings = getSiblings(item)
  return siblings.findIndex((sibling) => sibling.id === item.id) > 0
}

function nextSort(parentId: number | null) {
  const siblings = selectedMenu.value?.items.filter((item) => item.parentId === parentId) || []
  return siblings.length ? Math.max(...siblings.map((item) => item.sort)) + 1 : 0
}

function normalizeSort(parentId: number | null) {
  if (!selectedMenu.value) return
  normalizeItems(selectedMenu.value.items)
    .filter((item) => item.parentId === parentId)
    .forEach((item, index) => {
      item.sort = index
    })
}

function normalizeItems(items: MenuItem[]) {
  return items.slice().sort((a, b) => {
    if ((a.parentId || 0) !== (b.parentId || 0)) return (a.parentId || 0) - (b.parentId || 0)
    if (a.sort !== b.sort) return a.sort - b.sort
    return (a.id || 0) - (b.id || 0)
  })
}

function locationLabel(value: MenuLocation) {
  return locationOptions.find((option) => option.value === value)?.label || value
}

function menuLocationHint(menu: MenuGroup) {
  if (menu.location === 'PRIMARY') return '显示在网站顶部'
  if (menu.location === 'FOOTER') return '显示在网站底部'
  if (menu.location === 'MOBILE') return '移动端快捷导航'
  return menu.description || '创建社交图标'
}

function typeLabel(value: MenuItemType) {
  return itemTypeOptions.find((option) => option.value === value)?.label || value
}

function itemUrl(item: MenuItem) {
  if (item.url) return item.url
  if (item.type === 'HOME') return '/'
  if (item.type === 'ARCHIVE') return '/archive'
  return '未设置链接'
}

function itemIcon(item: MenuItem) {
  if (item.icon) return item.icon
  if (item.type === 'HOME') return 'i-lucide-house'
  if (item.type === 'ARCHIVE') return 'i-lucide-archive'
  if (item.type === 'CATEGORY') return 'i-lucide-folder'
  if (item.type === 'TAG') return 'i-lucide-tag'
  if (item.type === 'POST') return 'i-lucide-newspaper'
  if (item.type === 'PAGE') return 'i-lucide-file-text'
  return item.url?.startsWith('http') ? 'i-lucide-globe' : 'i-lucide-link'
}

function createTempId() {
  return -Date.now() - Math.floor(Math.random() * 1000)
}
</script>

<style scoped>
.menu-page {
  display: grid;
  height: calc(100vh - 2rem);
  min-height: 680px;
  overflow: hidden;
  border: 1px solid #dfe7f3;
  border-radius: 0.875rem;
  background: #f5f8fc;
}

.menu-topbar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid #dfe7f3;
  background: rgba(255, 255, 255, 0.94);
  padding: 0.625rem 0.875rem;
  backdrop-filter: blur(16px);
}

.menu-title-block,
.menu-topbar-actions,
.menu-card-head,
.menu-settings-row,
.menu-render-hint,
.tree-item-row,
.tree-actions,
.tree-meta,
.menu-check {
  display: flex;
  align-items: center;
}

.menu-title-block {
  gap: 0.625rem;
  min-width: 0;
}

.menu-title-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 0.5rem;
  background: #4f46e5;
  color: #fff;
}

.menu-title-block strong {
  display: block;
  color: #0f172a;
  font-size: 1rem;
  line-height: 1.15;
}

.menu-title-block small {
  display: block;
  margin-top: 0.125rem;
  color: #64748b;
  font-size: 0.75rem;
}

.menu-topbar-actions {
  gap: 0.5rem;
}

.menu-shell {
  display: grid;
  min-height: 0;
  grid-template-columns: 17rem minmax(0, 1fr);
}

.menu-groups {
  overflow-y: auto;
  border-right: 1px solid #dfe7f3;
  padding: 0.75rem;
}

.menu-groups-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.625rem;
  color: #334155;
  font-size: 0.8125rem;
  font-weight: 700;
}

.menu-group-button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  background: transparent;
  padding: 0.75rem;
  text-align: left;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.menu-group-button + .menu-group-button {
  margin-top: 0.375rem;
}

.menu-group-button:hover,
.menu-group-button.is-active {
  border-color: #c7d2fe;
  background: #fff;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.08);
}

.menu-group-button.is-active {
  color: #3730a3;
}

.menu-group-button strong,
.menu-group-button small {
  display: block;
}

.menu-group-button strong {
  font-size: 0.9rem;
}

.menu-group-button small {
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.75rem;
}

.menu-workspace {
  display: grid;
  min-width: 0;
  min-height: 0;
  align-content: start;
  gap: 0.875rem;
  overflow-y: auto;
  padding: 0.875rem;
}

.menu-settings-card,
.menu-structure-card {
  overflow: hidden;
  border: 1px solid #dfe7f3;
  border-radius: 0.875rem;
  background: #fff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}

.menu-card-head {
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.125rem 0.875rem;
}

.menu-card-head.is-sticky {
  position: sticky;
  top: 0;
  z-index: 2;
  border-bottom: 1px solid #edf2f7;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);
}

.menu-card-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
}

.menu-card-head p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
}

.menu-card-head code {
  border-radius: 0.375rem;
  background: #eef2ff;
  color: #4338ca;
  font-size: 0.75rem;
  padding: 0.125rem 0.375rem;
}

.menu-settings-row {
  gap: 0.75rem;
  padding: 0 1.125rem 1rem;
}

.menu-settings-row > :first-child,
.menu-settings-row > :nth-child(2) {
  flex: 1 1 13rem;
}

.menu-settings-row > :nth-child(3) {
  flex: 0 0 12rem;
}

.menu-select {
  width: 100%;
  height: 2.25rem;
  border: 1px solid #d6deea;
  border-radius: 0.5rem;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
  padding: 0 0.625rem;
}

.menu-check {
  gap: 0.5rem;
  color: #334155;
  font-size: 0.8125rem;
  font-weight: 650;
}

.menu-check-inline {
  align-self: end;
  min-height: 2.25rem;
}

.menu-check input {
  width: 0.95rem;
  height: 0.95rem;
  accent-color: #4f46e5;
}

.menu-render-hint {
  gap: 1rem;
  border-top: 1px solid #edf2f7;
  padding: 0.875rem 1.125rem 1.125rem;
}

.menu-render-hint button {
  border: 0;
  border-radius: 0.625rem;
  background: #f1f5f9;
  color: #334155;
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
}

.menu-render-hint button.is-on {
  background: #eef2ff;
  color: #3730a3;
}

.menu-render-hint span {
  color: #64748b;
  font-size: 0.8125rem;
}

.menu-add-panel {
  border-bottom: 1px solid #edf2f7;
  background: #f8fafc;
  padding: 0.875rem 1.125rem;
}

.menu-add-types {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.menu-add-types button {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 1px solid #dbe4f0;
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font-size: 0.8125rem;
  font-weight: 650;
  padding: 0.375rem 0.625rem;
}

.menu-add-types button.is-active,
.menu-add-types button:hover {
  border-color: #c7d2fe;
  background: #eef2ff;
  color: #3730a3;
}

.menu-add-fields {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr) auto;
  gap: 0.625rem;
}

.menu-tree-scroll {
  max-height: calc(100vh - 23rem);
  min-height: 20rem;
  overflow-y: auto;
  padding: 1rem 1.125rem;
}

.menu-tree {
  display: grid;
  gap: 0.625rem;
}

.tree-item {
  overflow: hidden;
  border: 1px solid #dbe4f0;
  border-radius: 0.75rem;
  background: #fff;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.tree-item:hover,
.tree-item.is-expanded {
  border-color: #c7d2fe;
  box-shadow: 0 10px 24px rgba(79, 70, 229, 0.08);
}

.tree-item.is-muted {
  background: #f8fafc;
}

.tree-item-row {
  gap: 0.625rem;
  min-height: 3.25rem;
  padding: 0.625rem 0.75rem;
}

.tree-grip,
.tree-toggle {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 0.5rem;
  background: #f1f5f9;
  color: #94a3b8;
}

.tree-grip {
  width: 1.75rem;
  height: 1.75rem;
}

.tree-toggle {
  width: 1.875rem;
  height: 1.875rem;
  background: transparent;
  color: #64748b;
}

.tree-toggle:hover {
  background: #eef2ff;
  color: #4338ca;
}

.tree-main {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  gap: 0.625rem;
  border: 0;
  background: transparent;
  text-align: left;
}

.tree-icon {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.5rem;
  background: #f1f5f9;
  color: #64748b;
}

.tree-copy {
  min-width: 0;
}

.tree-copy strong,
.tree-copy small {
  display: block;
}

.tree-copy strong {
  color: #0f172a;
  font-size: 0.875rem;
  font-weight: 750;
}

.tree-copy small {
  display: inline-flex;
  max-width: 26rem;
  align-items: center;
  gap: 0.375rem;
  overflow: hidden;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-meta,
.tree-actions {
  gap: 0.25rem;
}

.menu-child-list {
  display: grid;
  gap: 0.625rem;
  margin-left: 1.25rem;
  padding-left: 1.25rem;
  border-left: 1px solid #dbe4f0;
}

.menu-child-list .tree-item:first-child {
  margin-top: -0.125rem;
}

.tree-item.is-child {
  border-color: #e2e8f0;
}

.tree-editor {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) 11rem;
  gap: 0.75rem;
  border-top: 1px solid #edf2f7;
  background: #f8fafc;
  padding: 0.875rem;
}

.tree-delete {
  align-self: end;
  justify-self: end;
  border: 0;
  background: transparent;
  color: #e11d48;
  font-size: 0.8125rem;
  font-weight: 700;
}

.menu-empty-add {
  display: grid;
  width: 100%;
  min-height: 10rem;
  place-items: center;
  border: 1px dashed #cbd5e1;
  border-radius: 0.875rem;
  background: #fff;
  color: #64748b;
  text-align: center;
}

.menu-empty-add span {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  place-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  color: #4f46e5;
}

.menu-empty-add strong {
  margin-top: 0.5rem;
  color: #0f172a;
  font-size: 0.9rem;
}

.menu-empty-add small {
  margin-top: 0.125rem;
  font-size: 0.78rem;
}

@media (max-width: 1100px) {
  .menu-page {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .menu-shell {
    grid-template-columns: 1fr;
  }

  .menu-groups {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid #dfe7f3;
  }

  .menu-groups-head {
    min-width: max-content;
    margin: 0;
  }

  .menu-group-button {
    min-width: 13rem;
  }

  .menu-group-button + .menu-group-button {
    margin-top: 0;
  }

  .menu-tree-scroll {
    max-height: none;
  }
}

@media (max-width: 760px) {
  .menu-topbar,
  .menu-settings-row,
  .menu-render-hint {
    align-items: stretch;
    flex-direction: column;
  }

  .menu-topbar-actions,
  .tree-actions,
  .tree-meta {
    flex-wrap: wrap;
  }

  .menu-add-fields,
  .tree-editor {
    grid-template-columns: 1fr;
  }

  .tree-item-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .tree-main {
    flex: 1 1 calc(100% - 3rem);
  }
}
</style>
