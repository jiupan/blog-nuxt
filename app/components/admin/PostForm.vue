<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-semibold">{{ mode === 'create' ? '新建文章' : '编辑文章' }}</h1>
      <div class="flex gap-2">
        <UButton color="neutral" variant="outline" to="/admin/posts">返回</UButton>
        <UButton color="neutral" variant="outline" :loading="pending" @click="save('DRAFT')">保存草稿</UButton>
        <UButton :loading="pending" @click="save('PUBLISHED')">发布文章</UButton>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section class="grid gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <UFormField label="标题">
          <UInput v-model="form.title" />
        </UFormField>
        <UFormField label="别名">
          <UInput v-model="form.slug" placeholder="留空时根据标题生成" />
        </UFormField>
        <UFormField label="摘要">
          <UTextarea v-model="form.summary" :rows="4" />
        </UFormField>
        <UFormField label="封面 URL">
          <UInput v-model="form.cover" placeholder="/uploads/..." />
        </UFormField>
        <UFormField label="分类">
          <select v-model.number="form.categoryId" class="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm">
            <option :value="null">无分类</option>
            <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </UFormField>
        <div>
          <div class="mb-2 text-sm font-medium text-gray-700">标签</div>
          <div class="flex flex-wrap gap-2">
            <label v-for="item in tags" :key="item.id" class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm">
              <input v-model="form.tagIds" type="checkbox" :value="item.id" />
              {{ item.name }}
            </label>
          </div>
        </div>
        <UFormField label="SEO 标题">
          <UInput v-model="form.seoTitle" />
        </UFormField>
        <UFormField label="SEO 描述">
          <UTextarea v-model="form.seoDescription" :rows="3" />
        </UFormField>
      </section>

      <section class="min-w-0 rounded-lg border border-gray-200 bg-white p-2">
        <ClientOnly>
          <MdEditor v-model="form.content" :toolbars-exclude="['github']" @on-upload-img="uploadImages" />
        </ClientOnly>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'

const props = defineProps<{
  mode: 'create' | 'edit'
  postId?: number
}>()

const pending = ref(false)
const form = reactive({
  title: '',
  slug: '',
  summary: '',
  content: '# 标题\n\n开始写作...',
  cover: '',
  categoryId: null as number | null,
  tagIds: [] as number[],
  status: 'DRAFT',
  seoTitle: '',
  seoDescription: ''
})

const { data: categoryData } = await useFetch('/api/admin/categories')
const { data: tagData } = await useFetch('/api/admin/tags')
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

if (props.mode === 'edit' && props.postId) {
  const { data } = await useFetch(`/api/admin/posts/${props.postId}`)
  if (data.value?.data) {
    Object.assign(form, {
      title: data.value.data.title,
      slug: data.value.data.slug,
      summary: data.value.data.summary || '',
      content: data.value.data.content,
      cover: data.value.data.cover || '',
      categoryId: data.value.data.categoryId,
      tagIds: data.value.data.tagIds || [],
      status: data.value.data.status,
      seoTitle: data.value.data.seoTitle || '',
      seoDescription: data.value.data.seoDescription || ''
    })
  }
}

async function save(status: 'DRAFT' | 'PUBLISHED') {
  pending.value = true
  try {
    const body = {
      ...form,
      status,
      slug: form.slug || form.title
    }

    const result = props.mode === 'create'
      ? await $fetch('/api/admin/posts', { method: 'POST', body })
      : await $fetch(`/api/admin/posts/${props.postId}`, { method: 'PUT', body })

    const id = props.mode === 'create' ? result.data.id : props.postId
    await navigateTo(`/admin/posts/${id}`)
  } finally {
    pending.value = false
  }
}

async function uploadImages(files: File[], callback: (urls: string[]) => void) {
  const urls: string[] = []
  for (const file of files) {
    const data = new FormData()
    data.append('file', file)
    const result = await $fetch('/api/admin/upload', {
      method: 'POST',
      body: data
    })
    urls.push(result.data.url)
  }
  callback(urls)
}
</script>
