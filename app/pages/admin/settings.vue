<template>
  <div class="admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <span class="admin-page-title-icon">
          <UIcon name="i-lucide-settings" class="size-5" />
        </span>
        <div class="admin-page-title-text">
          <p>Settings</p>
          <h1>站点设置</h1>
        </div>
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

      <div v-else-if="activeTab === 'seo'" class="settings-form">
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

      <div v-else-if="activeTab === 'footer'" class="settings-form">
        <div class="settings-row">
          <label class="settings-label">版权信息</label>
          <UInput v-model="form.footer_copyright" icon="i-lucide-copyright" placeholder="©2026 {siteName}" class="settings-control" />
          <p class="text-sm text-slate-500">显示在 footer-bottom 左侧，使用 <code>{siteName}</code> 代表当前站点标题。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">底部右侧链接</label>
          <UTextarea v-model="form.footer_bottom_links" :rows="5" placeholder="文章|/posts&#10;归档|/archive&#10;关于|/about&#10;后台|/admin" class="settings-control" />
          <p class="text-sm text-slate-500">每行一个链接，格式为 <code>显示名称|路径或 URL</code>。</p>
        </div>
      </div>

      <div v-else-if="activeTab === 'ai'" class="settings-form">
        <div class="settings-row">
          <label class="settings-label">AI API Key</label>
          <UInput v-model="form.ai_api_key" type="password" icon="i-lucide-key-round" placeholder="sk-..." class="settings-control" />
          <p class="text-sm text-slate-500">用于服务端调用 AI 接口。若服务器环境变量已配置 <code>AI_API_KEY</code> 或 <code>DEEPSEEK_API_KEY</code>，会优先使用环境变量。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">AI Base URL</label>
          <UInput v-model="form.ai_base_url" icon="i-lucide-globe-2" placeholder="https://api.deepseek.com" class="settings-control" />
          <p class="text-sm text-slate-500">DeepSeek OpenAI 兼容接口地址，默认 <code>https://api.deepseek.com</code>。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">AI 模型</label>
          <UInput v-model="form.ai_model" icon="i-lucide-cpu" placeholder="deepseek-v4-flash" class="settings-control" />
          <p class="text-sm text-slate-500">文章总结器当前默认使用 <code>deepseek-v4-flash</code>。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">Embedding API Key</label>
          <UInput v-model="form.ai_embedding_api_key" type="password" icon="i-lucide-key-round" placeholder="sk-..." class="settings-control" />
          <p class="text-sm text-slate-500">用于生成向量索引。若服务器环境变量已配置 <code>AI_EMBEDDING_API_KEY</code> 或 <code>OPENAI_API_KEY</code>，会优先使用环境变量。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">Embedding Base URL</label>
          <UInput v-model="form.ai_embedding_base_url" icon="i-lucide-globe-2" placeholder="https://api.openai.com/v1" class="settings-control" />
          <p class="text-sm text-slate-500">OpenAI 兼容 embedding 接口地址，默认 <code>https://api.openai.com/v1</code>。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">Embedding 模型</label>
          <UInput v-model="form.ai_embedding_model" icon="i-lucide-cpu" placeholder="text-embedding-3-small" class="settings-control" />
          <p class="text-sm text-slate-500">当前 pgvector 表固定为 1536 维，默认使用 <code>text-embedding-3-small</code>。</p>
        </div>

        <div class="settings-row">
          <label class="settings-label">Embedding 维度</label>
          <UInput v-model="form.ai_embedding_dimensions" icon="i-lucide-ruler" placeholder="1536" class="settings-control" />
          <p class="text-sm text-slate-500">第一版固定使用 1536 维；如果要换维度，需要同步数据库向量列和索引。</p>
        </div>

        <div class="settings-row">
          <div class="settings-row-head">
            <div>
              <label class="settings-label">AI 索引管理</label>
              <p class="text-sm text-slate-500">重建已发布文章的语义检索索引，供语义搜索和问问博客使用。</p>
            </div>
            <UButton size="sm" icon="i-lucide-refresh-cw" :loading="rebuildingIndex" @click="rebuildAiIndex">重建索引</UButton>
          </div>
          <div class="ai-index-status">
            <span>已索引文章：{{ aiIndexStatus?.indexedPosts ?? 0 }}</span>
            <span>Chunk：{{ aiIndexStatus?.chunks ?? 0 }}</span>
            <span>失效 Chunk：{{ aiIndexStatus?.staleChunks ?? 0 }}</span>
            <span>最后索引：{{ formatIndexDate(aiIndexStatus?.lastIndexedAt) }}</span>
          </div>
        </div>
      </div>

      <div v-else class="settings-form">
        <div class="settings-row">
          <div class="settings-row-head">
            <div>
              <label class="settings-label">底部快捷入口</label>
              <p class="text-sm text-slate-500">返回顶部按钮始终在中间，这里配置的入口会自动均分在左右两侧。</p>
            </div>
            <UButton size="sm" icon="i-lucide-plus" @click="addFooterAction">添加入口</UButton>
          </div>

          <div class="footer-action-editor">
            <article v-for="(item, index) in footerActionItems" :key="item.id" class="footer-action-item">
              <div class="footer-action-item-main">
                <div class="footer-action-preview">
                  <UIcon :name="item.icon || 'i-lucide-link'" class="size-5" />
                </div>
                <UInput v-model="item.label" icon="i-lucide-type" placeholder="显示名称" />
                <UInput v-model="item.to" icon="i-lucide-link" placeholder="/posts 或 https://..." />
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  :disabled="footerActionItems.length <= 1"
                  @click="removeFooterAction(index)"
                />
              </div>

              <div class="footer-icon-grid" aria-label="图标库">
                <button
                  v-for="icon in footerActionIconOptions"
                  :key="icon.name"
                  type="button"
                  class="footer-icon-option"
                  :class="{ 'is-active': item.icon === icon.name }"
                  :title="icon.label"
                  @click="item.icon = icon.name"
                >
                  <UIcon :name="icon.name" class="size-4" />
                </button>
              </div>
            </article>
          </div>
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
  footer_copyright: string
  footer_bottom_links: string
  footer_actions: string
  ai_api_key: string
  ai_base_url: string
  ai_model: string
  ai_embedding_api_key: string
  ai_embedding_base_url: string
  ai_embedding_model: string
  ai_embedding_dimensions: string
}

