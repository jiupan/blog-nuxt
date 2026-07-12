<template>
  <div class="admin-page sidebar-admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <span class="admin-page-title-icon"><UIcon name="i-lucide-panel-right" class="size-5" /></span>
        <div class="admin-page-title-text"><p>Sidebar</p><h1>侧栏设置</h1></div>
      </div>
      <div class="admin-page-actions">
        <span v-if="saved" class="save-success">✓ 已保存并应用</span>
        <span v-else-if="saveError" class="save-error" role="alert">{{ saveError }}</span>
        <UButton icon="i-lucide-save" :loading="saving" @click="save">保存设置</UButton>
      </div>
    </div>

    <div v-if="form" class="sidebar-editor-layout">
      <div class="sidebar-editor-main">
        <section class="admin-panel sidebar-config-card">
          <div class="config-heading"><span><UIcon name="i-lucide-user-round" /></span><div><h2>作者卡片</h2><p>统一管理前台侧栏的头像与个人信息。</p></div></div>
          <div class="avatar-editor">
            <div class="avatar-preview"><video v-if="avatarIsVideo" :src="form.avatar" autoplay muted loop playsinline preload="metadata" aria-label="头像视频预览" /><img v-else-if="form.avatar" :src="form.avatar" alt="头像预览"><span v-else>{{ authorInitial }}</span></div>
            <div><strong>作者头像</strong><p>支持 JPG、PNG、WebP 图片，以及 5MB 以内的 MP4、WebM 循环视频。</p><div class="avatar-actions"><input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.mp4,.webm" class="hidden" @change="uploadAvatar"><UButton size="sm" color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploading" @click="avatarInput?.click()">{{ form.avatar ? '更换头像' : '上传头像' }}</UButton><UButton v-if="form.avatar" size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" @click="form.avatar = ''">移除</UButton></div><small v-if="uploadError">{{ uploadError }}</small></div>
          </div>
          <div class="field-grid">
            <label><span>显示名称</span><UInput v-model="form.name" icon="i-lucide-type" placeholder="留空则使用站点名称" /></label>
            <label><span>身份文字</span><UInput v-model="form.subtitle" icon="i-lucide-badge" placeholder="独立写作者" /></label>
            <label class="field-wide"><span>个人简介</span><UTextarea v-model="form.description" :rows="3" placeholder="介绍你自己和博客内容" /></label>
            <label class="field-wide"><span>手写签名</span><UInput v-model="form.signature" icon="i-lucide-signature" placeholder="留空则使用显示名称" /></label>
          </div>
        </section>

        <section class="admin-panel sidebar-config-card">
          <div class="config-heading"><span><UIcon name="i-lucide-list-ordered" /></span><div><h2>模块顺序</h2><p>调整显示顺序，或关闭暂时不需要的模块。</p></div></div>
          <div class="module-list">
            <article v-for="(module, index) in form.modules" :key="module.key" class="module-item" :class="{ 'is-hidden': !module.visible }">
              <UIcon name="i-lucide-grip-vertical" class="module-grip" />
              <span class="module-icon"><UIcon :name="moduleMeta[module.key].icon" /></span>
              <div><strong>{{ moduleMeta[module.key].label }}</strong><p>{{ moduleMeta[module.key].description }}</p></div>
              <label class="visibility-toggle"><input v-model="module.visible" type="checkbox"><span>{{ module.visible ? '显示' : '隐藏' }}</span></label>
              <div class="order-actions"><button type="button" :disabled="index === 0" title="上移" @click="move(index, -1)"><UIcon name="i-lucide-chevron-up" /></button><button type="button" :disabled="index === form.modules.length - 1" title="下移" @click="move(index, 1)"><UIcon name="i-lucide-chevron-down" /></button></div>
            </article>
          </div>
        </section>
      </div>

      <aside class="sidebar-preview-panel">
        <div class="preview-label"><span>实时预览</span><small>作者卡片</small></div>
        <div class="author-preview-card">
          <span class="preview-decoration" />
          <div class="preview-avatar"><video v-if="avatarIsVideo" :src="form.avatar" autoplay muted loop playsinline preload="metadata" aria-label="头像视频预览" /><img v-else-if="form.avatar" :src="form.avatar" alt=""><span v-else>{{ authorInitial }}</span></div>
          <h2>{{ authorName }}</h2><strong>{{ form.subtitle || '独立写作者' }}</strong><p>{{ form.description || '个人博客' }}</p><div class="preview-signature">{{ form.signature || authorName }}</div>
          <div class="preview-links"><span v-for="icon in ['i-lucide-sparkles', 'i-lucide-book-open', 'i-lucide-compass']" :key="icon"><UIcon :name="icon" /></span></div>
        </div>
        <p class="preview-hint"><UIcon name="i-lucide-info" />保存后所有使用公共侧栏的页面都会同步更新。</p>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import type { AdminSettingsPayload } from '~~/types/dto/settings'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

