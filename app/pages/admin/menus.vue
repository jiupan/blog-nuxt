<template>
  <div class="menu-admin-page">
    <header class="menu-admin-header">
      <div class="menu-admin-title">
        <span class="menu-admin-icon">
          <UIcon name="i-lucide-panels-top-left" class="size-5" />
        </span>
        <div>
          <h1>菜单管理</h1>
          <p>配置您的博客前台导航结构，支持多层级嵌套。</p>
        </div>
      </div>

      <div class="menu-admin-actions">
        <UBadge v-if="isDirty" color="warning" variant="soft">有未保存修改</UBadge>
        <UButton
          v-if="isDirty"
          color="neutral"
          variant="ghost"
          icon="i-lucide-rotate-ccw"
          @click="resetMenus"
        >
          丢弃修改
        </UButton>
        <UButton
          v-if="isDirty"
          icon="i-lucide-save"
          :loading="saving"
          @click="saveMenus"
        >
          保存
        </UButton>
        <UButton icon="i-lucide-plus" @click="addRootMenuItem">添加顶级菜单</UButton>
      </div>
    </header>

    <div v-if="selectedMenu" class="menu-admin-layout">
      <section class="menu-list-panel">
        <div class="menu-tabs">
          <button
            v-for="menu in menus"
            :key="menu.id ?? menu.name"
            type="button"
            class="menu-tab"
            :class="{ 'is-active': selectedMenuId === menu.id }"
            @click="selectMenu(menu)"
          >
            {{ menu.name || locationLabel(normalizeMenuLocation(menu.location)) }}
          </button>
        </div>

        <div v-if="treeItems.length" class="menu-tree-area">
          <template v-for="root in treeItems" :key="root.item.id">
            <MenuTreeItem
              :item="root.item"
              :children="root.children"
              :selected-item-id="activeItemId"
              :can-move-up="canMove(root.item, -1)"
              :can-move-down="canMove(root.item, 1)"
              :can-indent="canIndent(root.item)"
              :can-outdent="false"
              :can-add-child="true"
              :type-label="typeLabel"
              :item-url="itemUrl"
              :item-icon="itemIcon"
              @select="selectItem"
              @add-child="addChildMenuItem"
              @move="moveItem"
              @indent="indentItem"
              @outdent="outdentItem"
              @duplicate="duplicateItem"
              @delete="deleteMenuItem"
            />

            <div v-if="root.children.length" class="menu-child-area">
              <MenuTreeItem
                v-for="child in root.children"
                :key="child.id ?? `${root.item.id}-${child.title}`"
                :item="child"
                :children="[]"
                :selected-item-id="activeItemId"
                :can-move-up="canMove(child, -1)"
                :can-move-down="canMove(child, 1)"
                :can-indent="false"
                :can-outdent="true"
                :can-add-child="false"
                :type-label="typeLabel"
                :item-url="itemUrl"
                :item-icon="itemIcon"
                is-child
                @select="selectItem"
                @add-child="addChildMenuItem"
                @move="moveItem"
                @indent="indentItem"
                @outdent="outdentItem"
                @duplicate="duplicateItem"
                @delete="deleteMenuItem"
              />
            </div>
          </template>
        </div>

        <button v-else type="button" class="menu-empty-state" @click="addRootMenuItem">
          <span><UIcon name="i-lucide-plus" class="size-5" /></span>
          <strong>添加第一个菜单项</strong>
          <small>可以添加首页、分类、页面或外部链接。</small>
        </button>
      </section>

      <aside class="menu-property-card">
        <div class="property-card-head">
          <span class="property-head-icon">
            <UIcon name="i-lucide-settings" class="size-4" />
          </span>
          <h2>菜单属性设置</h2>
        </div>

        <template v-if="activeItem">
          <div class="property-card-body">
            <label class="property-field">
              <span>菜单标题</span>
              <input v-model="activeItem.title" type="text" placeholder="请输入菜单标题" />
            </label>

            <label class="property-field">
              <span>菜单类型</span>
              <select v-model="activeItem.type" @change="syncActiveItemType">
                <option v-for="option in itemTypeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label v-if="activeItem.type === 'CATEGORY'" class="property-field">
              <span>选择分类</span>
              <select v-model="activeItem.targetSlug" @change="syncActiveItemTarget">
                <option value="">全部分类</option>
                <option v-for="item in categories" :key="item.id" :value="item.slug">{{ item.name }}</option>
              </select>
            </label>

            <label v-else-if="activeItem.type === 'TAG'" class="property-field">
              <span>选择标签</span>
              <select v-model="activeItem.targetSlug" @change="syncActiveItemTarget">
                <option value="">全部标签</option>
                <option v-for="item in tags" :key="item.id" :value="item.slug">{{ item.name }}</option>
              </select>
            </label>

            <label v-else-if="activeItem.type === 'PAGE'" class="property-field">
              <span>选择页面</span>
              <select v-model="activeItem.url" @change="syncActiveItemPage">
                <option v-for="page in pageOptions" :key="page.url" :value="page.url">{{ page.label }}</option>
              </select>
            </label>

            <label v-else class="property-field">
              <span>路由路径 / 外部链接</span>
              <input v-model="activeItem.url" type="text" placeholder="/about 或 https://..." />
            </label>

            <div class="property-field">
              <span>菜单图标</span>
              <div class="icon-preset-grid">
                <button
                  v-for="icon in iconPresets"
                  :key="icon.name"
                  type="button"
                  class="icon-preset-button"
                  :class="{ 'is-active': (activeItem.icon || itemIcon(activeItem)) === icon.name }"
                  :title="icon.label"
                  @click="activeItem.icon = icon.name"
                >
                  <UIcon :name="icon.name" class="size-5" />
                </button>
              </div>
            </div>

            <div class="property-switches">
              <label class="property-switch-row">
                <span class="switch-label">
                  <UIcon name="i-lucide-eye" class="size-4" />
                  显示在导航栏
                </span>
                <input v-model="activeItem.isVisible" type="checkbox" />
                <span class="switch-track" />
              </label>

              <label class="property-switch-row">
                <span class="switch-label">
                  <UIcon name="i-lucide-external-link" class="size-4" />
                  在新标签页打开
                </span>
                <input v-model="activeItem.targetBlank" type="checkbox" />
                <span class="switch-track" />
              </label>
            </div>

            <div class="property-actions">
              <button type="button" class="danger-text-button" @click="deleteMenuItem(activeItem.id)">删除此项</button>
              <button type="button" class="save-button" :disabled="saving" @click="saveMenus">
                <UIcon name="i-lucide-save" class="size-4" />
                {{ saving ? '保存中...' : '保存更改' }}
              </button>
            </div>
          </div>
        </template>

        <div v-else class="property-empty">
          <UIcon name="i-lucide-mouse-pointer-click" class="size-7" />
          <strong>请选择一个菜单项</strong>
          <span>点击左侧菜单后，可以在这里编辑标题、路径、图标和显示状态。</span>
        </div>
      </aside>
    </div>

    <div v-else class="menu-no-data">
      <UIcon name="i-lucide-list-plus" class="size-8" />
      <strong>还没有菜单组</strong>
      <span>先创建一个菜单组，再添加导航项。</span>
      <UButton icon="i-lucide-plus" @click="createQuickMenu">创建菜单组</UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h, resolveComponent } from 'vue'