type AiIndexStatus = {
  indexedPosts: number
  chunks: number
  staleChunks: number
  lastIndexedAt?: string | null
  models: Array<{
    model: string
    dimensions: number
    chunks: number
  }>
}

type FooterActionItem = {
  id: number
  label: string
  to: string
  icon: string
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
    seo_description: '',
    footer_copyright: '©2026 {siteName}',
    footer_bottom_links: '文章|/posts\n归档|/archive\n关于|/about\n后台|/admin',
    footer_actions: defaultFooterActions,
    ai_api_key: '',
    ai_base_url: 'https://api.deepseek.com',
    ai_model: 'deepseek-v4-flash',
    ai_embedding_api_key: '',
    ai_embedding_base_url: 'https://api.openai.com/v1',
    ai_embedding_model: 'text-embedding-3-small',
    ai_embedding_dimensions: '1536'
  }
  return map[key] || ''
}

const settingTabs = [
  { label: '基本设置', value: 'basic' },
  { label: 'SEO 设置', value: 'seo' },
  { label: '底部信息', value: 'footer' },
  { label: '底部快捷入口', value: 'footerActions' },
  { label: 'AI 设置', value: 'ai' }
] as const

const defaultFooterActions = '[{"label":"文章","to":"/posts","icon":"i-lucide-library"},{"label":"归档","to":"/archive","icon":"i-lucide-archive"},{"label":"我的","to":"/about","icon":"i-lucide-user-round"},{"label":"后台","to":"/admin","icon":"i-lucide-settings"},{"label":"全部文章","to":"/posts","icon":"i-lucide-newspaper"},{"label":"时间线","to":"/archive","icon":"i-lucide-clock-3"},{"label":"友链","to":"/link","icon":"i-lucide-link"},{"label":"登录","to":"/admin/login","icon":"i-lucide-log-in"}]'