type ModuleKey = 'author' | 'featured' | 'categories' | 'tags'
type SidebarModule = { key: ModuleKey, visible: boolean }
type SidebarForm = { name: string, subtitle: string, description: string, avatar: string, signature: string, modules: SidebarModule[] }

const defaultModules: SidebarModule[] = [
  { key: 'author', visible: true }, { key: 'featured', visible: true },
  { key: 'categories', visible: true }, { key: 'tags', visible: true }
]
const moduleMeta: Record<ModuleKey, { label: string, description: string, icon: string }> = {
  author: { label: '作者卡片', description: '头像、名称、简介和快捷链接', icon: 'i-lucide-user-round' },
  featured: { label: '精选阅读', description: '按传入数据展示推荐文章', icon: 'i-lucide-trending-up' },
  categories: { label: '探索话题', description: '展示文章分类与数量', icon: 'i-lucide-compass' },
  tags: { label: '热门标签', description: '展示标签及关联文章数', icon: 'i-lucide-tags' }
}

const { data } = await useFetch<ApiResult<AdminSettingsPayload>>('/api/admin/settings')
const form = ref<SidebarForm | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const saving = ref(false)
const saved = ref(false)
const saveError = ref('')
const toast = useToast()

watch(data, (value) => {
  if (!value?.data || form.value) return
  form.value = {
    name: value.data.sidebar_author_name || '', subtitle: value.data.sidebar_author_subtitle || '独立写作者',
    description: value.data.sidebar_author_description || value.data.sidebar_description || '',
    avatar: value.data.sidebar_author_avatar || '', signature: value.data.sidebar_author_signature || '',
    modules: parseModules(value.data.sidebar_modules)
  }
}, { immediate: true })

const siteName = computed(() => data.value?.data.site_title || 'Jiupan Blog')
const authorName = computed(() => form.value?.name.trim() || siteName.value)
const authorInitial = computed(() => authorName.value.slice(0, 1).toUpperCase())
const avatarIsVideo = computed(() => isVideoUrl(form.value?.avatar || ''))

function parseModules(raw: string): SidebarModule[] {
  try {
    const parsed = JSON.parse(raw) as Array<Partial<SidebarModule>>
    const valid = parsed.filter(item => item.key && item.key in moduleMeta).map(item => ({ key: item.key as ModuleKey, visible: item.visible !== false }))
    for (const item of defaultModules) if (!valid.some(module => module.key === item.key)) valid.push({ ...item })
    return valid
  } catch { return defaultModules.map(item => ({ ...item })) }
}

function move(index: number, direction: -1 | 1) {
  if (!form.value) return
  const target = index + direction
  if (target < 0 || target >= form.value.modules.length) return
  const modules = [...form.value.modules]
  ;[modules[index], modules[target]] = [modules[target]!, modules[index]!]
  form.value.modules = modules
}

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !form.value) return
  uploading.value = true; uploadError.value = ''
  try {
    const body = new FormData(); body.append('file', file)
    const result = await $fetch<ApiResult<{ url: string, mediaType?: 'image' | 'video' }>>('/api/admin/upload?purpose=avatar', { method: 'POST', body })
    form.value.avatar = result.data.url
  } catch (error: unknown) { uploadError.value = getApiErrorMessage(error, { fallback: '头像上传失败，请更换文件后重试。' }) }
  finally { uploading.value = false; input.value = '' }
}

function isVideoUrl(value: string) {
  return /\.(?:mp4|webm)(?:$|[?#])/i.test(value)
}

async function save() {
  if (!form.value) return
  saving.value = true; saved.value = false; saveError.value = ''
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: {
      sidebar_author_name: form.value.name.trim(), sidebar_author_subtitle: form.value.subtitle.trim(),
      sidebar_author_description: form.value.description.trim(), sidebar_author_avatar: form.value.avatar,
      sidebar_author_signature: form.value.signature.trim(), sidebar_modules: JSON.stringify(form.value.modules)
    } })
    saved.value = true; setTimeout(() => { saved.value = false }, 2200)
  } catch (error: unknown) {
    saveError.value = getApiErrorMessage(error, { fallback: '保存失败，请稍后重试。' })
    toast.add({ title: '侧栏设置保存失败', description: saveError.value, color: 'error' })
  } finally { saving.value = false }
}
</script>

