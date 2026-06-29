<template>
  <div class="admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <p>Settings</p>
        <h1>站点设置</h1>
      </div>
    </div>

    <section v-if="form" class="admin-panel settings-admin-panel">
      <div class="settings-tabs" aria-label="设置分类">
        <button
          v-for="tab in settingTabs"
          :key="tab.value"
          type="button"
          class="settings-tab"
          :class="{ 'is-active': activeTab === tab.value }"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'basic'" class="settings-form">
        <div class="settings-row">
          <label class="settings-label">站点标题</label>
          <UInput v-model="form.site_title" icon="i-lucide-type" placeholder="站点标题" class="settings-control" />
          <p class="text-xs text-slate-400">显示在浏览器标题栏和页面头部</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">站点副标题</label>
          <UInput v-model="form.site_subtitle" icon="i-lucide-text" placeholder="站点副标题" class="settings-control" />
          <p class="text-xs text-slate-400">用于首页浏览器标签标题，例如“站点标题 - 站点副标题”</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">侧边栏描述</label>
          <UInput v-model="form.sidebar_description" icon="i-lucide-panel-right" placeholder="首页侧边栏简介" class="settings-control" />
          <p class="text-xs text-slate-400">显示在首页侧边栏头像卡片下方</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">Logo URL</label>
          <div class="settings-upload">
            <UInput v-model="form.site_logo" icon="i-lucide-image" placeholder="https://example.com/logo.png" class="flex-1" />
            <input ref="logoInputRef" type="file" accept="image/*" class="hidden" @change="uploadFile($event, 'site_logo')" />
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploading === 'site_logo'" @click="logoInputRef?.click()">上传</UButton>
            <span v-if="logoUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
            <span v-if="logoUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
          </div>
          <p class="text-xs text-slate-400">粘贴图片 URL，或点击上传按钮选择本地图片</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">Favicon URL</label>
          <div class="settings-upload">
            <UInput v-model="form.site_favicon" icon="i-lucide-globe" placeholder="https://example.com/favicon.ico" class="flex-1" />
            <input ref="faviconInputRef" type="file" accept="image/*" class="hidden" @change="uploadFile($event, 'site_favicon')" />
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploading === 'site_favicon'" @click="faviconInputRef?.click()">上传</UButton>
            <span v-if="faviconUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
            <span v-if="faviconUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
          </div>
          <p class="text-xs text-slate-400">粘贴图片 URL，或点击上传按钮选择本地图片</p>
        </div>
      </div>

      <div v-else class="settings-form">
        <div class="settings-row">
          <label class="settings-checkbox">
            <input
              type="checkbox"
              :checked="form.seo_noindex === 'true'"
              @change="toggleNoindex"
            />
            <span>屏蔽搜索引擎</span>
          </label>
          <p class="text-sm text-slate-500">为所有页面添加 robots noindex 标签，阻止搜索引擎索引。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">站点关键词</label>
          <UTextarea v-model="form.seo_keywords" :rows="2" placeholder="关键词之间用英文逗号分隔" class="settings-control" />
          <p class="text-sm text-slate-500">用于输出 keywords meta 标签。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">站点描述</label>
          <UTextarea v-model="form.seo_description" :rows="2" placeholder="请输入站点描述" class="settings-control" />
          <p class="text-sm text-slate-500">仅对首页生效，其他页面会优先使用页面自身描述。</p>
        </div>
      </div>

      <div class="settings-actions">
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
  sidebar_description: string
  site_logo: string
  site_favicon: string
  seo_noindex: string
  seo_keywords: string
  seo_description: string
}

const defaultValue = (key: string) => {
  const map: Record<string, string> = {
    site_title: 'Jiupan Blog',
    site_subtitle: '个人博客',
    sidebar_description: '个人博客',
    site_logo: '',
    site_favicon: '',
    seo_noindex: 'false',
    seo_keywords: '',
    seo_description: ''
  }
  return map[key] || ''
}

const settingTabs = [
  { label: '基本设置', value: 'basic' },
  { label: 'SEO 设置', value: 'seo' }
] as const

const activeTab = ref<(typeof settingTabs)[number]['value']>('basic')
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
      sidebar_description: val.data.sidebar_description || defaultValue('sidebar_description'),
      site_logo: val.data.site_logo || defaultValue('site_logo'),
      site_favicon: val.data.site_favicon || defaultValue('site_favicon'),
      seo_noindex: val.data.seo_noindex || defaultValue('seo_noindex'),
      seo_keywords: val.data.seo_keywords || defaultValue('seo_keywords'),
      seo_description: val.data.seo_description || defaultValue('seo_description')
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

function toggleNoindex(event: Event) {
  if (!form.value) return
  const input = event.target as HTMLInputElement
  form.value.seo_noindex = input.checked ? 'true' : 'false'
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

<style scoped>
.settings-admin-panel {
  border-color: rgba(203, 213, 225, 0.78);
  border-radius: 12px;
  background: #ffffff;
}

.settings-tabs {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(226, 232, 240, 0.92);
  background: linear-gradient(180deg, #f8fafc 0%, #f3f6fa 100%);
  padding: 0 14px;
  scrollbar-width: thin;
}

.settings-tab {
  position: relative;
  min-width: 128px;
  min-height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  transition: background-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
}

.settings-tab:hover {
  background: rgba(255, 255, 255, 0.72);
  color: #111827;
}

.settings-tab.is-active {
  background: #ffffff;
  color: #111827;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 8px 18px rgba(15, 23, 42, 0.06);
}

.settings-tab.is-active::after {
  position: absolute;
  right: 18px;
  bottom: -9px;
  left: 18px;
  height: 2px;
  border-radius: 999px;
  background: #0f172a;
  content: "";
}

.settings-admin-panel :deep(.admin-panel-header) {
  min-height: 56px;
  border-bottom-color: #eef1f4;
  background: #f5f6f8;
  padding: 0 20px;
}

.settings-form {
  display: grid;
}

.settings-row {
  display: grid;
  gap: 8px;
  padding: 13px 20px;
  border-bottom: 1px solid rgba(241, 245, 249, 0.96);
  transition: background-color 160ms ease;
}

.settings-row:hover {
  background: #fbfdff;
}

.settings-label {
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.settings-control {
  width: min(100%, 644px);
}

.settings-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 14px;
  font-weight: 600;
}

.settings-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}

.settings-upload {
  display: flex;
  width: min(100%, 760px);
  gap: 8px;
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  padding: 14px 20px;
}

.settings-actions :deep(button) {
  background: #020617;
}

@media (max-width: 640px) {
  .settings-upload,
  .settings-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