const footerActionIconOptions = [
  { label: '文库', name: 'i-lucide-library' },
  { label: '归档', name: 'i-lucide-archive' },
  { label: '用户', name: 'i-lucide-user-round' },
  { label: '设置', name: 'i-lucide-settings' },
  { label: '文章', name: 'i-lucide-newspaper' },
  { label: '时间', name: 'i-lucide-clock-3' },
  { label: '链接', name: 'i-lucide-link' },
  { label: '登录', name: 'i-lucide-log-in' },
  { label: '首页', name: 'i-lucide-house' },
  { label: '搜索', name: 'i-lucide-search' },
  { label: '标签', name: 'i-lucide-tag' },
  { label: '分类', name: 'i-lucide-folder' },
  { label: '仪表盘', name: 'i-lucide-layout-dashboard' },
  { label: '外链', name: 'i-lucide-external-link' },
  { label: '邮件', name: 'i-lucide-mail' },
  { label: '星标', name: 'i-lucide-star' }
]

const activeTab = ref<(typeof settingTabs)[number]['value']>('basic')
const form = ref<SettingsForm | null>(null)
const footerActionItems = ref<FooterActionItem[]>([])
const saving = ref(false)
const saved = ref(false)
const rebuildingIndex = ref(false)
const uploading = ref<string | null>(null)
const logoUploaded = ref(false)
const faviconUploaded = ref(false)
const logoUploadError = ref(false)
const faviconUploadError = ref(false)
const logoInputRef = ref<HTMLInputElement | null>(null)
const faviconInputRef = ref<HTMLInputElement | null>(null)

const { data } = await useFetch<{ data: Record<string, string> }>('/api/admin/settings')
const { data: aiIndexData, refresh: refreshAiIndexStatus } = await useFetch<{ data: AiIndexStatus }>('/api/admin/ai/index/status')
const aiIndexStatus = computed(() => aiIndexData.value?.data || null)

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
      seo_description: val.data.seo_description || defaultValue('seo_description'),
      footer_copyright: val.data.footer_copyright || defaultValue('footer_copyright'),
      footer_bottom_links: val.data.footer_bottom_links || defaultValue('footer_bottom_links'),
      footer_actions: val.data.footer_actions || defaultValue('footer_actions'),
      ai_api_key: val.data.ai_api_key || defaultValue('ai_api_key'),
      ai_base_url: val.data.ai_base_url || defaultValue('ai_base_url'),
      ai_model: val.data.ai_model || defaultValue('ai_model'),
      ai_embedding_api_key: val.data.ai_embedding_api_key || defaultValue('ai_embedding_api_key'),
      ai_embedding_base_url: val.data.ai_embedding_base_url || defaultValue('ai_embedding_base_url'),
      ai_embedding_model: val.data.ai_embedding_model || defaultValue('ai_embedding_model'),
      ai_embedding_dimensions: val.data.ai_embedding_dimensions || defaultValue('ai_embedding_dimensions')
    }
    footerActionItems.value = parseFooterActionItems(form.value.footer_actions)
  }
}, { immediate: true })

async function save() {
  if (!form.value) return
  form.value.footer_actions = JSON.stringify(footerActionItems.value.map(({ label, to, icon }) => ({
    label: label.trim(),
    to: to.trim() || '/',
    icon: icon.trim() || 'i-lucide-link'
  })).filter((item) => item.label))
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

async function rebuildAiIndex() {
  rebuildingIndex.value = true
  try {
    await $fetch('/api/admin/ai/index/rebuild', { method: 'POST' })
    await refreshAiIndexStatus()
  } finally {
    rebuildingIndex.value = false
  }
}

function formatIndexDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '暂无'
}

function toggleNoindex(event: Event) {
  if (!form.value) return
  const input = event.target as HTMLInputElement
  form.value.seo_noindex = input.checked ? 'true' : 'false'
}

