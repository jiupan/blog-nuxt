<template>
  <div class="menu-admin-page">
    <AdminPageActions>
      <span class="admin-save-state" :class="{ 'is-dirty': isDirty }">
        {{ isDirty ? '有未保存修改' : '已保存' }}
      </span>
      <UButton
        v-if="isDirty"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="saving"
        @click="resetMenus"
      >
        撤销修改
      </UButton>
      <UButton v-if="isDirty" icon="i-lucide-check" size="sm" :loading="saving" @click="saveMenus">
        保存菜单
      </UButton>
      <UButton
        icon="i-lucide-plus"
        size="sm"
        :disabled="saving || Boolean(menuLoadError)"
        aria-label="添加菜单项"
        @click="addRootMenuItem"
      >
        <span v-if="!isDirty">添加菜单项</span>
      </UButton>
    </AdminPageActions>
    <div v-if="menuLoadError" class="workspace-error" role="alert">
      <span>菜单加载失败，请重新加载后编辑。</span>
      <UButton color="neutral" variant="outline" @click="reloadMenus()"> 重新加载 </UButton>
    </div>
    <fieldset v-else :disabled="saving" class="menu-edit-body">
      <section v-if="selectedMenu" class="menu-live-preview workspace-panel">
        <div class="menu-preview-label">
          <UIcon name="i-lucide-monitor" class="size-4" />
          <span>导航预览</span>
          <small>随编辑实时更新</small>
        </div>
        <nav aria-label="菜单预览">
          <div
            v-for="root in visiblePreviewItems"
            :key="root.item.id ?? root.item.title"
            class="menu-preview-item"
            tabindex="0"
          >
            <span>
              <UIcon :name="itemIcon(root.item)" class="size-3.5" />
              {{ root.item.title || '未命名' }}
              <UIcon v-if="root.children.length" name="i-lucide-chevron-down" class="size-3" />
            </span>
            <div v-if="root.children.length" class="menu-preview-children">
              <span v-for="child in root.children" :key="child.id ?? child.title">
                {{ child.title || '未命名' }}
              </span>
            </div>
          </div>
          <span v-if="!visiblePreviewItems.length" class="menu-preview-empty">
            开启菜单项的“显示在导航栏”后，将在这里预览。
          </span>
        </nav>
      </section>
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

          <p class="menu-order-hint">
            点箭头展开。<span class="menu-desktop-hint">拖动手柄排序。</span><span class="menu-mobile-hint">点「···」调整顺序。</span>
            <template v-if="selectedMenu.location === 'FOOTER'">
              分类和标签没有子项时各显示前 4 项。用「＋」添加要展示的项目。
            </template>
          </p>
          <AdminSortableList
            v-if="treeItems.length"
            :items="treeItems"
            :disabled="saving"
            handle=".menu-root-handle"
            class="menu-tree-area"
            @reorder="reorderRoots"
          >
            <div
              v-for="root in treeItems"
              :key="root.item.id ?? root.item.title"
              class="menu-root-group admin-sortable-item"
            >
              <MenuTreeItem
                :item="root.item"
                :child-count="root.children.length"
                :group-open="isGroupOpen(root.item.id)"
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
                @toggle-group="toggleGroup"
                @add-child="addChildMenuItem"
                @move="moveItem"
                @indent="indentItem"
                @outdent="outdentItem"
                @duplicate="duplicateItem"
                @delete="deleteMenuItem"
              />

              <AdminSortableList
                v-if="root.children.length"
                v-show="isGroupOpen(root.item.id)"
                :id="`menu-children-${root.item.id}`"
                role="group"
                :aria-label="`${root.item.title || '未命名菜单'}的子菜单`"
                :items="root.children"
                :disabled="saving"
                handle=".menu-child-handle"
                class="menu-child-area"
                @reorder="reorderChildren"
              >
                <MenuTreeItem
                  v-for="child in root.children"
                  :key="child.id ?? `${root.item.id}-${child.title}`"
                  :item="child"
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
                  class="admin-sortable-item"
                  @select="selectItem"
                  @add-child="addChildMenuItem"
                  @move="moveItem"
                  @indent="indentItem"
                  @outdent="outdentItem"
                  @duplicate="duplicateItem"
                  @delete="deleteMenuItem"
                />
              </AdminSortableList>
            </div>
          </AdminSortableList>

          <button v-else type="button" class="menu-empty-state" @click="addRootMenuItem">
            <span>
              <UIcon name="i-lucide-plus" class="size-5" />
            </span>
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
                <input v-model="activeItem.title" type="text" placeholder="请输入菜单标题" >
              </label>

              <label class="property-field">
                <span>菜单类型</span>
                <select v-model="activeItem.type" @change="syncActiveItemType">
                  <option
                    v-for="option in itemTypeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>

              <label v-if="activeItem.type === 'CATEGORY'" class="property-field">
                <span>选择分类</span>
                <select v-model="activeItem.targetSlug" @change="syncActiveItemTarget">
                  <option value="">全部分类</option>
                  <option v-for="category in categories" :key="category.id" :value="category.slug">
                    {{ category.name }}
                  </option>
                </select>
              </label>

              <label v-else-if="activeItem.type === 'TAG'" class="property-field">
                <span>选择标签</span>
                <select v-model="activeItem.targetSlug" @change="syncActiveItemTarget">
                  <option value="">全部标签</option>
                  <option v-for="tag in tags" :key="tag.id" :value="tag.slug">
                    {{ tag.name }}
                  </option>
                </select>
              </label>

              <label v-else-if="activeItem.type === 'PAGE'" class="property-field">
                <span>选择页面</span>
                <select v-model="activeItem.url" @change="syncActiveItemPage">
                  <option v-for="page in pageOptions" :key="page.url" :value="page.url">
                    {{ page.label }}
                  </option>
                </select>
              </label>

              <label v-else class="property-field">
                <span>路由路径 / 外部链接</span>
                <input v-model="activeItem.url" type="text" placeholder="/about 或 https://..." >
              </label>

              <div class="property-field">
                <span>菜单图标</span>
                <div class="icon-preset-grid">
                  <button
                    v-for="icon in iconPresets"
                    :key="icon.name"
                    type="button"
                    class="icon-preset-button"
                    :class="{
                      'is-active': (activeItem.icon || itemIcon(activeItem)) === icon.name
                    }"
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
                  <input v-model="activeItem.isVisible" type="checkbox" >
                  <span class="switch-track" />
                </label>

                <label class="property-switch-row">
                  <span class="switch-label">
                    <UIcon name="i-lucide-external-link" class="size-4" />
                    在新标签页打开
                  </span>
                  <input v-model="activeItem.targetBlank" type="checkbox" >
                  <span class="switch-track" />
                </label>
              </div>

              <div class="property-actions">
                <button
                  type="button"
                  class="danger-text-button"
                  @click="deleteMenuItem(activeItem.id)"
                >
                  删除此项
                </button>
                <button
                  type="button"
                  class="save-button"
                  :class="{ 'is-saving': saving }"
                  :disabled="saving || !isDirty"
                  @click="saveMenus"
                >
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
        <UButton icon="i-lucide-plus" @click="createQuickMenu"> 创建菜单组 </UButton>
      </div>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