import type { ApiResult } from '~~/types/api'
import type { MenuGroup, MenuItem, MenuItemType, MenuLocation } from '~~/types/dto/menu'
import type { TaxonomyItem } from '~~/types/dto/taxonomy'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

type TreeNode = {
  item: MenuItem
  children: MenuItem[]
}

const MenuTreeItem = defineComponent({
  name: 'MenuTreeItem',
  props: {
    item: { type: Object as () => MenuItem, required: true },
    children: { type: Array as () => MenuItem[], required: true },
    selectedItemId: { type: Number as () => number | null, default: null },
    canMoveUp: { type: Boolean, default: false },
    canMoveDown: { type: Boolean, default: false },
    canIndent: { type: Boolean, default: false },
    canOutdent: { type: Boolean, default: false },
    canAddChild: { type: Boolean, default: false },
    isChild: { type: Boolean, default: false },
    typeLabel: { type: Function as unknown as () => (value: MenuItemType) => string, required: true },
    itemUrl: { type: Function as unknown as () => (item: MenuItem) => string, required: true },
    itemIcon: { type: Function as unknown as () => (item: MenuItem) => string, required: true }
  },
  emits: ['select', 'add-child', 'move', 'indent', 'outdent', 'duplicate', 'delete'],
  setup(props, { emit }) {
    const UIcon = resolveComponent('UIcon')

    const emitAction = (event: MouseEvent, name: 'add-child' | 'move' | 'indent' | 'outdent' | 'duplicate' | 'delete', payload?: unknown) => {
      event.stopPropagation()
      if (name === 'add-child') emit('add-child', props.item)
      if (name === 'move') emit('move', props.item, payload)
      if (name === 'indent') emit('indent', props.item)
      if (name === 'outdent') emit('outdent', props.item)
      if (name === 'duplicate') emit('duplicate', props.item)
      if (name === 'delete') emit('delete', props.item.id)
    }

    return () => h('article', {
      class: [
        'menu-node',
        props.isChild ? 'is-child' : '',
        props.selectedItemId === props.item.id ? 'is-active' : '',
        !props.item.isVisible ? 'is-muted' : ''
      ],
      onClick: () => emit('select', props.item)
    }, [
      h('button', { type: 'button', class: 'node-grip', title: '拖拽排序' }, [
        h(UIcon, { name: 'i-lucide-grip-vertical', class: 'size-4' })
      ]),
      h('span', { class: 'node-fold' }, [
        props.children.length ? h(UIcon, { name: 'i-lucide-chevron-down', class: 'size-4' }) : null
      ]),
      h('span', { class: 'node-icon' }, [
        h(UIcon, { name: props.itemIcon(props.item), class: 'size-5' })
      ]),
      h('span', { class: 'node-content' }, [
        h('strong', props.item.title || '未命名菜单'),
        h('small', [
          props.itemUrl(props.item),
          props.item.targetBlank ? h(UIcon, { name: 'i-lucide-external-link', class: 'size-3' }) : null
        ])
      ]),
      h('div', { class: 'node-tools' }, [
        props.canAddChild ? h('button', {
          type: 'button',
          title: '添加子菜单',
          onClick: (event: MouseEvent) => emitAction(event, 'add-child')
        }, [h(UIcon, { name: 'i-lucide-plus', class: 'size-4' })]) : null,
        props.canAddChild ? h('span', { class: 'node-tool-divider' }) : null,
        h('button', {
          type: 'button',
          title: '上移',
          disabled: !props.canMoveUp,
          onClick: (event: MouseEvent) => emitAction(event, 'move', -1)
        }, [h(UIcon, { name: 'i-lucide-arrow-up', class: 'size-4' })]),
        h('button', {
          type: 'button',
          title: '下移',
          disabled: !props.canMoveDown,
          onClick: (event: MouseEvent) => emitAction(event, 'move', 1)
        }, [h(UIcon, { name: 'i-lucide-arrow-down', class: 'size-4' })]),
        h('span', { class: 'node-tool-divider' }),
        h('button', {
          type: 'button',
          class: 'node-danger-tool',
          title: '删除',
          onClick: (event: MouseEvent) => emitAction(event, 'delete')
        }, [h(UIcon, { name: 'i-lucide-trash-2', class: 'size-4' })])
      ])
    ])
  }
})