<style scoped>
.sidebar-editor-layout{display:grid;grid-template-columns:minmax(0,1fr)320px;gap:20px;align-items:start}.sidebar-editor-main{display:grid;gap:20px}.sidebar-config-card{padding:28px}.config-heading{display:flex;gap:14px;align-items:center;margin-bottom:24px}.config-heading>span,.module-icon{display:grid;place-items:center;border-radius:12px;background:#eef2ff;color:#4f46e5}.config-heading>span{width:42px;height:42px}.config-heading svg{width:20px;height:20px}.config-heading h2{margin:0;font-size:18px;font-weight:800}.config-heading p,.module-item p,.avatar-editor p{margin:4px 0 0;color:#64748b;font-size:13px}.avatar-editor{display:grid;grid-template-columns:104px 1fr;gap:22px;align-items:center;padding:20px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}.avatar-preview,.preview-avatar{display:grid;place-items:center;overflow:hidden;border-radius:999px;background:linear-gradient(135deg,#f4e3d2,#d4a373);color:white;font-size:34px;font-weight:800}.avatar-preview{width:96px;height:96px;border:4px solid white;box-shadow:0 8px 22px rgb(15 23 42 / 12%)}.avatar-preview img,.preview-avatar img{width:100%;height:100%;object-fit:cover}.avatar-actions{display:flex;gap:8px;margin-top:12px}.avatar-editor small{display:block;margin-top:8px;color:#dc2626}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}.field-grid label{display:grid;gap:8px}.field-grid label>span{font-size:13px;font-weight:750;color:#334155}.field-wide{grid-column:1/-1}.module-list{display:grid;gap:10px}.module-item{display:grid;grid-template-columns:20px 42px minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:14px;border:1px solid #e2e8f0;border-radius:14px;background:white;transition:.2s}.module-item.is-hidden{background:#f8fafc;opacity:.68}.module-grip{color:#94a3b8}.module-icon{width:42px;height:42px}.module-icon svg{width:19px;height:19px}.module-item strong{font-size:14px}.visibility-toggle{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#475569}.visibility-toggle input{accent-color:#4f46e5}.order-actions{display:flex;gap:4px}.order-actions button{display:grid;width:30px;height:30px;place-items:center;border:1px solid #e2e8f0;border-radius:8px;background:white;color:#64748b}.order-actions button:disabled{opacity:.3}.order-actions svg{width:15px}.sidebar-preview-panel{position:sticky;top:88px}.preview-label{display:flex;justify-content:space-between;margin-bottom:10px;color:#334155;font-size:13px;font-weight:800}.preview-label small{color:#94a3b8}.author-preview-card{position:relative;overflow:hidden;padding:30px 24px 26px;border:1px solid #f1ebe4;border-radius:24px;background:white;box-shadow:0 16px 38px rgb(15 23 42 / 8%);text-align:center}.preview-decoration{position:absolute;top:0;right:0;width:110px;height:110px;border-radius:0 24px 0 100%;background:#fff6ed}.preview-avatar{position:relative;width:104px;height:104px;margin:0 auto 20px;border:4px solid white;box-shadow:0 8px 22px rgb(15 23 42 / 12%)}.author-preview-card h2{position:relative;margin:0;font-family:Georgia,serif;font-size:23px}.author-preview-card>strong{display:block;margin-top:6px;color:#64748b;font-size:11px;letter-spacing:.12em;text-transform:uppercase}.author-preview-card>p{margin:15px 0 0;color:#64748b;font-size:13px;line-height:1.7}.preview-signature{margin-top:14px;color:#a58d78;font:italic 24px "Segoe Script",cursive;transform:rotate(-2deg)}.preview-links{display:flex;justify-content:center;gap:12px;margin-top:20px}.preview-links span{display:grid;width:38px;height:38px;place-items:center;border-radius:999px;background:#f8fafc;color:#64748b}.preview-links svg{width:17px}.preview-hint{display:flex;gap:7px;margin:14px 4px 0;color:#64748b;font-size:12px;line-height:1.5}.preview-hint svg{flex:0 0 15px;width:15px}.save-success{color:#059669;font-size:13px;font-weight:700}.save-error{max-width:320px;color:#dc2626;font-size:13px;font-weight:700;line-height:1.4}@media(max-width:1000px){.sidebar-editor-layout{grid-template-columns:1fr}.sidebar-preview-panel{position:static;max-width:360px}}@media(max-width:640px){.sidebar-config-card{padding:20px}.avatar-editor{grid-template-columns:1fr;text-align:center}.avatar-preview{margin:auto}.avatar-actions{justify-content:center}.field-grid{grid-template-columns:1fr}.field-wide{grid-column:auto}.module-item{grid-template-columns:18px 38px minmax(0,1fr) auto}.visibility-toggle{grid-column:3}.order-actions{grid-column:4;grid-row:1/3}.module-icon{width:38px;height:38px}}
.avatar-preview video,.preview-avatar video{width:100%;height:100%;object-fit:cover}
</style>