import { useAdminUnsavedChanges } from '~/composables/useAdminUnsavedChanges'
import AdminDragHandle from '~/components/admin/DragHandle.vue'
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
    childCount: { type: Number, default: 0 },
    groupOpen: { type: Boolean, default: false },
    selectedItemId: { type: Number as () => number | null, default: null },
    canMoveUp: { type: Boolean, default: false },
    canMoveDown: { type: Boolean, default: false },
    canIndent: { type: Boolean, default: false },
    canOutdent: { type: Boolean, default: false },
    canAddChild: { type: Boolean, default: false },
    isChild: { type: Boolean, default: false },
    typeLabel: {
      type: Function as unknown as () => (value: MenuItemType) => string,
      required: true
    },
    itemUrl: { type: Function as unknown as () => (item: MenuItem) => string, required: true },
    itemIcon: { type: Function as unknown as () => (item: MenuItem) => string, required: true }
  },
  emits: ['select', 'toggle-group', 'add-child', 'move', 'indent', 'outdent', 'duplicate', 'delete'],
  setup(props, { emit }) {
    const UIcon = resolveComponent('UIcon')
    const UDropdownMenu = resolveComponent('UDropdownMenu')
    const moveActions = computed(() => [
      { label: '上移', icon: 'i-lucide-arrow-up', disabled: !props.canMoveUp, onSelect: () => emit('move', props.item, -1) },
      { label: '下移', icon: 'i-lucide-arrow-down', disabled: !props.canMoveDown, onSelect: () => emit('move', props.item, 1) }
    ])
    const deleteAction = {
      label: '删除', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => emit('delete', props.item.id)
    }

    return () =>
      h(
        'article',
        {
          class: [
            'menu-node',
            props.isChild ? 'is-child' : '',
            props.selectedItemId === props.item.id ? 'is-active' : '',
            !props.item.isVisible ? 'is-muted' : ''
          ]
        },
        [
          h(AdminDragHandle, {
            label: props.item.title || '菜单项',
            class: props.isChild ? 'menu-child-handle' : 'menu-root-handle'
          }),
          props.childCount
            ? h('button', {
                type: 'button',
                class: 'node-fold',
                'aria-label': `${props.groupOpen ? '折叠' : '展开'}${props.item.title || '未命名菜单'}的子菜单`,
                'aria-expanded': props.groupOpen,
                'aria-controls': `menu-children-${props.item.id}`,
                onClick: () => emit('toggle-group', props.item)
              }, [h(UIcon, { name: 'i-lucide-chevron-right', class: 'size-4', 'aria-hidden': 'true' })])
            : h('span', { class: 'node-fold', 'aria-hidden': 'true' }),
          h('button', {
            type: 'button',
            class: 'node-select',
            'aria-current': props.selectedItemId === props.item.id ? 'true' : undefined,
            onClick: () => emit('select', props.item)
          }, [
            h('span', { class: 'node-icon' }, [
              h(UIcon, { name: props.itemIcon(props.item), class: 'size-5', 'aria-hidden': 'true' })
            ]),
            h('span', { class: 'node-content' }, [
              h('span', { class: 'node-heading' }, [
                h('strong', props.item.title || '未命名菜单'),
                props.childCount ? h('span', { class: 'node-child-count' }, `${props.childCount} 项`) : null
              ]),
              h('small', [
                props.itemUrl(props.item),
                props.item.targetBlank
                  ? h(UIcon, { name: 'i-lucide-external-link', class: 'size-3' })
                  : null
              ])
            ])
          ]),
          props.canAddChild
            ? h('button', {
                type: 'button',
                class: 'node-add-child',
                title: '添加子菜单',
                'aria-label': `为${props.item.title || '未命名菜单'}添加子菜单`,
                onClick: () => emit('add-child', props.item)
              }, [h(UIcon, { name: 'i-lucide-plus', class: 'size-4', 'aria-hidden': 'true' })])
            : null,
          h('div', { class: 'node-tools' }, [
            ...moveActions.value.map((action) => h('button', {
              key: action.label,
              type: 'button',
              title: action.label,
              disabled: action.disabled,
              onClick: action.onSelect
            }, [h(UIcon, { name: action.icon, class: 'size-4' })])),
            h('span', { class: 'node-tool-divider' }),
            h(
              'button',
              {
                type: 'button',
                class: 'node-danger-tool',
                title: deleteAction.label,
                onClick: deleteAction.onSelect
              },
              [h(UIcon, { name: deleteAction.icon, class: 'size-4' })]
            )
          ]),
          h(UDropdownMenu, { items: [moveActions.value, [deleteAction]], content: { align: 'end' } }, {
            default: () => h('button', {
              type: 'button',
              class: 'node-more',
              'aria-label': `${props.item.title || '未命名菜单'}的更多操作`
            }, [h(UIcon, { name: 'i-lucide-ellipsis', class: 'size-4', 'aria-hidden': 'true' })])
          })
        ]
      )
  }
})

