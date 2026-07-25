<template>
  <div class="resume-workspace">
    <header class="workspace-bar">
      <div class="document-name">
        <FileTextIcon />
        <input v-model="resume.title" aria-label="简历名称">
      </div>

      <div v-if="user" class="library-control">
        <label>
          <span>我的简历</span>
          <select :value="currentResumeId ?? ''" @change="selectResume">
            <option value="">未保存的新简历</option>
            <option v-for="item in library" :key="item.id" :value="item.id">{{ item.title }}</option>
          </select>
        </label>
        <button type="button" title="新建简历" @click="newResume"><PlusIcon /></button>
        <button v-if="currentResumeId" class="danger" type="button" title="删除当前简历" @click="removeResume"><Trash2Icon /></button>
      </div>
      <NuxtLink v-else class="login-tip" :to="{ path: '/login', query: { redirect: '/tools/resume' } }">
        登录后保存到简历库
      </NuxtLink>

      <div class="workspace-actions">
        <span v-if="statusMessage" :class="{ error: statusError }">{{ statusMessage }}</span>
        <button v-if="user" class="save-button" type="button" :disabled="saving" @click="saveResume">
          <LoaderCircleIcon v-if="saving" class="spin" />
          <SaveIcon v-else />
          {{ saving ? '保存中' : '保存简历' }}
        </button>
        <button class="print-button" type="button" @click="printResume"><PrinterIcon /> 打印 / PDF</button>
      </div>
    </header>

    <div class="workspace-body">
      <aside class="resume-editor">
        <div class="editor-heading">
          <div>
            <span>RESUME EDITOR</span>
            <h1>简历内容</h1>
          </div>
          <small>栏目可自由增删与改名</small>
        </div>

        <section class="editor-card basic-card">
          <header><span>基本信息</span></header>
          <label class="avatar-field">
            <span class="avatar">
              <img v-if="resume.content.basic.avatar" :src="resume.content.basic.avatar" alt="">
              <UserRoundIcon v-else />
            </span>
            <span><strong>证件照</strong><small>点击上传，小于 2MB</small></span>
            <input type="file" accept="image/png,image/jpeg,image/webp" @change="handleAvatar">
          </label>
          <div class="form-grid">
            <EditorField v-model="resume.content.basic.name" label="姓名" placeholder="请输入姓名" />
            <EditorField v-model="resume.content.basic.birth" label="出生年月" placeholder="YYYY-MM" />
            <EditorField v-model="resume.content.basic.gender" label="性别" placeholder="男" />
            <EditorField v-model="resume.content.basic.politicalStatus" label="政治面貌" placeholder="共青团员" />
            <EditorField v-model="resume.content.basic.hometown" label="籍贯" placeholder="省 / 市" />
            <EditorField v-model="resume.content.basic.phone" label="电话" placeholder="138 0000 0000" />
            <EditorField v-model="resume.content.basic.email" class="wide" label="邮箱" placeholder="hello@example.com" />
          </div>
        </section>

        <section class="editor-card layout-card">
          <header><span>页面排版</span><small>设置会同步到打印结果</small></header>
          <div class="layout-settings">
            <label>
              <span><b>模块上下间距</b><output>{{ resume.layout.sectionGap.toFixed(1) }} mm</output></span>
              <input v-model.number="resume.layout.sectionGap" type="range" min="0" max="8" step="0.2">
            </label>
            <label>
              <span><b>正文行间距</b><output>{{ resume.layout.lineHeight.toFixed(2) }}</output></span>
              <input v-model.number="resume.layout.lineHeight" type="range" min="1.1" max="2" step="0.05">
            </label>
            <label>
              <span><b>左右边距</b><output>{{ resume.layout.pageMargin.toFixed(1) }} mm</output></span>
              <input v-model.number="resume.layout.pageMargin" type="range" min="3" max="18" step="0.5">
            </label>
            <label>
              <span><b>正文字号</b><output>{{ resume.layout.fontSize.toFixed(1) }} pt</output></span>
              <input v-model.number="resume.layout.fontSize" type="range" min="8" max="14" step="0.1">
            </label>
          </div>
        </section>

        <section
          v-for="(section, sectionIndex) in resume.content.sections"
          :key="section.id"
          class="editor-card section-card"
        >
          <header>
            <div class="section-name">
              <GripVerticalIcon />
              <input v-model="section.title" aria-label="栏目名称" placeholder="栏目名称">
              <PencilIcon />
            </div>
            <div class="card-actions">
              <button type="button" @click="addSectionItem(sectionIndex)"><PlusIcon /> 添加条目</button>
              <button class="danger" type="button" title="删除栏目" @click="deleteSection(sectionIndex)"><Trash2Icon /></button>
            </div>
          </header>

          <div v-if="!section.items.length" class="empty-section">
            此栏目还没有内容，点击“添加条目”开始填写。
          </div>

          <article v-for="(item, itemIndex) in section.items" :key="item.id" class="entry-editor">
            <div class="entry-label">
              <strong>条目 {{ itemIndex + 1 }}</strong>
              <button type="button" title="删除条目" @click="section.items.splice(itemIndex, 1)"><XIcon /></button>
            </div>
            <div class="form-grid">
              <EditorField v-model="item.range" label="时间" placeholder="2024-09 ~ 2027-06" />
              <EditorField v-model="item.heading" label="主体名称" placeholder="学校 / 项目 / 公司名称" />
              <EditorField v-model="item.tag" label="右侧信息" placeholder="学历 / 职位 / 角色" />
              <EditorField v-model="item.secondary" label="副标题" placeholder="可选" />
              <EditorField v-model="item.intro" class="wide" textarea label="描述" placeholder="项目简介、专业成绩或补充说明" />
              <EditorField v-model="item.stack" class="wide" label="技术栈" placeholder="Spring Boot、Redis、MySQL..." />
              <EditorField v-model="item.bullets" class="wide" textarea label="要点（每行一条）" placeholder="每行填写一个要点，预览中自动显示为项目符号" />
            </div>
          </article>
        </section>

        <button class="add-section" type="button" @click="addSection">
          <PlusCircleIcon />
          <span><strong>新增栏目</strong><small>创建一个可自由命名的简历栏目</small></span>
        </button>
      </aside>

      <main class="preview-area">
        <div class="preview-caption"><span>实时预览</span><small>A4 · 中文技术简历</small></div>
        <div class="preview-scroll">
          <div class="preview-document">
            <ResumePreview :data="resume.content" :layout="resume.layout" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import type { ResumeDocument, ResumeLibraryItem } from '~/types/resume'
