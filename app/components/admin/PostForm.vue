<template>
  <div class="admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <p>Markdown Editor</p>
        <h1>{{ mode === 'create' ? '新建文章' : '编辑文章' }}</h1>
      </div>
      <div class="admin-page-actions">
        <UButton color="neutral" variant="outline" icon="i-lucide-arrow-left" to="/admin/posts">返回</UButton>
        <UButton color="neutral" variant="outline" icon="i-lucide-save" :loading="pending" @click="save('DRAFT')">保存草稿</UButton>
        <UButton icon="i-lucide-send" :loading="pending" @click="save('PUBLISHED')">发布文章</UButton>
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <section class="admin-panel self-start p-4">
        <div class="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <UIcon name="i-lucide-settings-2" class="size-4 text-slate-500" />
          <h2 class="text-sm font-semibold text-slate-950">文章设置</h2>
        </div>
        <div class="grid gap-3">
        <UFormField label="标题">
          <UInput v-model="form.title" placeholder="请输入文章标题" class="w-full" />
        </UFormField>
        <UFormField label="别名">
          <UInput v-model="form.slug" placeholder="留空时自动生成 8 位链接码" class="w-full" />
        </UFormField>
        <UFormField label="摘要">
          <UTextarea v-model="form.summary" :rows="4" class="w-full" />
        </UFormField>
        <UFormField label="封面 URL">
          <div class="flex gap-2">
            <UInput v-model="form.cover" placeholder="/uploads/..." class="flex-1" />
            <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="uploadCover" />
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploadingCover" @click="coverInputRef?.click()">上传</UButton>
            <span v-if="coverUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
            <span v-if="coverUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
          </div>
        </UFormField>
        <UFormField label="分类">
          <select v-model.number="form.categoryId" class="admin-select w-full">
            <option :value="null">无分类</option>
            <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
        </UFormField>
        <UFormField label="标签">
          <div class="flex flex-wrap gap-2" :class="{ 'rounded-lg border border-dashed border-slate-200 p-3': !tags.length }">
            <label v-for="item in tags" :key="item.id" class="admin-check-pill">
              <input v-model="form.tagIds" type="checkbox" :value="item.id" class="accent-slate-950" />
              {{ item.name }}
            </label>
            <p v-if="!tags.length" class="text-sm text-slate-500">暂无标签，可先到标签管理中新增。</p>
          </div>
        </UFormField>
        <UFormField label="SEO 标题">
          <UInput v-model="form.seoTitle" class="w-full" />
        </UFormField>
        <UFormField label="SEO 描述">
          <UTextarea v-model="form.seoDescription" :rows="3" class="w-full" />
        </UFormField>
        </div>
      </section>

      <section class="admin-panel min-w-0 overflow-hidden p-2">
        <ClientOnly>
          <MdEditor
            v-model="form.content"
            class="admin-md-editor"
            :toolbars-exclude="['github']"
            @on-upload-img="uploadImages"
          />
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

const toast = useToast()
const pending = ref(false)
const uploadingCover = ref(false)
const coverUploaded = ref(false)
const coverUploadError = ref(false)
const coverInputRef = ref<HTMLInputElement | null>(null)
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
  const localError = validateForm()

  if (localError) {
    toast.add({
      title: '无法保存',
      description: localError,
      color: 'error'
    })
    return
  }

  pending.value = true
  try {
    const body = {
      ...form,
      status,
      slug: form.slug
    }

    if (props.mode === 'create') {
      await $fetch('/api/admin/posts', { method: 'POST', body })
    } else {
      await $fetch(`/api/admin/posts/${props.postId}`, { method: 'PUT', body })
    }

    toast.add({
      title: successTitle(status),
      description: props.mode === 'create' ? '文章已创建，正在返回文章列表。' : '文章修改已保存。',
      color: 'success'
    })

    if (props.mode === 'create' || status === 'PUBLISHED') {
      await navigateTo('/admin/posts')
    }
  } catch (error: any) {
    toast.add({
      title: '保存失败',
      description: getSaveErrorMessage(error),
      color: 'error'
    })
  } finally {
    pending.value = false
  }
}

function successTitle(status: 'DRAFT' | 'PUBLISHED') {
  if (status === 'DRAFT') {
    return props.mode === 'create' ? '草稿已创建' : '草稿已保存'
  }

  return props.mode === 'create' ? '文章已发布' : '发布成功'
}

function validateForm() {
  if (!form.title.trim()) {
    return '请先填写文章标题。'
  }

  if (!form.content.trim()) {
    return '请先填写文章内容。'
  }

  if (props.mode === 'edit' && !form.slug.trim()) {
    return '文章别名不能为空。'
  }

  return ''
}

function getSaveErrorMessage(error: any) {
  const rawMessage = error?.data?.message || error?.statusMessage || error?.message || ''
  const zodMessage = parseZodMessage(rawMessage)

  if (zodMessage) {
    return zodMessage
  }

  if (rawMessage.includes('Unique constraint') || rawMessage.includes('P2002')) {
    return '文章别名已存在，请换一个别名后重试。'
  }

  if (rawMessage.includes('文章别名不能为空')) {
    return '文章别名不能为空。'
  }

  if (error?.statusCode === 401 || error?.status === 401) {
    return '登录状态已失效，请重新登录后再保存。'
  }

  return rawMessage || '保存时发生未知错误，请稍后重试。'
}

function parseZodMessage(message: string) {
  if (!message.trim().startsWith('[')) {
    return ''
  }

  try {
    const issues = JSON.parse(message)
    const firstIssue = Array.isArray(issues) ? issues[0] : null
    const field = firstIssue?.path?.[0]

    if (field === 'title') {
      return '请先填写文章标题。'
    }

    if (field === 'content') {
      return '请先填写文章内容。'
    }

    if (field === 'slug') {
      return '文章别名不能为空。'
    }

    if (field === 'categoryId') {
      return '分类数据格式不正确，请重新选择分类。'
    }

    if (field === 'tagIds') {
      return '标签数据格式不正确，请重新选择标签。'
    }

    return firstIssue?.message ? `表单内容不完整：${firstIssue.message}` : ''
  } catch {
    return ''
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

async function uploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingCover.value = true
  coverUploadError.value = false
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ data: { url: string } }>('/api/admin/upload', { method: 'POST', body })
    form.cover = result.data.url
    coverUploaded.value = true
    setTimeout(() => { coverUploaded.value = false }, 2000)
  } catch {
    coverUploadError.value = true
    setTimeout(() => { coverUploadError.value = false }, 3000)
  } finally {
    uploadingCover.value = false
    input.value = ''
  }
}
</script>