const toast = useToast()
const saving = ref(false)
const menus = ref<MenuGroup[]>([])
const snapshot = ref('')
const selectedMenuId = ref<number | null>(null)
const expandedItemId = ref<number | null>(null)
const openGroupIds = ref(new Set<number>())

const itemForm = reactive({
  type: 'CUSTOM' as MenuItemType,
  title: '',
  url: ''
})

const locationOptions: Array<{ label: string; value: MenuLocation }> = [
  { label: '主导航菜单', value: 'PRIMARY' },
  { label: '底部链接菜单', value: 'FOOTER' },
  { label: '移动端菜单', value: 'MOBILE' },
  { label: '社交媒体', value: 'CUSTOM' }
]

const itemTypeOptions: Array<{ label: string; value: MenuItemType }> = [
  { label: '自定义链接', value: 'CUSTOM' },
  { label: '首页', value: 'HOME' },
  { label: '归档', value: 'ARCHIVE' },
  { label: '分类', value: 'CATEGORY' },
  { label: '标签', value: 'TAG' },
  { label: '页面', value: 'PAGE' }
]

const pageOptions = [
  { label: '关于', url: '/about', slug: 'about' },
  { label: '书签', url: '/link', slug: 'link' },
  { label: '文章归档', url: '/archive', slug: 'archive' },
  { label: '后台', url: '/admin', slug: 'admin' }
]