import {
  FileText as FileTextIcon,
  GripVertical as GripVerticalIcon,
  LoaderCircle as LoaderCircleIcon,
  Pencil as PencilIcon,
  Plus as PlusIcon,
  PlusCircle as PlusCircleIcon,
  Printer as PrinterIcon,
  Save as SaveIcon,
  Trash2 as Trash2Icon,
  UserRound as UserRoundIcon,
  X as XIcon
} from '@lucide/vue'
import EditorField from '~/components/resume/EditorField.vue'
import { createDefaultResume, createEmptySectionItem, createResumeId, normalizeResume } from '~/utils/resume-defaults'

definePageMeta({ layout: false })

const { data: sessionData } = await useFetch('/api/auth/me')
const user = computed(() => sessionData.value?.data.user || null)
const resume = reactive<ResumeDocument>(createDefaultResume())
const library = ref<ResumeLibraryItem[]>([])
const currentResumeId = ref<number | null>(null)
const saving = ref(false)
const statusMessage = ref('')
const statusError = ref(false)
let messageTimer: ReturnType<typeof setTimeout> | undefined

function showStatus(message: string, error = false) {
  statusMessage.value = message
  statusError.value = error
  clearTimeout(messageTimer)
  messageTimer = setTimeout(() => { statusMessage.value = '' }, 3000)
}

function replaceResume(value: ResumeDocument) {
  Object.assign(resume, normalizeResume(value))
}