const toast = useToast()
const saving = ref(false)
const menus = ref<MenuGroup[]>([])
const snapshot = ref('')
const selectedMenuId = ref<number | null>(null)
const expandedItemId = ref<number | null>(null)

const itemForm = reactive({
  type: 'CUSTOM' as MenuItemType,
  title: '',
  url: ''
})

const locationOptions: Array<{ label: string, value: MenuLocation }> = [
  { label: '主导航菜单', value: 'PRIMARY' },
  { label: '底部链接菜单', value: 'FOOTER' },
  { label: '移动端菜单', value: 'MOBILE' },
  { label: '社交媒体', value: 'CUSTOM' }
]

const itemTypeOptions: Array<{ label: string, value: MenuItemType }> = [
  { label: '自定义链接', value: 'CUSTOM' },
  { label: '首页', value: 'HOME' },
  { label: '归档', value: 'ARCHIVE' },
  { label: '分类', value: 'CATEGORY' },
  { label: '标签', value: 'TAG' },
  { label: '页面', value: 'PAGE' }
]

const pageOptions = [
  { label: '关于', url: '/about', slug: 'about' },
  { label: '友链', url: '/link', slug: 'link' },
  { label: '文章列表', url: '/posts', slug: 'posts' },
  { label: '后台', url: '/admin', slug: 'admin' }
]