const quickAddOptions: Array<{
  label: string
  type: MenuItemType
  icon: string
  title: string
  url: string
}> = [
  { label: '自定义链接', type: 'CUSTOM', icon: 'i-lucide-link', title: '', url: '' },
  { label: '首页', type: 'HOME', icon: 'i-lucide-house', title: '首页', url: '/' },
  {
    label: '分类',
    type: 'CATEGORY',
    icon: 'i-lucide-folder',
    title: '文章分类',
    url: '/categories'
  },
  { label: '页面', type: 'PAGE', icon: 'i-lucide-file-text', title: '关于我', url: '/about' },
  {
    label: '外链',
    type: 'CUSTOM',
    icon: 'i-lucide-globe',
    title: 'GitHub',
    url: 'https://github.com/yourname'
  }
]

const iconPresets: Array<{ label: string; name: string }> = [
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

const selectedMenu = computed(
  () => menus.value.find((menu) => menu.id === selectedMenuId.value) || null
)
const selectedItems = computed(() => normalizeItems(selectedMenu.value?.items || []))
const treeItems = computed<TreeNode[]>(() => {
  const roots = selectedItems.value.filter((item) => !item.parentId)
  return roots.map((item) => ({
    item,
    children: selectedItems.value.filter((child) => child.parentId === item.id)
  }))
})
const activeItem = computed(
  () =>
    selectedItems.value.find((item) => item.id === expandedItemId.value) ||
    treeItems.value[0]?.item ||
    null
)
const activeItemId = computed(() => activeItem.value?.id ?? null)
const { isDirty, markSaved } = useAdminUnsavedChanges(() => menus.value)
const visiblePreviewItems = computed(() =>
  treeItems.value
    .filter((root) => root.item.isVisible)
    .map((root) => ({
      item: root.item,
      children: root.children.filter((child) => child.isVisible)
    }))
)

const [
  { data, error: menuLoadError, refresh: reloadMenus },
  { data: categoryData },
  { data: tagData }
] = await Promise.all([
  useFetch<ApiResult<MenuGroup[]>>('/api/admin/menus'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/admin/categories'),
  useFetch<ApiResult<TaxonomyItem[]>>('/api/admin/tags')
])

const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

watch(
  data,
  (val) => {
    if (val?.data) {
      setMenus(val.data)
    }
  },
  { immediate: true }
)

function setMenus(value: MenuGroup[], preferredMenuId = selectedMenuId.value) {
  menus.value = sortMenus(structuredClone(value))
  snapshot.value = JSON.stringify(menus.value)
  markSaved()

  const preferredMenu = menus.value.find((menu) => menu.id === preferredMenuId)
  const menu = preferredMenu ?? menus.value.find((menu) => menu.location === 'PRIMARY') ?? menus.value[0]
  selectedMenuId.value = menu?.id ?? null
  if (!preferredMenu?.items.some((item) => item.id === expandedItemId.value)) {
    expandedItemId.value = normalizeItems(menu?.items || []).find((item) => !item.parentId)?.id ?? null
  }
  openGroupIds.value = new Set(menus.value.flatMap(({ items }) =>
    items.flatMap(({ parentId }) => parentId && isGroupOpen(parentId) ? [parentId] : [])
  ))
}

function resetMenus() {
  if (!snapshot.value) return
  setMenus(JSON.parse(snapshot.value))
}

function selectMenu(menu: MenuGroup) {
  if (selectedMenuId.value === menu.id) return
  selectedMenuId.value = menu.id
  expandedItemId.value = treeItems.value[0]?.item.id ?? null
}

function selectItem(item: MenuItem) {
  expandedItemId.value = item.id
}

function isGroupOpen(id: number | null) {
  return id !== null && openGroupIds.value.has(id)
}

function toggleGroup(item: MenuItem) {
  if (item.id === null) return
  if (openGroupIds.value.delete(item.id)) {
    if (activeItem.value?.parentId === item.id) selectItem(item)
  } else {
    openGroupIds.value.add(item.id)
  }
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
    const page =
      pageOptions.find((option) => option.url === activeItem.value?.url) || pageOptions[0]
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
    const locationDiff =
      locationOrder[normalizeMenuLocation(a.location)] -
      locationOrder[normalizeMenuLocation(b.location)]
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
  openGroupIds.value.add(parent.id)
  expandedItemId.value = item.id
}

function pickAddType(type: MenuItemType) {
  const preset =
    quickAddOptions.find(
      (option) => option.type === type && (type !== 'CUSTOM' || option.title || option.url)
    ) || quickAddOptions.find((option) => option.type === type)
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

function reorderRoots(nodes: TreeNode[]) {
  nodes.forEach((node, index) => {
    node.item.sort = index
  })
}
function reorderChildren(items: MenuItem[]) {
  items.forEach((item, index) => {
    item.sort = index
  })
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
  const deletedItem = selectedItems.value.find((item) => item.id === id)
  const childIds = selectedMenu.value.items
    .filter((item) => item.parentId === id)
    .map((item) => item.id)
  selectedMenu.value.items = selectedMenu.value.items.filter(
    (item) => item.id !== id && !childIds.includes(item.id)
  )
  normalizeSort(null)
  if (id !== null) openGroupIds.value.delete(id)
  if (!selectedItems.value.some((item) => item.id === expandedItemId.value)) {
    expandedItemId.value = deletedItem?.parentId ?? treeItems.value[0]?.item.id ?? null
  }
}

function findSavedItem(item: MenuItem, menu: MenuGroup, savedMenu: MenuGroup): MenuItem | undefined {
  if (item.id !== null && item.id > 0) {
    return savedMenu.items.find((saved) => saved.id === item.id)
  }

  // New items get IDs on save. Match them within the saved parent by title and position.
  const parent = item.parentId ? menu.items.find((candidate) => candidate.id === item.parentId) : undefined
  const parentId = parent ? findSavedItem(parent, menu, savedMenu)?.id : null
  return savedMenu.items.find((saved) =>
    (saved.parentId ?? null) === parentId && saved.sort === item.sort && saved.title === item.title.trim()
  )
}

async function saveMenus() {
  if (saving.value || menuLoadError.value) return
  const selectedMenuIndex = menus.value.findIndex((menu) => menu.id === selectedMenuId.value)
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
    // The API returns menus in request order, including menus assigned a new ID.
    const savedMenu = saved.data[selectedMenuIndex]
    const currentMenu = selectedMenu.value
    if (savedMenu && currentMenu && activeItem.value) {
      expandedItemId.value = findSavedItem(activeItem.value, currentMenu, savedMenu)?.id ?? null
    }
    openGroupIds.value = new Set(menus.value.flatMap((menu, index) => {
      const savedGroup = saved.data[index]
      if (!savedGroup) return []
      return menu.items.flatMap((item) => {
        const id = isGroupOpen(item.id) ? findSavedItem(item, menu, savedGroup)?.id : null
        return id == null ? [] : [id]
      })
    }))
    setMenus(saved.data, savedMenu?.id)
    toast.add({ id: 'menus-save', title: '菜单已保存', color: 'success' })
  } catch (error: unknown) {
    toast.add({
      id: 'menus-save',
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
  color: #202633;
}

.menu-admin-header {
  display: flex;
  min-height: 3.75rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  background: #ffffff;
  padding: 0.75rem 1rem;
  box-shadow: none;
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
  background: #efedf8;
  color: #6554c0;
}

.menu-admin-title h1 {
  margin: 0;
  color: #202633;
  font-size: 1.1rem;
  font-weight: 550;
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
  border-bottom: 1px solid #e4e7ec;
  background: rgba(248, 250, 252, 0.72);
}

.menu-tab {
  min-height: 3.25rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 550;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.menu-tab:hover,
.menu-tab.is-active {
  color: #6554c0;
  background: #fbfdff;
}

.menu-tab.is-active {
  border-bottom-color: #6554c0;
}

.menu-tree-area {
  display: grid;
  gap: 0.625rem;
  padding: 1rem;
}

.menu-node {
  position: relative;
  min-height: 3.5rem;
  gap: 0.5rem;
  border: 1px solid #e4e7ec;
  border-radius: 0.65rem;
  background: #fff;
  padding: 0 1rem;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}

.menu-node:hover {
  border-color: #cbd5e1;
  box-shadow: none;
}

.menu-node.is-active {
  border-color: #c7d2fe;
  background: #efedf8;
  box-shadow: none;
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
  box-shadow: none;
}

.menu-node.is-child.is-active {
  border-color: #c7d2fe;
  background: #efedf8;
}

.menu-node.is-child.is-active::before {
  background: #a5b4fc;
}

.node-grip,
button.node-fold,
.node-add-child,
.node-more,
.node-tools button {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: #697386;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.node-grip {
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
}

.node-grip:hover,
.node-add-child:hover,
.node-more:hover,
.node-more[aria-expanded='true'],
button.node-fold:hover,
.node-tools button:hover:not(:disabled) {
  background: #f1f5f9;
  color: #6554c0;
}

.node-fold,
.node-add-child {
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
}

button.node-fold[aria-expanded='true'] {
  background: #efedf8;
  color: #5142a6;
}

.node-fold > span {
  transition: transform 160ms ease;
}

.node-fold[aria-expanded='true'] > span {
  transform: rotate(90deg);
}

.node-add-child {
  background: #f8fafc;
}

.node-select {
  display: flex;
  align-self: stretch;
  align-items: center;
  gap: 0.625rem;
  flex: 1 1 0;
  min-width: 0;
  padding: 0.375rem 0;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.node-fold:focus-visible,
.node-select:focus-visible,
.node-add-child:focus-visible,
.node-more:focus-visible {
  outline: 2px solid #6554c0;
  outline-offset: 2px;
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
  color: #6554c0;
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
  overflow: hidden;
  color: #202633;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.node-child-count {
  flex: none;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: #f1f0f8;
  color: #5f5481;
  font-size: 0.6875rem;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}

.node-content small {
  gap: 0.35rem;
  margin-top: 0.25rem;
  overflow: hidden;
  color: #697386;
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
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  pointer-events: none;
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
  background: #e4e7ec;
}

.node-tools button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.node-more,
.menu-mobile-hint {
  display: none;
}

.menu-child-area {
  position: relative;
  display: grid;
  gap: 0.375rem;
  margin: 0.375rem 0 0.375rem 1.25rem;
  padding-left: 2rem;
}

.menu-child-area::before {
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 1.5rem;
  width: 2px;
  border-radius: 1px;
  background: #dbe4ff;
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
  background: #efedf8;
  color: #6554c0;
}

.menu-empty-state strong,
.menu-no-data strong,
.property-empty strong {
  margin-top: 0.75rem;
  color: #202633;
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
  border-bottom: 1px solid #e4e7ec;
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
  color: #202633;
  font-size: 1.2rem;
  font-weight: 550;
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
  color: #202633;
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
  color: #202633;
  font-size: 0.95rem;
  padding: 0 0.9rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.property-field input:focus {
  border-color: #818cf8;
  box-shadow: none;
}

.property-field select:focus {
  border-color: #818cf8;
  box-shadow: none;
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
  border: 1px solid #e4e7ec;
  border-radius: 0.5rem;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.icon-preset-button:hover,
.icon-preset-button.is-active {
  border-color: #818cf8;
  background: #efedf8;
  color: #6554c0;
}

.property-switches {
  display: grid;
  gap: 1.25rem;
  border-bottom: 1px solid #e4e7ec;
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
  box-shadow: none;
  content: '';
  transition: transform 0.2s ease;
}

.property-switch-row input:checked + .switch-track {
  background: #6554c0;
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
  background: #202633;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.save-button:hover:not(:disabled) {
  background: #020617;
  transform: none;
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.save-button.is-saving {
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
  color: #697386;
}

.menu-no-data {
  min-height: 28rem;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
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
    min-height: 3.25rem;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
  }

  .menu-node.is-child {
    min-height: 3.25rem;
  }

  .menu-node > .admin-drag-handle,
  .node-tools,
  .node-content small,
  .menu-node.is-child > .node-fold,
  .menu-desktop-hint {
    display: none;
  }

  .menu-mobile-hint {
    display: inline;
  }

  .node-fold,
  .node-add-child,
  .node-more {
    width: 2.25rem;
    height: 2.5rem;
  }

  .node-more {
    display: grid;
    flex: none;
  }

  .node-select,
  .node-heading {
    gap: 0.375rem;
  }

  .menu-child-area {
    margin-left: 0.875rem;
    padding-left: 0.875rem;
  }

  .menu-child-area::before {
    left: 0;
  }

  .menu-node.is-child::before {
    left: -0.9375rem;
    width: 0.625rem;
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

<style scoped>
.menu-admin-page {
  display: grid;
  gap: 24px;
  min-height: 0;
}
.menu-edit-body {
  display: grid;
  gap: 24px;
  min-width: 0;
  border: 0;
  padding: 0;
  margin: 0;
}
.menu-live-preview {
  overflow: visible;
  padding: 16px 22px;
}
.menu-preview-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 11px;
}
.menu-preview-label small {
  margin-left: auto;
  color: #697386;
  font-size: 10px;
}
.menu-live-preview nav {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 18px;
}
.menu-preview-item {
  position: relative;
}
.menu-preview-item > span {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.menu-preview-children {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  display: none;
  min-width: 150px;
  padding: 10px;
  border: 1px solid #e4e7ec;
  border-radius: 7px;
  background: #fff;
  box-shadow: none;
}
.menu-preview-children span {
  display: block;
  padding: 8px;
  color: #667085;
  font-size: 12px;
}
.menu-preview-item:hover .menu-preview-children,
.menu-preview-item:focus-visible .menu-preview-children {
  display: block;
}
.menu-preview-empty {
  color: #697386;
  font-size: 12px;
}
.menu-admin-layout {
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
}
.menu-property-card {
  top: 88px;
}
.menu-list-panel,
.menu-property-card {
  box-shadow: none;
  border-radius: 10px;
}
.menu-list-panel {
  min-height: 0;
}
.menu-tabs {
  background: #fff;
}
.menu-tab {
  font-size: 12px;
  font-weight: 500;
}
.menu-tree-area {
  padding: 20px;
}
.menu-property-card .property-card-head {
  background: #fff;
}
.property-card-head h2 {
  font-size: 13px;
  font-weight: 550;
}
.property-head-icon {
  background: #f1eef8;
  color: #8977ab;
}
.menu-property-card .save-button {
  background: #6554c0;
  box-shadow: none;
}
@media (max-width: 1100px) {
  .menu-admin-layout {
    grid-template-columns: 1fr;
  }
  .menu-property-card {
    position: static;
  }
}
@media (prefers-reduced-motion: reduce) {
  .node-fold > span {
    transition: none;
  }
}
@media (max-width: 640px) {
  .menu-live-preview {
    padding: 16px;
  }
  .menu-tree-area {
    padding: 14px;
  }
  .menu-live-preview nav {
    gap: 18px;
  }
}
</style>

<style>
.admin-shell .menu-node:focus-within .node-tools {
  opacity: 1;
  pointer-events: auto;
}
@media (max-width: 760px) {
  .admin-shell .menu-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .admin-shell .menu-list-panel {
    min-height: 0;
  }
}
</style>

<style>
.admin-shell .menu-order-hint {
  margin: 0;
  padding: 14px 20px 0;
  color: #697386;
  font-size: 11px;
  line-height: 1.8;
}
.admin-shell .menu-tree-area,
.admin-shell .menu-root-group {
  display: grid;
  gap: 12px;
}
.admin-shell .menu-node > .admin-drag-handle {
  margin-left: -5px;
}
@media (max-width: 760px) {
  .admin-shell .menu-order-hint {
    padding-inline: 14px;
  }
}
</style>
