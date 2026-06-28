<template>
  <div class="grid gap-6">
    <div>
      <p class="text-sm font-medium text-slate-500">Settings</p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-950">站点设置</h1>
    </div>

    <section v-if="form" class="admin-panel p-6">
      <div class="admin-panel-header">
        <div>
          <h2 class="text-base font-semibold text-slate-950">站点信息</h2>
          <p class="mt-1 text-sm text-slate-500">修改后即时生效，前台页面会自动更新</p>
        </div>
      </div>

      <div class="mt-6 grid gap-5">
        <div class="grid gap-1.5">
          <label class="text-sm font-medium text-slate-700">站点标题</label>
          <UInput v-model="form.site_title" icon="i-lucide-type" placeholder="站点标题" />
          <p class="text-xs text-slate-400">显示在浏览器标题栏和页面头部</p>
        </div>

        <div class="grid gap-1.5">
          <label class="text-sm font-medium text-slate-700">站点副标题</label>
          <UInput v-model="form.site_subtitle" icon="i-lucide-text" placeholder="站点副标题" />
          <p class="text-xs text-slate-400">简短描述，显示在首页侧边栏</p>
        </div>

        <div class="grid gap-1.5">
          <label class="text-sm font-medium text-slate-700">Logo URL</label>
          <div class="flex gap-2">
            <UInput v-model="form.site_logo" icon="i-lucide-image" placeholder="https://example.com/logo.png" class="flex-1" />
            <input ref="logoInputRef" type="file" accept="image/*" class="hidden" @change="uploadFile($event, 'site_logo')" />
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploading === 'site_logo'" @click="logoInputRef?.click()">上传</UButton>
            <span v-if="logoUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
            <span v-if="logoUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
          </div>
          <p class="text-xs text-slate-400">粘贴图片 URL，或点击上传按钮选择本地图片</p>
        </div>

        <div class="grid gap-1.5">
          <label class="text-sm font-medium text-slate-700">Favicon URL</label>
          <div class="flex gap-2">
            <UInput v-model="form.site_favicon" icon="i-lucide-globe" placeholder="https://example.com/favicon.ico" class="flex-1" />
            <input ref="faviconInputRef" type="file" accept="image/*" class="hidden" @change="uploadFile($event, 'site_favicon')" />
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploading === 'site_favicon'" @click="faviconInputRef?.click()">上传</UButton>
            <span v-if="faviconUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
            <span v-if="faviconUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
          </div>
          <p class="text-xs text-slate-400">粘贴图片 URL，或点击上传按钮选择本地图片</p>
        </div>
      </div>

      <div class="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
        <UButton type="submit" icon="i-lucide-save" :loading="saving" @click="save">保存设置</UButton>
        <span v-if="saved" class="text-sm font-medium text-emerald-600">✓ 已保存</span>
        <span v-else class="text-xs text-slate-400">点击保存后前台页面即刻生效</span>
      </div>
    </section>

    <div v-else class="admin-panel grid place-items-center px-5 py-16 text-center">
      <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-slate-300" />
      <p class="mt-3 font-medium text-slate-900">加载中</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

type SettingsForm = {
  site_title: string
  site_subtitle: string
  site_logo: string
  site_favicon: string
}

const defaultValue = (key: string) => {
  const map: Record<string, string> = {
    site_title: 'Jiupan Blog',
    site_subtitle: '个人博客',
    site_logo: '',
    site_favicon: ''
  }
  return map[key] || ''
}

const form = ref<SettingsForm | null>(null)
const saving = ref(false)
const saved = ref(false)
const uploading = ref<string | null>(null)
const logoUploaded = ref(false)
const faviconUploaded = ref(false)
const logoUploadError = ref(false)
const faviconUploadError = ref(false)
const logoInputRef = ref<HTMLInputElement | null>(null)
const faviconInputRef = ref<HTMLInputElement | null>(null)

const { data } = await useFetch<{ data: Record<string, string> }>('/api/admin/settings')

watch(data, (val) => {
  if (val?.data && !form.value) {
    form.value = {
      site_title: val.data.site_title || defaultValue('site_title'),
      site_subtitle: val.data.site_subtitle || defaultValue('site_subtitle'),
      site_logo: val.data.site_logo || defaultValue('site_logo'),
      site_favicon: val.data.site_favicon || defaultValue('site_favicon')
    }
  }
}, { immediate: true })

async function save() {
  if (!form.value) return
  saving.value = true
  saved.value = false
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: form.value })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } finally {
    saving.value = false
  }
}

async function uploadFile(event: Event, field: 'site_logo' | 'site_favicon') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !form.value) return

  uploading.value = field
  if (field === 'site_logo') logoUploadError.value = false
  else faviconUploadError.value = false
  try {
    const body = new FormData()
    body.append('file', file)
    const result = await $fetch<{ data: { url: string } }>('/api/admin/upload', { method: 'POST', body })
    form.value[field] = result.data.url
    if (field === 'site_logo') {
      logoUploaded.value = true
      setTimeout(() => { logoUploaded.value = false }, 2000)
    } else {
      faviconUploaded.value = true
      setTimeout(() => { faviconUploaded.value = false }, 2000)
    }
  } catch {
    if (field === 'site_logo') {
      logoUploadError.value = true
      setTimeout(() => { logoUploadError.value = false }, 3000)
    } else {
      faviconUploadError.value = true
      setTimeout(() => { faviconUploadError.value = false }, 3000)
    }
  } finally {
    uploading.value = null
    input.value = ''
  }
}
</script>