const quickAddOptions: Array<{ label: string, type: MenuItemType, icon: string, title: string, url: string }> = [
  { label: '自定义链接', type: 'CUSTOM', icon: 'i-lucide-link', title: '', url: '' },
  { label: '首页', type: 'HOME', icon: 'i-lucide-house', title: '首页', url: '/' },
  { label: '分类', type: 'CATEGORY', icon: 'i-lucide-folder', title: '文章分类', url: '/categories' },
  { label: '页面', type: 'PAGE', icon: 'i-lucide-file-text', title: '关于我', url: '/about' },
  { label: '外链', type: 'CUSTOM', icon: 'i-lucide-globe', title: 'GitHub', url: 'https://github.com/yourname' }
]

const iconPresets: Array<{ label: string, name: string }> = [
  { label: '首页', name: 'i-lucide-house' },
  { label: '文章', name: 'i-lucide-file-text' },
  { label: '标签', name: 'i-lucide-tag' },
  { label: '用户', name: 'i-lucide-user' },
  { label: '搜索', name: 'i-lucide-search' },
  { label: '设置', name: 'i-lucide-settings' },
  { label: '链接', name: 'i-lucide-link' },
  { label: '说明', name: 'i-lucide-info' },
  { label: '评论', name: 'i-lucide-message-square' },
  { label: '归档', name: 'i-lucide-archive' },
  { label: '外链', name: 'i-lucide-monitor' },
  { label: '分类', name: 'i-lucide-grid-2x2' }
]

const selectedMenu = computed(() => menus.value.find((menu) => menu.id === selectedMenuId.value) || null)
const selectedItems = computed(() => normalizeItems(selectedMenu.value?.items || []))
const treeItems = computed<TreeNode[]>(() => {
  const roots = selectedItems.value.filter((item) => !item.parentId)
  return roots.map((item) => ({
    item,
    children: selectedItems.value.filter((child) => child.parentId === item.id)
  }))
})
const activeItem = computed(() => selectedItems.value.find((item) => item.id === expandedItemId.value) || selectedItems.value[0] || null)
const activeItemId = computed(() => activeItem.value?.id ?? null)
const isDirty = computed(() => JSON.stringify(menus.value) !== snapshot.value)