function parseFooterActionItems(value: string): FooterActionItem[] {
  try {
    const parsed = JSON.parse(value || '[]')
    if (!Array.isArray(parsed)) return parseFooterActionItems(defaultFooterActions)
    const items = parsed.map((item, index) => ({
      id: Date.now() + index,
      label: String(item?.label || '').trim(),
      to: String(item?.to || '/').trim() || '/',
      icon: String(item?.icon || 'i-lucide-link').trim() || 'i-lucide-link'
    })).filter((item) => item.label)
    return items.length ? items : parseFooterActionItems(defaultFooterActions)
  } catch {
    return parseFooterActionItems(defaultFooterActions)
  }
}

function addFooterAction() {
  footerActionItems.value.push({
    id: Date.now(),
    label: '新入口',
    to: '/',
    icon: 'i-lucide-link'
  })
}

function removeFooterAction(index: number) {
  if (footerActionItems.value.length <= 1) return
  footerActionItems.value.splice(index, 1)
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
    const url = field === 'site_favicon' ? '/api/admin/upload?purpose=favicon' : '/api/admin/upload'
    const result = await $fetch<{ data: { url: string } }>(url, { method: 'POST', body })
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
  min-height: calc(100vh - 6.5rem);
  background: #ffffff;
}

.settings-tabs {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  gap: 0.35rem;
  overflow-x: auto;
  border-bottom: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 0 0.75rem;
  scrollbar-width: thin;
}

.settings-tab {
  position: relative;
  min-width: 7.5rem;
  min-height: 2.15rem;
  border: 0;
  border-radius: 0.6rem;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 750;
  outline: none;
  transition: background-color 160ms ease, box-shadow 160ms ease, color 160ms ease;
}

.settings-tab:hover {
  background: rgba(255, 255, 255, 0.86);
  color: #4338ca;
}

.settings-tab.is-active {
  background: #ffffff;
  color: #4f46e5;
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.08);
}

.settings-tab.is-active::after {
  position: absolute;
  right: 1rem;
  bottom: -0.57rem;
  left: 1rem;
  height: 2px;
  border-radius: 999px;
  background: #4f46e5;
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
  gap: 0.45rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 160ms ease;
}

.settings-row:hover {
  background: rgba(248, 250, 252, 0.62);
}

.settings-label {
  color: #334155;
  font-size: 0.86rem;
  font-weight: 750;
}

.settings-row-head {
  display: flex;
  width: min(100%, 760px);
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.settings-control {
  width: min(100%, 644px);
}

.settings-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #334155;
  font-size: 0.86rem;
  font-weight: 750;
}

.settings-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
}

.settings-upload {
  display: flex;
  width: min(100%, 760px);
  gap: 0.5rem;
}

.ai-index-status {
  display: flex;
  width: min(100%, 760px);
  flex-wrap: wrap;
  gap: 0.45rem;
}

.ai-index-status span {
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 750;
  padding: 0.35rem 0.6rem;
}

.footer-action-editor {
  display: grid;
  width: min(100%, 860px);
  gap: 0.75rem;
}

.footer-action-item {
  display: grid;
  gap: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
  padding: 0.875rem;
}

.footer-action-item-main {
  display: grid;
  grid-template-columns: 2.5rem minmax(8rem, 0.7fr) minmax(12rem, 1fr) auto;
  gap: 0.625rem;
  align-items: center;
}

.footer-action-preview {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 999px;
  background: #111827;
  color: #fff;
}

.footer-icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(2.25rem, 1fr));
  gap: 0.45rem;
}

.footer-icon-option {
  display: grid;
  height: 2.25rem;
  place-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  background: #f8fafc;
  color: #64748b;
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.footer-icon-option:hover,
.footer-icon-option.is-active {
  border-color: #818cf8;
  background: #eef2ff;
  color: #4f46e5;
}

.settings-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-top: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.9rem 1rem;
}

@media (max-width: 640px) {
  .settings-row-head,
  .settings-upload,
  .settings-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .footer-action-item-main {
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  }

  .footer-action-item-main > :deep(.u-input):nth-of-type(2) {
    grid-column: 1 / -1;
  }
}
</style>
