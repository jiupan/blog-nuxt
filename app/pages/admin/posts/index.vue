<template>
  <div class="grid gap-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500">Posts</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-950">文章管理</h1>
      </div>
      <UButton icon="i-lucide-plus" to="/admin/posts/create">新建文章</UButton>
    </div>

    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2 class="text-base font-semibold text-slate-950">全部文章</h2>
          <p class="mt-1 text-sm text-slate-500">共 {{ total }} 篇，点击编辑进入 Markdown 工作区</p>
        </div>
      </div>

      <!-- 筛选区域 -->
      <div class="flex flex-col gap-3 px-5 py-4 border-b border-slate-100">
        <!-- 状态 Tab -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition"
            :class="filterStatus === tab.value
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
            @click="setStatus(tab.value)"
          >{{ tab.label }}</button>
        </div>

        <!-- 搜索 + 分类 + 排序 -->
        <div class="flex items-center gap-3 flex-wrap">
          <UInput
            v-model="searchText"
            icon="i-lucide-search"
            placeholder="搜索文章标题/别名"
            class="min-w-[200px] flex-1"
            @keyup.enter="applyFilters"
          />

          <USelect
            v-model="categoryFilter"
            :items="categoryOptions"
            class="w-40"
            @update:model-value="applyFilters"
          />

          <USelect
            v-model="tagFilter"
            :items="tagOptions"
            class="w-40"
            @update:model-value="applyFilters"
          />

          <USelect
            v-model="sortValue"
            :items="sortOptions"
            class="w-40"
            @update:model-value="applyFilters"
          />

          <UButton
            variant="outline"
            icon="i-lucide-rotate-ccw"
            @click="resetFilters"
          >重置</UButton>
        </div>
      </div>

      <div v-if="posts.length" class="overflow-x-auto">
        <table class="w-full min-w-[45rem] text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-5 py-3 font-medium">标题</th>
            <th class="px-5 py-3 font-medium">分类</th>
            <th class="px-5 py-3 font-medium">标签</th>
            <th class="px-5 py-3 font-medium">更新时间</th>
            <th class="px-5 py-3 font-medium">状态</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
          <tbody class="divide-y divide-slate-100">
          <tr v-for="post in posts" :key="post.id" class="transition hover:bg-slate-50">
            <td class="px-5 py-4">
              <div class="font-medium text-slate-950">{{ post.title }}</div>
              <div class="mt-1 text-xs text-slate-500">{{ postPath(post.slug) }}</div>
            </td>
            <td class="px-5 py-4 text-slate-500">{{ post.category?.name || '-' }}</td>
            <td class="px-5 py-4">
              <div class="flex items-center gap-1 flex-wrap">
                <UBadge v-for="tag in post.tags" :key="tag.id" variant="soft" color="primary" size="xs">{{ tag.name }}</UBadge>
                <span v-if="!post.tags?.length" class="text-slate-400">-</span>
              </div>
            </td>
            <td class="px-5 py-4 text-slate-500">{{ formatDate(post.updatedAt) }}</td>
            <td class="px-5 py-4">
              <UBadge :color="post.status === 'PUBLISHED' ? 'success' : 'neutral'" variant="soft">
                {{ statusText(post.status) }}
              </UBadge>
            </td>
            <td class="px-5 py-4 text-right">
              <UButton size="sm" variant="ghost" icon="i-lucide-square-pen" :to="`/admin/posts/${post.id}`">编辑</UButton>
            </td>
          </tr>
        </tbody>
      </table>

        <div v-if="totalPages > 1" class="flex items-center justify-between px-5 py-4 border-t border-slate-200">
          <p class="text-sm text-slate-500">第 {{ page }} / {{ totalPages }} 页</p>
          <div class="flex items-center gap-2">
            <UButton size="xs" variant="outline" :disabled="page <= 1" @click="goPage(page - 1)">上一页</UButton>
            <UButton
              v-for="p in totalPages"
              :key="p"
              size="xs"
              :variant="p === page ? 'solid' : 'outline'"
              @click="goPage(p)"
            >{{ p }}</UButton>
            <UButton size="xs" variant="outline" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</UButton>
          </div>
        </div>
      </div>

      <div v-else class="grid place-items-center px-5 py-16 text-center">
        <UIcon name="i-lucide-files" class="size-10 text-slate-300" />
        <p class="mt-3 font-medium text-slate-900">文章列表为空</p>
        <p class="mt-1 text-sm text-slate-500">新建文章后会显示在这里</p>
        <UButton class="mt-4" icon="i-lucide-plus" to="/admin/posts/create">新建文章</UButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

const statusTabs = [
  { label: '全部', value: '' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '草稿', value: 'DRAFT' }
]

const sortOptions = [
  { label: '排序：最近更新', value: 'updatedAt_desc' },
  { label: '排序：最早更新', value: 'updatedAt_asc' },
  { label: '排序：最近创建', value: 'createdAt_desc' },
  { label: '排序：标题 A-Z', value: 'title_asc' },
  { label: '排序：标题 Z-A', value: 'title_desc' }
]

const page = ref(1)
const pageSize = 8
const filterStatus = ref('')
const searchText = ref('')
const categoryFilter = ref('__all__')
const tagFilter = ref('__all__')
const sortValue = ref('updatedAt_desc')

const { data: categoryData } = await useFetch('/api/admin/categories')
const { data: tagData } = await useFetch('/api/admin/tags')

const categoryOptions = computed(() => {
  const options = [{ label: '全部分类', value: '__all__' }]
  if (categoryData.value?.data) {
    for (const cat of categoryData.value.data) {
      options.push({ label: cat.name, value: String(cat.id) })
    }
  }
  return options
})

const tagOptions = computed(() => {
  const options = [{ label: '全部标签', value: '__all__' }]
  if (tagData.value?.data) {
    for (const tag of tagData.value.data) {
      options.push({ label: tag.name, value: String(tag.id) })
    }
  }
  return options
})

const query = computed(() => ({
  page: page.value,
  pageSize,
  status: filterStatus.value || undefined,
  search: searchText.value || undefined,
  categoryId: categoryFilter.value !== '__all__' ? categoryFilter.value : undefined,
  tagId: tagFilter.value !== '__all__' ? tagFilter.value : undefined,
  sort: sortValue.value
}))

const { data } = await useFetch('/api/admin/posts', { query })

const posts = computed(() => data.value?.data.items || [])
const total = computed(() => data.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

function setStatus(val: string) {
  filterStatus.value = val
  applyFilters()
}

function applyFilters() {
  page.value = 1
}

function resetFilters() {
  filterStatus.value = ''
  searchText.value = ''
  categoryFilter.value = '__all__'
  tagFilter.value = '__all__'
  sortValue.value = 'updatedAt_desc'
  applyFilters()
}

function goPage(p: number) {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
  }
}

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : ''
}

function statusText(status?: string) {
  return status === 'PUBLISHED' ? '已发布' : '草稿'
}
</script>