const [{ data }, { data: categoryData }, { data: tagData }] = await Promise.all([
  useFetch<ApiResult<MenuGroup[]>>('/api/admin/menus'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/admin/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/admin/tags')
])

const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

watch(data, (val) => {
  if (val?.data) {
    setMenus(val.data)
  }
}, { immediate: true })

function setMenus(value: MenuGroup[]) {
  menus.value = sortMenus(structuredClone(value))
  snapshot.value = JSON.stringify(menus.value)
  selectedMenuId.value = menus.value.find((menu) => menu.location === 'PRIMARY')?.id ?? menus.value[0]?.id ?? null
  expandedItemId.value = selectedMenu.value?.items?.[0]?.id ?? null
}

function resetMenus() {
  if (!snapshot.value) return
  menus.value = sortMenus(JSON.parse(snapshot.value))
  selectedMenuId.value = menus.value.find((menu) => menu.location === 'PRIMARY')?.id ?? menus.value[0]?.id ?? null
  expandedItemId.value = selectedMenu.value?.items?.[0]?.id ?? null
}

function selectMenu(menu: MenuGroup) {
  selectedMenuId.value = menu.id
  expandedItemId.value = normalizeItems(menu.items || [])[0]?.id ?? null
}

function selectItem(item: MenuItem) {
  expandedItemId.value = item.id
}

function syncActiveItemType() {
  if (!activeItem.value) return
  activeItem.value.targetId = null
  activeItem.value.targetSlug = ''
  activeItem.value.targetBlank = false

  if (activeItem.value.type === 'HOME') {
    activeItem.value.title = activeItem.value.title || '首页'
    activeItem.value.url = '/'
    activeItem.value.icon = activeItem.value.icon || itemIcon(activeItem.value)
    return
  }

  if (activeItem.value.type === 'ARCHIVE') {
    activeItem.value.title = activeItem.value.title || '归档'
    activeItem.value.url = '/archive'
    activeItem.value.icon = activeItem.value.icon || itemIcon(activeItem.value)
    return
  }

  if (activeItem.value.type === 'CATEGORY') {
    activeItem.value.title = activeItem.value.title || '分类'
    activeItem.value.url = ''
    activeItem.value.icon = activeItem.value.icon || itemIcon(activeItem.value)
    return
  }

  if (activeItem.value.type === 'TAG') {
    activeItem.value.title = activeItem.value.title || '标签'
    activeItem.value.url = ''
    activeItem.value.icon = activeItem.value.icon || itemIcon(activeItem.value)
    return
  }

  if (activeItem.value.type === 'PAGE') {
    const page = pageOptions.find((option) => option.url === activeItem.value?.url) || pageOptions[0]
    if (page) {
      activeItem.value.title = activeItem.value.title || page.label
      activeItem.value.url = page.url
      activeItem.value.targetSlug = page.slug
    }
    activeItem.value.icon = activeItem.value.icon || itemIcon(activeItem.value)
  }
}

function syncActiveItemTarget() {
  if (!activeItem.value) return

  if (activeItem.value.type === 'CATEGORY') {
    const category = categories.value.find((item) => item.slug === activeItem.value?.targetSlug)
    activeItem.value.url = category ? `/categories/${category.slug}` : ''
    activeItem.value.title = category?.name || activeItem.value.title || '分类'
  }

  if (activeItem.value.type === 'TAG') {
    const tag = tags.value.find((item) => item.slug === activeItem.value?.targetSlug)
    activeItem.value.url = tag ? `/tags/${tag.slug}` : ''
    activeItem.value.title = tag?.name || activeItem.value.title || '标签'
  }
}

function syncActiveItemPage() {
  if (!activeItem.value) return
  const page = pageOptions.find((option) => option.url === activeItem.value?.url)
  if (!page) return
  activeItem.value.title = page.label
  activeItem.value.targetSlug = page.slug
}

function sortMenus(value: MenuGroup[]) {
  const locationOrder: Record<MenuLocation, number> = {
    PRIMARY: 0,
    FOOTER: 1,
    MOBILE: 2,
    CUSTOM: 3
  }
  return value.slice().sort((a, b) => {
    const locationDiff = locationOrder[normalizeMenuLocation(a.location)] - locationOrder[normalizeMenuLocation(b.location)]
    return locationDiff || (a.id || 0) - (b.id || 0)
  })
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
  addRootMenuItem()
}

function addRootMenuItem() {
  if (!selectedMenu.value) {
    createQuickMenu()
    return
  }

  const item: MenuItem = {
    id: createTempId(),
    parentId: null,
    title: '新菜单',
    url: '/',
    type: 'PAGE',
    targetId: null,
    targetSlug: '',
    targetBlank: false,
    badge: '',
    icon: 'i-lucide-file-text',
    sort: nextSort(null),
    isVisible: true
  }
  selectedMenu.value.items.push(item)
  expandedItemId.value = item.id
}

function addChildMenuItem(parent: MenuItem) {
  if (!selectedMenu.value) return
  if (!parent.id) parent.id = createTempId()

  const item: MenuItem = {
    id: createTempId(),
    parentId: parent.id,
    title: '子菜单',
    url: '/',
    type: 'PAGE',
    targetId: null,
    targetSlug: '',
    targetBlank: false,
    badge: '',
    icon: 'i-lucide-file-text',
    sort: nextSort(parent.id),
    isVisible: true
  }

  selectedMenu.value.items.push(item)
  expandedItemId.value = item.id
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
  normalizeSort(item.parentId ?? null)
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
    sort: nextSort(item.parentId ?? null)
  }
  selectedMenu.value.items.push(copy)
  expandedItemId.value = copy.id
}