async function loadLibrary() {
  if (!user.value) return
  try {
    const result = await $fetch<ApiResult<ResumeLibraryItem[]>>('/api/resumes')
    library.value = result.data
  } catch {
    showStatus('简历库加载失败，请确认数据库迁移已执行', true)
  }
}

async function selectResume(event: Event) {
  const id = Number((event.target as HTMLSelectElement).value)
  if (!id) {
    newResume()
    return
  }
  try {
    const result = await $fetch<ApiResult<{ id: number, title: string, content: ResumeDocument['content'], layout?: ResumeDocument['layout'] }>>(`/api/resumes/${id}`)
    currentResumeId.value = result.data.id
    replaceResume({
      title: result.data.title,
      content: result.data.content,
      layout: result.data.layout || createDefaultResume().layout
    })
    showStatus('简历已载入')
  } catch {
    showStatus('简历载入失败', true)
  }
}

function newResume() {
  currentResumeId.value = null
  replaceResume(createDefaultResume())
  resume.title = '未命名简历'
  showStatus('已新建空白副本')
}

async function saveResume() {
  if (!user.value || saving.value) return
  saving.value = true
  try {
    const path = currentResumeId.value ? `/api/resumes/${currentResumeId.value}` : '/api/resumes'
    const result = await $fetch<ApiResult<{ id: number }>>(path, {
      method: currentResumeId.value ? 'PUT' : 'POST',
      body: { title: resume.title, content: resume.content, layout: resume.layout }
    })
    currentResumeId.value = result.data.id
    await loadLibrary()
    showStatus('已保存到个人简历库')
  } catch {
    showStatus('保存失败，请检查栏目名称和内容', true)
  } finally {
    saving.value = false
  }
}

async function removeResume() {
  if (!currentResumeId.value || !window.confirm('确定删除这份简历吗？此操作无法撤销。')) return
  try {
    await $fetch(`/api/resumes/${currentResumeId.value}`, { method: 'DELETE' })
    newResume()
    await loadLibrary()
    showStatus('简历已删除')
  } catch {
    showStatus('删除失败', true)
  }
}

function addSection() {
  resume.content.sections.push({
    id: createResumeId(),
    title: '新栏目',
    items: [createEmptySectionItem()]
  })
}

function deleteSection(index: number) {
  const title = resume.content.sections[index]?.title || '此栏目'
  if (window.confirm(`确定删除“${title}”及其中全部内容吗？`)) {
    resume.content.sections.splice(index, 1)
  }
}

function addSectionItem(index: number) {
  resume.content.sections[index]?.items.push(createEmptySectionItem())
}

function handleAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    showStatus('图片不能超过 2MB', true)
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => { resume.content.basic.avatar = String(reader.result || '') }
  reader.readAsDataURL(file)
}

function printResume() {
  window.print()
}

onMounted(loadLibrary)
onBeforeUnmount(() => clearTimeout(messageTimer))

useSeoMeta({
  title: '简历编辑器',
  description: '创建、编辑并保存中文技术简历。'
})
</script>

