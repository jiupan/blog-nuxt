<template>
  <div class="admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <p>{{ title.includes('分类') ? 'Categories' : 'Tags' }}</p>
        <h1>{{ title }}</h1>
      </div>
    </div>

    <form class="admin-panel grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="createItem">
      <UInput v-model="form.name" icon="i-lucide-type" placeholder="名称" />
      <UInput v-model="form.slug" icon="i-lucide-link" placeholder="别名，留空自动生成" />
      <UButton type="submit" icon="i-lucide-plus" :loading="pending">新增</UButton>
    </form>

    <section class="admin-panel">
      <div class="admin-panel-header">
        <div>
          <h2 class="text-base font-semibold text-slate-950">条目列表</h2>
          <p class="mt-1 text-sm text-slate-500">共 {{ items.length }} 个条目，可直接在表格内编辑</p>
        </div>
      </div>

      <div v-if="items.length" class="overflow-x-auto">
        <table class="w-full min-w-[40rem] text-left text-sm">
          <thead class="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-4 py-2.5 font-medium">名称</th>
            <th class="px-4 py-2.5 font-medium">别名</th>
            <th class="px-4 py-2.5 font-medium">文章数</th>
            <th class="px-4 py-2.5"></th>
          </tr>
        </thead>
          <tbody class="divide-y divide-slate-100">
          <tr v-for="item in items" :key="item.id" class="transition hover:bg-slate-50">
            <td class="px-4 py-2.5">
              <UInput v-model="item.name" size="sm" />
            </td>
            <td class="px-4 py-2.5">
              <UInput v-model="item.slug" size="sm" />
            </td>
            <td class="px-4 py-2.5 text-slate-500">
              <UBadge color="neutral" variant="soft">{{ item._count?.posts || 0 }}</UBadge>
            </td>
            <td class="px-4 py-2.5 text-right">
              <UButton size="sm" variant="ghost" icon="i-lucide-save" @click="updateItem(item)">保存</UButton>
              <UButton
                size="sm"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                :disabled="isCategoryManager && Boolean(item._count?.posts)"
                @click="deleteItem(item)"
              >
                删除
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <div v-else class="grid place-items-center px-5 py-16 text-center">
        <UIcon name="i-lucide-inbox" class="size-10 text-slate-300" />
        <p class="mt-3 font-medium text-slate-900">暂无条目</p>
        <p class="mt-1 text-sm text-slate-500">使用上方表单新增{{ title.includes('分类') ? '分类' : '标签' }}。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
type TaxonomyItem = {
  id: number
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

const props = defineProps<{
  title: string
  endpoint: string
}>()

const toast = useToast()
const pending = ref(false)
const isCategoryManager = computed(() => props.title.includes('分类'))
const form = reactive({
  name: '',
  slug: ''
})
const { data, refresh } = await useFetch<{ data: TaxonomyItem[] }>(props.endpoint)
const items = computed(() => data.value?.data || [])

async function createItem() {
  pending.value = true
  try {
    await $fetch(props.endpoint, {
      method: 'POST',
      body: form
    })
    form.name = ''
    form.slug = ''
    await refresh()
    toast.add({ title: '已新增', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '新增失败',
      description: getErrorMessage(error),
      color: 'error'
    })
  } finally {
    pending.value = false
  }
}

async function updateItem(item: TaxonomyItem) {
  try {
    await $fetch(`${props.endpoint}/${item.id}`, {
      method: 'PUT',
      body: {
        name: item.name,
        slug: item.slug
      }
    })
    await refresh()
    toast.add({ title: '已保存', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '保存失败',
      description: getErrorMessage(error),
      color: 'error'
    })
  }
}

async function deleteItem(item: TaxonomyItem) {
  if (isCategoryManager.value && item._count?.posts) {
    toast.add({
      title: '无法删除',
      description: '该分类下仍有文章，请先移动或删除相关文章。',
      color: 'warning'
    })
    return
  }

  if (!window.confirm(`确定删除“${item.name}”吗？`)) {
    return
  }

  try {
    await $fetch(`${props.endpoint}/${item.id}`, {
      method: 'DELETE'
    })
    await refresh()
    toast.add({ title: '已删除', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '删除失败',
      description: getErrorMessage(error),
      color: 'error'
    })
  }
}

function getErrorMessage(error: any) {
  return error?.data?.message || error?.statusMessage || error?.message || '操作失败，请稍后重试。'
}
</script>