function deleteMenuItem(id: number | null) {
  if (!selectedMenu.value) return
  const childIds = selectedMenu.value.items.filter((item) => item.parentId === id).map((item) => item.id)
  selectedMenu.value.items = selectedMenu.value.items.filter((item) => item.id !== id && !childIds.includes(item.id))
  normalizeSort(null)
  expandedItemId.value = selectedItems.value[0]?.id ?? null
}

async function saveMenus() {
  saving.value = true
  try {
    const saved = await $fetch<ApiResult<MenuGroup[]>>('/api/admin/menus', {
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
          url: (item.url || '').trim(),
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
      description: getApiErrorMessage(error, { fallback: '请检查菜单名称和链接是否完整。' }),
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

function normalizeMenuLocation(value?: string | null): MenuLocation {
  return value === 'PRIMARY' || value === 'FOOTER' || value === 'MOBILE' || value === 'CUSTOM'
    ? value
    : 'CUSTOM'
}

function typeLabel(value: MenuItemType) {
  return itemTypeOptions.find((option) => option.value === value)?.label || value
}

function itemUrl(item: MenuItem) {
  if (item.url) return item.url
  if (item.type === 'HOME') return '/'
  if (item.type === 'ARCHIVE') return '/archive'
  if (item.type === 'CATEGORY' && item.targetSlug) return `/categories/${item.targetSlug}`
  if (item.type === 'CATEGORY') return '全部分类'
  if (item.type === 'TAG' && item.targetSlug) return `/tags/${item.targetSlug}`
  if (item.type === 'TAG') return '全部标签'
  return '未设置链接'
}

function itemIcon(item: MenuItem) {
  if (item.icon) return item.icon
  if (item.type === 'HOME') return 'i-lucide-house'
  if (item.type === 'ARCHIVE') return 'i-lucide-archive'
  if (item.type === 'CATEGORY') return 'i-lucide-grid-2x2'
  if (item.type === 'TAG') return 'i-lucide-tag'
  if (item.type === 'POST') return 'i-lucide-newspaper'
  if (item.type === 'PAGE') return 'i-lucide-file-text'
  return item.url?.startsWith('http') ? 'i-lucide-monitor' : 'i-lucide-link'
}

function createTempId() {
  return -Date.now() - Math.floor(Math.random() * 1000)
}
</script>

<style>
.menu-admin-page {
  display: grid;
  min-height: calc(100vh - 1.75rem);
  gap: 0.875rem;
  align-content: start;
  color: #0f172a;
}

.menu-admin-header {
  display: flex;
  min-height: 3.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  background: #ffffff;
  padding: 0.75rem 1rem;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.menu-admin-title,
.menu-admin-actions,
.menu-admin-icon,
.menu-node,
.node-content small,
.property-card-head,
.switch-label,
.property-actions {
  display: flex;
  align-items: center;
}

.menu-admin-title {
  gap: 0.75rem;
}

.menu-admin-icon {
  width: 2rem;
  height: 2rem;
  justify-content: center;
  border-radius: 0.6rem;
  background: #eef2ff;
  color: #4f46e5;
}

.menu-admin-title h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.1rem;
  font-weight: 850;
  letter-spacing: 0;
  line-height: 1.1;
}

.menu-admin-title p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.8rem;
}

.menu-admin-actions {
  gap: 0.75rem;
}

.menu-admin-layout {
  display: grid;
  grid-template-columns: minmax(560px, 1fr) 450px;
  gap: 0.875rem;
  align-items: start;
}

.menu-list-panel,
.menu-property-card {
  overflow: hidden;
}

.menu-list-panel {
  min-height: calc(100vh - 6.5rem);
}

.menu-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  border-bottom: 1px solid #e2e8f0;
  background: rgba(248, 250, 252, 0.72);
}

.menu-tab {
  min-height: 3.25rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 750;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.menu-tab:hover,
.menu-tab.is-active {
  color: #4f46e5;
  background: #fbfdff;
}

.menu-tab.is-active {
  border-bottom-color: #4f46e5;
}

.menu-tree-area {
  display: grid;
  gap: 0.625rem;
  padding: 1rem;
}

.menu-node {
  position: relative;
  min-height: 3.5rem;
  gap: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.65rem;
  background: #fff;
  padding: 0 1rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.menu-node:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.menu-node.is-active {
  border-color: #c7d2fe;
  background: #eef2ff;
  box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.06);
}

.menu-node.is-muted {
  opacity: 0.58;
}

.menu-node.is-child {
  position: relative;
  min-height: 3.1rem;
  border-color: #e8ecf1;
  background: #fafbfc;
}

/* 水平连接线：从子节点左边缘到垂直连接线 */
.menu-node.is-child::before {
  position: absolute;
  left: -1.625rem;
  top: 50%;
  width: 1.125rem;
  height: 2px;
  border-radius: 1px;
  background: #dbe4ff;
  content: '';
  transition: background 0.2s ease;
}

.menu-node.is-child:hover {
  border-color: #cbd5e1;
  background: #fff;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.05);
}

.menu-node.is-child.is-active {
  border-color: #c7d2fe;
  background: #eef2ff;
}

.menu-node.is-child.is-active::before {
  background: #a5b4fc;
}

.node-grip,
.node-tools button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease;
}

.node-grip {
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
}

.node-grip:hover,
.node-tools button:hover:not(:disabled) {
  background: #f1f5f9;
  color: #4f46e5;
}

.node-fold {
  display: grid;
  width: 1rem;
  height: 1.5rem;
  flex: 0 0 auto;
  place-items: center;
  color: #64748b;
}

.node-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.5rem;
  background: #f8fafc;
  color: #64748b;
}

.menu-node.is-active .node-icon {
  background: #fff;
  color: #4f46e5;
}

.node-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1 1 auto;
}