<style scoped>
.resume-workspace { min-height: 100vh; background: #edf0f5; color: #273142; }
.workspace-bar {
  position: sticky; z-index: 20; top: 0; display: grid; min-height: 62px; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 16px; padding: 9px 22px; border-bottom: 1px solid #dfe4ec; background: rgb(255 255 255 / 96%);
  box-shadow: 0 3px 14px rgb(32 42 62 / 5%); backdrop-filter: blur(12px);
}
.document-name { display: flex; min-width: 0; align-items: center; gap: 9px; }
.document-name > svg { width: 18px; color: #0874d1; }
.document-name input { width: min(300px, 28vw); border: 0; outline: 0; background: transparent; color: #1b2431; font-size: 14px; font-weight: 750; }
.library-control { display: flex; align-items: center; gap: 6px; }
.library-control label { display: flex; align-items: center; gap: 7px; }
.library-control label > span { color: #778191; font-size: 10px; font-weight: 700; }
.library-control select { width: 180px; height: 34px; padding: 0 27px 0 9px; border: 1px solid #dce1e8; border-radius: 8px; outline: 0; background: #fff; color: #455061; font-size: 10px; }
.library-control button { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #dce1e8; border-radius: 8px; background: #fff; color: #667183; cursor: pointer; }
.library-control button svg { width: 14px; }
.library-control button.danger { color: #bc5263; }
.login-tip { padding: 7px 11px; border-radius: 8px; background: #edf6ff; color: #0874d1; font-size: 10px; font-weight: 700; }
.workspace-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.workspace-actions > span { color: #16805d; font-size: 9px; }
.workspace-actions > span.error { color: #c04f61; }
.workspace-actions button { display: inline-flex; height: 35px; align-items: center; gap: 6px; padding: 0 11px; border-radius: 8px; cursor: pointer; font-size: 10px; font-weight: 750; }
.workspace-actions button svg { width: 14px; }
.save-button { border: 1px solid #cbd4df; background: #fff; color: #485466; }
.save-button:disabled { cursor: wait; opacity: .65; }
.print-button { border: 1px solid #0874d1; background: #0874d1; box-shadow: 0 5px 12px rgb(8 116 209 / 18%); color: #fff; }
.spin { animation: spin .8s linear infinite; }
.workspace-body { display: grid; height: calc(100vh - 62px); min-height: 700px; grid-template-columns: minmax(470px, 43%) 1fr; }
.resume-editor { overflow-y: auto; padding: 26px 28px 60px; border-right: 1px solid #dce1e9; background: #f9fafc; }
.editor-heading { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
.editor-heading span { color: #0874d1; font: 750 8px "JetBrains Mono", monospace; letter-spacing: .14em; }
.editor-heading h1 { margin: 4px 0 0; color: #192230; font-size: 22px; }
.editor-heading small { color: #949ca8; font-size: 9px; }
.editor-card { margin-bottom: 15px; overflow: hidden; border: 1px solid #dfe4eb; border-radius: 12px; background: #fff; box-shadow: 0 3px 9px rgb(34 45 67 / 3%); }
.editor-card > header { display: flex; min-height: 46px; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 12px; border-bottom: 1px solid #e8ebf0; background: #fbfcfd; }
.basic-card > header span { color: #263140; font-size: 12px; font-weight: 800; }
.basic-card { padding-bottom: 16px; }
.layout-card > header span { color: #263140; font-size: 12px; font-weight: 800; }
.layout-card > header small { color: #98a0ac; font-size: 8px; }
.layout-settings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 20px; padding: 16px; }
.layout-settings label { display: flex; min-width: 0; flex-direction: column; gap: 8px; }
.layout-settings label > span { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.layout-settings b { color: #5e6979; font-size: 9px; }
.layout-settings output { color: #0874d1; font: 700 8px "JetBrains Mono", monospace; }
.layout-settings input[type="range"] { width: 100%; height: 4px; accent-color: #0874d1; cursor: pointer; }
.avatar-field { display: flex; align-items: center; gap: 11px; margin: 15px 16px; cursor: pointer; }
.avatar-field input { display: none; }
.avatar { display: grid; width: 48px; height: 54px; place-items: center; overflow: hidden; background: #edf1f6; color: #99a2b0; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar svg { width: 20px; }
.avatar-field > span:last-of-type { display: flex; flex-direction: column; }
.avatar-field strong { color: #384353; font-size: 11px; }
.avatar-field small { margin-top: 3px; color: #959daa; font-size: 9px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 0 16px; }
.form-grid :deep(.wide) { grid-column: 1 / -1; }
.section-name { display: flex; min-width: 0; flex: 1; align-items: center; gap: 7px; }
.section-name > svg:first-child { width: 14px; color: #a5adba; }
.section-name > svg:last-child { width: 11px; color: #9aa3b0; }
.section-name input { width: min(210px, 100%); padding: 3px 5px; border: 1px solid transparent; border-radius: 5px; outline: 0; background: transparent; color: #0874d1; font-size: 12px; font-weight: 800; }
.section-name input:focus { border-color: #b7d8f4; background: #fff; }
.card-actions { display: flex; gap: 5px; }
.card-actions button { display: inline-flex; height: 28px; align-items: center; gap: 4px; padding: 0 7px; border: 1px solid #dce2e9; border-radius: 7px; background: #fff; color: #5f6b7c; cursor: pointer; font-size: 9px; font-weight: 700; }
.card-actions button svg { width: 11px; }
.card-actions button.danger { width: 28px; padding: 0; justify-content: center; color: #bd5968; }
.entry-editor { padding: 14px 0 16px; }
.entry-editor + .entry-editor { border-top: 1px dashed #dfe3e9; }
.entry-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 16px; }
.entry-label strong { color: #7e8897; font-size: 9px; }
.entry-label button { display: grid; width: 22px; height: 22px; place-items: center; border: 0; border-radius: 6px; background: #fff1f3; color: #c05869; cursor: pointer; }
.entry-label svg { width: 11px; }
.empty-section { padding: 24px; color: #9aa3af; font-size: 10px; text-align: center; }
.add-section { display: flex; width: 100%; align-items: center; justify-content: center; gap: 10px; padding: 16px; border: 1px dashed #bfcbd8; border-radius: 11px; background: #f7fbff; color: #0874d1; cursor: pointer; }
.add-section > svg { width: 19px; }
.add-section > span { display: flex; flex-direction: column; text-align: left; }
.add-section strong { font-size: 11px; }
.add-section small { margin-top: 2px; color: #8c99a8; font-size: 8px; }
.preview-area { display: flex; min-width: 0; overflow: hidden; flex-direction: column; background: #e9ecf2; }
.preview-caption { display: flex; height: 45px; flex: 0 0 45px; align-items: center; justify-content: space-between; padding: 0 20px; border-bottom: 1px solid #dadee6; background: #f3f5f8; }
.preview-caption span { color: #4f5968; font-size: 10px; font-weight: 750; }
.preview-caption small { color: #8b94a2; font-size: 8px; }
.preview-scroll { flex: 1; overflow: auto; padding: 28px; }
.preview-document { width: 210mm; margin: 0 auto; zoom: .72; }

@media (max-width: 1100px) {
  .workspace-body { grid-template-columns: minmax(430px, 49%) 1fr; }
  .preview-document { zoom: .56; }
  .workspace-actions > span, .library-control label > span { display: none; }
}
@media (max-width: 760px) {
  .workspace-bar { position: relative; grid-template-columns: 1fr auto; padding: 9px 12px; }
  .library-control { grid-row: 2; grid-column: 1 / -1; justify-content: center; }
  .library-control select { width: 230px; }
  .document-name input { width: 190px; }
  .workspace-actions .save-button { font-size: 0; }
  .workspace-body { height: auto; min-height: 0; grid-template-columns: 1fr; }
  .resume-editor { overflow: visible; padding: 22px 13px 40px; }
  .preview-area { min-height: 650px; }
  .preview-scroll { padding: 18px 8px; }
  .preview-document { zoom: .45; }
}
@media (max-width: 430px) {
  .document-name input { width: 140px; }
  .workspace-actions .print-button { padding: 0 9px; font-size: 0; }
  .form-grid { grid-template-columns: 1fr; }
  .form-grid :deep(.wide) { grid-column: auto; }
  .layout-settings { grid-template-columns: 1fr; }
  .preview-document { zoom: .39; }
}
@keyframes spin { to { transform: rotate(360deg); } }

@media print {
  :global(@page) { size: A4; margin: 0; }
  :global(html), :global(body), :global(#__nuxt) { width: 210mm !important; min-width: 210mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .workspace-bar, .resume-editor, .preview-caption { display: none !important; }
  .resume-workspace, .workspace-body, .preview-area, .preview-scroll { display: block !important; width: 210mm !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; }
  .preview-document { width: 210mm !important; margin: 0 !important; zoom: 1 !important; }
  .preview-document :deep(.resume-paper) { box-shadow: none !important; }
}
</style>
