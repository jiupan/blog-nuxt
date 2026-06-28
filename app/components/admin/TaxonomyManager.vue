<template>
  <div>
    <h1 class="text-2xl font-semibold">{{ title }}</h1>
    <form class="mt-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="createItem">
      <UInput v-model="form.name" placeholder="名称" />
      <UInput v-model="form.slug" placeholder="别名，留空自动生成" />
      <UButton type="submit" icon="i-lucide-plus" :loading="pending">新增</UButton>
    </form>

    <div class="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600">
          <tr>
            <th class="px-4 py-3">名称</th>
            <th class="px-4 py-3">别名</th>
            <th class="px-4 py-3">文章数</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in items" :key="item.id">
            <td class="px-4 py-3">
              <UInput v-model="item.name" size="sm" />
            </td>
            <td class="px-4 py-3">
              <UInput v-model="item.slug" size="sm" />
            </td>
            <td class="px-4 py-3 text-gray-500">{{ item._count?.posts || 0 }}</td>
            <td class="px-4 py-3 text-right">
              <UButton size="sm" variant="ghost" @click="updateItem(item)">保存</UButton>
              <UButton size="sm" color="error" variant="ghost" @click="deleteItem(item.id)">删除</UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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

const pending = ref(false)
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
  } finally {
    pending.value = false
  }
}

async function updateItem(item: TaxonomyItem) {
  await $fetch(`${props.endpoint}/${item.id}`, {
    method: 'PUT',
    body: {
      name: item.name,
      slug: item.slug
    }
  })
  await refresh()
}

async function deleteItem(id: number) {
  await $fetch(`${props.endpoint}/${id}`, {
    method: 'DELETE'
  })
  await refresh()
}
</script>