.node-content strong {
  display: block;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
}

.node-content small {
  gap: 0.35rem;
  margin-top: 0.25rem;
  overflow: hidden;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-type {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.72rem;
  padding: 0.25rem 0.55rem;
}

.node-tools {
  position: absolute;
  right: 1rem;
  top: 50%;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition: opacity 0.2s ease;
}

.menu-node:hover .node-tools {
  opacity: 1;
  pointer-events: auto;
}

.node-tools button {
  width: 1.875rem;
  height: 1.875rem;
  background: rgba(255, 255, 255, 0.92);
}

.node-tools .node-danger-tool:hover:not(:disabled) {
  background: #fef2f2;
  color: #ef4444;
}

.node-tool-divider {
  width: 1px;
  height: 1rem;
  background: #e2e8f0;
}

.node-tools button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.menu-child-area {
  position: relative;
  display: grid;
  gap: 0.375rem;
  margin: 0.375rem 0 0.375rem 1.25rem;
  padding-left: 2rem;
}

/* 垂直连接线，底部渐变淡出 */
.menu-child-area::before {
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 1.5rem;
  width: 2px;
  border-radius: 1px;
  background: linear-gradient(to bottom, #c7d2fe 0%, #e0e7ff 50%, transparent 100%);
  content: '';
}

.menu-empty-state,
.menu-no-data,
.property-empty {
  display: grid;
  place-items: center;
  text-align: center;
}

.menu-empty-state {
  min-height: 26rem;
  margin: 1.25rem;
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
}

.menu-empty-state span {
  display: grid;
  width: 3rem;
  height: 3rem;
  place-items: center;
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
}

.menu-empty-state strong,
.menu-no-data strong,
.property-empty strong {
  margin-top: 0.75rem;
  color: #0f172a;
  font-size: 1rem;
}

.menu-empty-state small,
.menu-no-data span,
.property-empty span {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 0.875rem;
}

.menu-property-card {
  position: sticky;
  top: 4.625rem;
}

.property-card-head {
  gap: 0.75rem;
  min-height: 4.875rem;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 1.5rem;
}

.property-head-icon {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  color: #64748b;
}

.property-card-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.property-card-body {
  padding: 1.5rem;
}

.property-field {
  display: grid;
  gap: 0.625rem;
  margin-bottom: 1.45rem;
}

.property-field > span {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 500;
}

.property-field input,
.property-field select {
  width: 100%;
  height: 2.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.45rem;
  background: #fff;
  color: #0f172a;
  font-size: 0.95rem;
  padding: 0 0.9rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.property-field input:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.property-field select:focus {
  border-color: #818cf8;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.icon-preset-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.625rem;
}

.icon-preset-button {
  display: grid;
  height: 2.5rem;
  place-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.icon-preset-button:hover,
.icon-preset-button.is-active {
  border-color: #818cf8;
  background: #eef2ff;
  color: #4f46e5;
}

.property-switches {
  display: grid;
  gap: 1.25rem;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.5rem 0 1.5rem;
}

.property-switch-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: #334155;
  font-size: 0.95rem;
  cursor: pointer;
}

.switch-label {
  gap: 0.625rem;
}

.property-switch-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.switch-track {
  position: relative;
  width: 3.25rem;
  height: 1.5rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background 0.2s ease;
}

.switch-track::after {
  position: absolute;
  left: 0.1875rem;
  top: 0.1875rem;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  content: '';
  transition: transform 0.2s ease;
}

.property-switch-row input:checked + .switch-track {
  background: #4f46e5;
}

.property-switch-row input:checked + .switch-track::after {
  transform: translateX(1.75rem);
}

.property-actions {
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.125rem;
}

.save-button {
  display: inline-flex;
  width: 100%;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 0;
  border-radius: 0.45rem;
  background: #0f172a;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
}

.save-button:hover:not(:disabled) {
  background: #020617;
  transform: translateY(-1px);
}

.save-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.danger-text-button {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: #ef4444;
  font-size: 0.85rem;
  cursor: pointer;
}

.danger-text-button:hover {
  text-decoration: underline;
}

.property-empty {
  min-height: 26rem;
  padding: 2rem;
  color: #94a3b8;
}

.menu-no-data {
  min-height: 28rem;
  border: 1px dashed #cbd5e1;
  border-radius: 1rem;
  background: #fff;
  color: #64748b;
  gap: 0.5rem;
}

@media (max-width: 1180px) {
  .menu-admin-layout {
    grid-template-columns: 1fr;
  }

  .menu-property-card {
    position: static;
  }
}

@media (max-width: 760px) {
  .menu-admin-page {
    padding: 0;
  }

  .menu-admin-header {
    flex-direction: column;
    margin-bottom: 1rem;
  }

  .menu-admin-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .menu-tabs {
    grid-template-columns: 1fr;
  }

  .menu-node {
    flex-wrap: wrap;
    padding: 0.75rem;
  }

  .node-tools {
    position: static;
    width: 100%;
    justify-content: flex-end;
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }

  .icon-preset-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .property-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}
</style>
