<template>
  <div class="resume-workspace">
    <component :is="'style'">{{ printPageCss }}</component>

    <header class="workspace-bar">
      <div class="document-name">
        <NuxtLink class="back-to-tools" to="/tools" aria-label="返回工具页" title="返回工具页">
          <ArrowLeftIcon aria-hidden="true" />
          <span>返回</span>
        </NuxtLink>
        <FileTextIcon />
        <div class="document-details">
          <input v-model="resume.title" aria-label="简历名称">
          <small class="draft-state" role="status">{{ draftLabel }}</small>
        </div>
      </div>

      <div v-if="user" class="library-control">
        <label>
          <span>我的简历</span>
          <select :value="currentResumeId ?? ''" :disabled="saving" @change="selectResume">
            <option value="">未保存的新简历</option>
            <option v-for="item in library" :key="item.id" :value="item.id">{{ item.title }}</option>
          </select>
        </label>
        <button type="button" title="新建简历" :disabled="saving" @click="newResume()"><PlusIcon /></button>
        <button v-if="currentResumeId" class="danger" type="button" title="删除当前简历" :disabled="saving" @click="removeResume"><Trash2Icon /></button>
      </div>
      <button v-else class="login-tip" type="button" @click="loginWithDraft">
        登录后保存到简历库
      </button>

      <div class="workspace-actions">
        <input
          ref="jsonFileInput"
          class="json-file-input"
          type="file"
          accept=".json,.resume.json,application/json"
          aria-label="选择要导入的简历 JSON 文件"
          @change="importResumeJson"
        >
        <button class="json-button" type="button" title="导入可编辑的简历 JSON" :disabled="saving" @click="jsonFileInput?.click()">
          <FileUpIcon />
          导入 JSON
        </button>
        <button class="json-button" type="button" title="导出可交给 AI 编辑的简历 JSON" @click="exportResumeJson">
          <FileJsonIcon />
          导出 JSON
        </button>
        <button v-if="user" class="save-button" type="button" :disabled="saving" @click="saveResume">
          <LoaderCircleIcon v-if="saving" class="spin" />
          <SaveIcon v-else />
          {{ saving ? '保存中' : '保存简历' }}
        </button>
        <button class="print-button" type="button" :disabled="exporting" @click="exportPdf">
          <LoaderCircleIcon v-if="exporting" class="spin" />
          <FileDownIcon v-else />
          {{ exporting ? '生成中' : user ? '导出 PDF' : '登录并导出 PDF' }}
        </button>
      </div>
    </header>

    <div v-if="statusMessage" class="status-toast" :class="{ error: statusError }" :role="statusError ? 'alert' : 'status'">
      <span>{{ statusMessage }}</span>
      <button type="button" aria-label="关闭提示" @click="statusMessage = ''"><XIcon /></button>
    </div>
    <dialog ref="discardDialog" class="discard-dialog" aria-labelledby="discard-title" @cancel.prevent="!saving && resolveDiscard(false)">
      <h2 id="discard-title">保留当前修改？</h2>
      <p>继续后将离开或替换当前草稿。可以先保存，再继续操作。</p>
      <p v-if="!user">JSON 备份不包含证件照。</p>
      <p v-if="statusError && statusMessage" class="dialog-error" role="alert">{{ statusMessage }}</p>
      <div class="discard-actions">
        <button type="button" :disabled="saving" @click="resolveDiscard(false)">取消</button>
        <button type="button" :disabled="saving" @click="resolveDiscard(true)">放弃修改</button>
        <button v-if="user" class="primary" type="button" :disabled="saving" @click="saveAndContinue">{{ saving ? '保存中…' : '保存并继续' }}</button>
        <button v-else class="primary" type="button" @click="exportResumeJson(); resolveDiscard(true)">导出 JSON 并继续</button>
      </div>
    </dialog>
    <dialog ref="entryDeleteDialog" class="discard-dialog entry-delete-dialog" aria-labelledby="entry-delete-title" @close="pendingEntryDelete = null">
      <div class="delete-dialog-icon" aria-hidden="true"><Trash2Icon /></div>
      <h2 id="entry-delete-title">删除{{ pendingEntryDelete?.kind }}？</h2>
      <p v-if="pendingEntryDelete">“{{ pendingEntryDelete.label }}”{{ pendingEntryDelete.description }}</p>
      <div class="discard-actions">
        <button type="button" autofocus @click="closeEntryDeleteDialog">取消</button>
        <button class="danger-confirm" type="button" @click="confirmEntryDelete">确认删除</button>
      </div>
    </dialog>

    <div class="mobile-view-tabs" role="group" aria-label="工作区视图">
      <button type="button" :aria-pressed="mobileView === 'editor'" @click="mobileView = 'editor'">编辑内容</button>
      <button type="button" :aria-pressed="mobileView === 'preview'" @click="mobileView = 'preview'">预览简历</button>
    </div>
    <div ref="workspaceBody" class="workspace-body" :data-view="mobileView" :style="splitStyle">
      <aside ref="resumeEditor" class="resume-editor">
        <div class="editor-heading">
          <div>
            <span>RESUME EDITOR</span>
            <h1>简历内容</h1>
          </div>
          <small>栏目可自由增删与改名</small>
        </div>

        <section class="editor-card layout-card">
          <header>
            <span>页面排版</span>
            <span class="layout-card-meta">
              <label class="template-control">
                <span>模板</span>
                <select v-model="resume.layout.template" aria-label="选择简历模板">
                  <option v-for="option in resumeTemplateOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <small>设置会同步到打印结果</small>
              <button class="collapse-button" type="button" :aria-expanded="!layoutCollapsed" aria-label="折叠或展开页面排版" @click="layoutCollapsed = !layoutCollapsed">
                <ChevronDownIcon :class="{ collapsed: layoutCollapsed }" />
              </button>
            </span>
          </header>
          <div v-show="!layoutCollapsed" class="layout-settings">
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
              <span><b>上下边距</b><output>{{ resume.layout.verticalMargin.toFixed(1) }} mm</output></span>
              <input v-model.number="resume.layout.verticalMargin" type="range" min="3" max="18" step="0.5">
            </label>
            <label>
              <span><b>正文字号</b><output>{{ resume.layout.fontSize.toFixed(1) }} pt</output></span>
              <input v-model.number="resume.layout.fontSize" type="range" min="8" max="14" step="0.1">
            </label>
          </div>
        </section>

        <section class="editor-card basic-card">
          <header>
            <span>基本信息</span>
            <button class="collapse-button" type="button" :aria-expanded="!basicCollapsed" aria-label="折叠或展开基本信息" @click="basicCollapsed = !basicCollapsed">
              <ChevronDownIcon :class="{ collapsed: basicCollapsed }" />
            </button>
          </header>
          <div v-show="!basicCollapsed">
            <label class="avatar-field">
              <span class="avatar">
                <img v-if="resume.content.basic.avatar" :src="resume.content.basic.avatar" alt="">
                <UserRoundIcon v-else />
              </span>
              <span><strong>证件照</strong><small>点击上传，不超过 10MB</small></span>
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
          </div>
        </section>

        <section
          v-for="(section, sectionIndex) in resume.content.sections"
          :key="section.id"
          :data-section-id="section.id"
          class="editor-card section-card"
          :class="{
            'is-dragging': draggedSectionId === section.id,
            'is-drag-over': dragOverSectionId === section.id
          }"
        >
          <header>
            <div class="section-name">
              <button
                class="section-drag-handle"
                type="button"
                :aria-label="`拖动调整“${section.title || '未命名栏目'}”的位置`"
                title="拖动调整顺序；也可用上下方向键"
                @pointerdown="startSectionDrag($event, section.id)"
                @keydown="reorderSectionWithKeyboard($event, section.id)"
              >
                <GripVerticalIcon aria-hidden="true" />
              </button>
              <label class="section-title-editor" title="点击修改栏目名称">
                <PencilIcon aria-hidden="true" />
                <input
                  v-model="section.title"
                  :size="sectionTitleInputSize(section.title)"
                  aria-label="栏目名称"
                  placeholder="栏目名称"
                >
              </label>
              <small v-if="section.title.trim() !== sectionTypeLabel(section.type)" title="栏目类型">
                {{ sectionTypeLabel(section.type) }}
              </small>
            </div>
            <div class="card-actions">
              <button type="button" @click="addSectionItem(sectionIndex)"><PlusIcon /> {{ section.type === 'experience' ? '添加项目' : '添加条目' }}</button>
              <button class="danger" type="button" title="删除栏目" @click="deleteSection(sectionIndex)"><Trash2Icon /></button>
              <button class="collapse-button" type="button" :aria-expanded="!isSectionCollapsed(section.id)" title="折叠或展开栏目" @click="toggleSection(section.id)">
                <ChevronDownIcon :class="{ collapsed: isSectionCollapsed(section.id) }" />
              </button>
            </div>
          </header>

          <div v-show="!isSectionCollapsed(section.id)">
            <div v-if="!section.items.length" class="empty-section">
              此栏目还没有内容，点击“{{ section.type === 'experience' ? '添加项目' : '添加条目' }}”开始填写。
            </div>

            <template v-if="section.type === 'experience' && section.items[0]">
              <div class="experience-company-editor">
                <div class="entry-label">
                  <strong>公司信息与共用技术栈</strong>
                </div>
                <div class="form-grid">
                  <EditorField v-model="section.items[0].heading" label="公司 / 组织" placeholder="公司或组织名称" />
                  <EditorField v-model="section.items[0].tag" label="职位" placeholder="软件开发实习生" />
                  <EditorField v-model="section.items[0].range" label="任职时间" placeholder="2026-05 ~ 2026-08" />
                  <EditorField v-model="section.items[0].badge" label="荣誉 / 亮点" placeholder="优秀实习生 / 最佳新人" />
                  <EditorField v-model="section.items[0].stack" class="wide" label="共用技术栈" placeholder="Java、Spring Boot、MySQL、Redis" />
                </div>
              </div>

              <article v-for="(item, itemIndex) in section.items" :key="item.id" :data-item-id="item.id" class="entry-editor experience-project-editor">
                <div class="entry-label">
                  <strong>项目 {{ itemIndex + 1 }}</strong>
                  <button type="button" title="删除项目" :aria-label="`删除项目 ${itemIndex + 1}`" @click="requestEntryDelete(sectionIndex, itemIndex)"><XIcon /></button>
                </div>
                <div class="form-grid">
                  <EditorField v-model="item.intro" label="项目名称" placeholder="项目一：骑手事故处置 AI Agent" />
                  <EditorField v-model="item.projectRole" label="项目角色" placeholder="后端开发 / 全栈开发" />
                  <EditorField v-model="item.secondary" class="wide" label="项目背景" placeholder="项目背景、业务问题和建设目标" textarea rich />
                  <EditorField v-model="item.bullets" class="wide" label="工作内容与成果（每行一项）" placeholder="描述你的工作、解决的问题和量化结果" textarea rich />
                </div>
              </article>
            </template>

            <template v-else>
              <article v-for="(item, itemIndex) in section.items" :key="item.id" :data-item-id="item.id" class="entry-editor">
                <div class="entry-label">
                  <strong>条目 {{ itemIndex + 1 }}</strong>
                  <button type="button" title="删除条目" :aria-label="`删除条目 ${itemIndex + 1}`" @click="requestEntryDelete(sectionIndex, itemIndex)"><XIcon /></button>
                </div>
                <div class="form-grid">
                  <EditorField
                    v-for="field in sectionFields(section.type)"
                    :key="field.key"
                    :model-value="item[field.key]"
                    :class="{ wide: field.wide }"
                    :label="field.label"
                    :placeholder="field.placeholder"
                    :textarea="field.textarea"
                    :rich="field.rich"
                    @update:model-value="item[field.key] = $event"
                  />
                </div>
              </article>
            </template>
          </div>
        </section>

        <div class="add-section-wrap">
          <button class="add-section" type="button" :aria-expanded="sectionPickerOpen" @click="sectionPickerOpen = !sectionPickerOpen">
            <PlusCircleIcon />
            <span><strong>新增栏目</strong><small>选择要添加的栏目类型</small></span>
            <ChevronDownIcon :class="{ open: sectionPickerOpen }" />
          </button>
          <div v-if="sectionPickerOpen" class="section-picker">
            <button v-for="option in sectionTypeOptions" :key="option.type" type="button" @click="addSection(option.type)">
              <span class="section-type-icon"><component :is="option.icon" /></span>
              <span><strong>{{ option.title }}</strong><small>{{ option.description }}</small></span>
            </button>
          </div>
        </div>
      </aside>

      <div
        class="workspace-divider"
        :class="{ resizing }"
        role="separator"
        aria-label="调整编辑区和预览区宽度"
        aria-orientation="vertical"
        tabindex="0"
        @pointerdown="startResize"
        @keydown="resizeWithKeyboard"
      >
        <span><GripVerticalIcon /></span>
      </div>

      <main class="preview-area">
        <div class="preview-caption">
          <span>实时预览</span>
          <div class="preview-zoom" aria-label="预览缩放">
            <button type="button" aria-label="缩小预览" :disabled="previewZoom <= minZoom" @click="changeZoom(-10)"><MinusIcon /></button>
            <button class="zoom-value" type="button" title="显示原始比例" @click="zoomMode = 'manual'; previewZoom = 100">{{ previewZoom }}%</button>
            <button type="button" aria-label="放大预览" :disabled="previewZoom >= maxZoom" @click="changeZoom(10)"><PlusIcon /></button>
          </div>
          <div class="preview-options">
            <button type="button" :aria-pressed="zoomMode === 'fit'" @click="fitPreview">适应宽度</button>
            <small>A4 · {{ pageCount }} 页</small>
          </div>
        </div>
        <div class="preview-scroll">
          <div ref="previewDocument" class="preview-document" :style="{ zoom: previewZoom / 100 }">
            <ResumePreview :data="resume.content" :layout="resume.layout" />
            <div
              v-for="page in pageCount - 1"
              :key="page"
              class="page-break-marker"
              :style="{ top: pageBreakTop(page) }"
              aria-hidden="true"
            >
              <span>第 {{ page + 1 }} 页</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import type { Component } from 'vue'
import type { ResumeDocument, ResumeLibraryItem, ResumeSectionItem, ResumeSectionType, ResumeTemplate } from '~/types/resume'
import {
  ArrowLeft as ArrowLeftIcon,
  BriefcaseBusiness as BriefcaseBusinessIcon,
  ChevronDown as ChevronDownIcon,
  FileDown as FileDownIcon,
  FileJson as FileJsonIcon,
  FileText as FileTextIcon,
  FileUp as FileUpIcon,
  FlaskConical as FlaskConicalIcon,
  FolderKanban as FolderKanbanIcon,
  GraduationCap as GraduationCapIcon,
  GripVertical as GripVerticalIcon,
  LoaderCircle as LoaderCircleIcon,
  Minus as MinusIcon,
  Pencil as PencilIcon,
  Plus as PlusIcon,
  PlusCircle as PlusCircleIcon,
  Save as SaveIcon,
  Sparkles as SparklesIcon,
  Trash2 as Trash2Icon,
  UserRound as UserRoundIcon,
  Users as UsersIcon,
  X as XIcon
} from '@lucide/vue'
import EditorField from '~/components/resume/EditorField.vue'
import { createDefaultResume, createEmptySectionItem, createResumeId, normalizeResume } from '~/utils/resume-defaults'
import { createPortableResume, parsePortableResume, PORTABLE_RESUME_MAX_BYTES } from '~/utils/resume-portable'

definePageMeta({ layout: false })

const { data: sessionData } = await useFetch('/api/auth/me')
const user = computed(() => sessionData.value?.data.user || null)
const resume = reactive<ResumeDocument>(createDefaultResume())
const library = ref<ResumeLibraryItem[]>([])
const currentResumeId = ref<number | null>(null)
const saving = ref(false)
const exporting = ref(false)
const statusMessage = ref('')
const statusError = ref(false)
const basicCollapsed = ref(false)
const layoutCollapsed = ref(true)
const sectionPickerOpen = ref(false)
const collapsedSections = reactive<Record<string, boolean>>({})
const workspaceBody = ref<HTMLElement | null>(null)
const resumeEditor = ref<HTMLElement | null>(null)
const previewDocument = ref<HTMLElement | null>(null)
const jsonFileInput = ref<HTMLInputElement | null>(null)
const editorWidth = ref('43%')
const resizing = ref(false)
const defaultZoom = 100
const minZoom = 20
const maxZoom = 120
const continuationTopExtra = 4
const previewZoom = ref(defaultZoom)
const zoomMode = ref<'fit' | 'manual'>('fit')
const mobileView = ref<'editor' | 'preview'>('editor')
const draggedSectionId = ref<string | null>(null)
const dragOverSectionId = ref<string | null>(null)
const pageCount = ref(1)
const savedSnapshot = ref(JSON.stringify(resume))
const dirty = computed(() => JSON.stringify(resume) !== savedSnapshot.value)
const draftStored = ref(false)
const draftReady = ref(false)
const draftKey = computed(() => `resume-draft-v1:${user.value?.id ?? 'guest'}`)
const draftLabel = computed(() => dirty.value
  ? draftStored.value ? '草稿已存本机 · 未保存到简历库' : '未保存'
  : currentResumeId.value ? '已保存到简历库' : '示例简历')
const discardDialog = ref<HTMLDialogElement | null>(null)
const entryDeleteDialog = ref<HTMLDialogElement | null>(null)
const pendingEntryDelete = ref<{
  sectionId: string
  itemId: string
  kind: '条目' | '项目'
  label: string
  description: string
} | null>(null)
let discardResolver: ((value: boolean) => void) | undefined
let draftTimer: ReturnType<typeof setTimeout> | undefined
let viewportObserver: ResizeObserver | undefined

function persistDraft() {
  clearTimeout(draftTimer)
  if (!draftReady.value) return false
  try {
    localStorage.setItem(draftKey.value, JSON.stringify({ document: resume, id: currentResumeId.value, savedSnapshot: savedSnapshot.value }))
    draftStored.value = true
    return true
  } catch {
    draftStored.value = false
    showStatus('本机草稿保存失败，请保存到简历库或导出 JSON 备份', true)
    return false
  }
}

function resolveDiscard(continueAction: boolean) {
  discardDialog.value?.close()
  discardResolver?.(continueAction)
  discardResolver = undefined
}

function confirmReplace() {
  if (!dirty.value) return Promise.resolve(true)
  if (discardResolver) return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    discardResolver = resolve
    discardDialog.value?.showModal()
  })
}

async function loginWithDraft() {
  if (!persistDraft()) return
  try {
    sessionStorage.setItem('resume-transfer-guest', '1')
  } catch {
    showStatus('无法保留登录前的草稿，请先导出 JSON 备份', true)
    return
  }
  await navigateTo({ path: '/login', query: { redirect: '/tools/resume' } })
}

async function saveAndContinue() {
  if (await saveResume()) resolveDiscard(true)
}

function protectUnload(event: BeforeUnloadEvent) {
  if (dirty.value && !persistDraft()) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  if (persistDraft()) return true
  // A failed local backup must not silently lose edits, including on the way to login.
  return await confirmReplace()
})

watch(resume, () => {
  if (!draftReady.value) return
  draftStored.value = false
  clearTimeout(draftTimer)
  draftTimer = setTimeout(persistDraft, 300)
}, { deep: true })
const splitStyle = computed(() => ({ '--editor-width': editorWidth.value }))
const printPageCss = computed(() => `@media print {
  @page {
    size: A4;
    margin: ${resume.layout.verticalMargin + continuationTopExtra}mm 0 ${resume.layout.verticalMargin}mm;
  }
  @page :first {
    margin-top: ${resume.layout.verticalMargin}mm;
  }
}`)

type EditableSectionItemKey = Exclude<keyof ResumeSectionItem, 'id'>
type SectionField = {
  key: EditableSectionItemKey
  label: string
  placeholder: string
  wide?: boolean
  textarea?: boolean
  rich?: boolean
}
type SectionTypeOption = {
  type: ResumeSectionType
  title: string
  description: string
  icon: Component
}

const sectionTypeOptions: SectionTypeOption[] = [
  { type: 'education', title: '教育背景', description: '院校、学历与成绩课程', icon: GraduationCapIcon },
  { type: 'skills', title: '技能特长', description: '按行填写技能与能力', icon: SparklesIcon },
  { type: 'project', title: '项目经验', description: '项目介绍、技术栈与成果', icon: FolderKanbanIcon },
  { type: 'experience', title: '实习 / 工作经历', description: '公司、职位与工作内容', icon: BriefcaseBusinessIcon },
  { type: 'research', title: '科研经历', description: '课题、论文与研究成果', icon: FlaskConicalIcon },
  { type: 'campus', title: '校园经历', description: '组织、角色与活动成果', icon: UsersIcon }
]
const resumeTemplateOptions: Array<{ value: ResumeTemplate, label: string }> = [
  { value: 'classic', label: '经典模板' },
  { value: 'modern', label: '新模板' }
]

const sectionFieldMap: Record<ResumeSectionType, SectionField[]> = {
  education: [
    { key: 'range', label: '就读时间', placeholder: '2022-09 ~ 2025-06' },
    { key: 'heading', label: '院校名称', placeholder: '学校名称' },
    { key: 'badge', label: '院校标签', placeholder: '双一流 211' },
    { key: 'tag', label: '专业与学历', placeholder: '软件工程（硕士）' },
    { key: 'direction', label: '研究方向', placeholder: '研究方向：计算机视觉', wide: true },
    { key: 'intro', label: '成绩、课程与荣誉', placeholder: 'GPA、排名、主修课程、奖学金等', wide: true, textarea: true, rich: true }
  ],
  skills: [
    { key: 'bullets', label: '技能描述（每行一项）', placeholder: '编程语言：熟悉 Java、TypeScript\n工程实践：熟悉 Git、Docker、Linux', wide: true, textarea: true, rich: true }
  ],
  project: [
    { key: 'range', label: '项目时间', placeholder: '2024-08 ~ 2025-03' },
    { key: 'heading', label: '项目名称', placeholder: '项目名称' },
    { key: 'tag', label: '项目角色', placeholder: '后端开发 / 项目负责人' },
    { key: 'intro', label: '项目描述', placeholder: '项目背景、目标和主要能力', wide: true, textarea: true, rich: true },
    { key: 'stack', label: '技术栈', placeholder: 'Nuxt、Spring Boot、PostgreSQL、Redis', wide: true },
    { key: 'bullets', label: '项目成果（每行一项）', placeholder: '描述你的工作、解决的问题和量化结果', wide: true, textarea: true, rich: true }
  ],
  experience: [],
  research: [
    { key: 'range', label: '研究时间', placeholder: '2023-09 ~ 至今' },
    { key: 'heading', label: '课题 / 论文名称', placeholder: '研究课题或论文名称' },
    { key: 'tag', label: '角色 / 状态', placeholder: '第一作者 / 在投' },
    { key: 'intro', label: '研究概述', placeholder: '研究问题、思路与个人贡献', wide: true, textarea: true, rich: true },
    { key: 'stack', label: '方法与工具', placeholder: 'Python、PyTorch、CUDA...', wide: true },
    { key: 'bullets', label: '研究成果（每行一项）', placeholder: '论文、专利、指标或阶段性成果', wide: true, textarea: true, rich: true }
  ],
  campus: [
    { key: 'range', label: '参与时间', placeholder: '2020-09 ~ 2021-09' },
    { key: 'heading', label: '活动 / 组织', placeholder: '社团、学生组织或活动名称' },
    { key: 'tag', label: '担任角色', placeholder: '负责人 / 组长' },
    { key: 'bullets', label: '经历与成果（每行一项）', placeholder: '组织的活动、承担的职责和取得的成果', wide: true, textarea: true, rich: true }
  ]
}
let messageTimer: ReturnType<typeof setTimeout> | undefined
let previewResizeObserver: ResizeObserver | undefined

function showStatus(message: string, error = false) {
  statusMessage.value = message
  statusError.value = error
  clearTimeout(messageTimer)
  if (!error) messageTimer = setTimeout(() => { statusMessage.value = '' }, 5000)
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
    showStatus('简历库加载失败，请稍后刷新重试；当前内容仍可导出 JSON', true)
  }
}

async function selectResume(event: Event) {
  const select = event.target as HTMLSelectElement
  const id = Number(select.value)
  select.value = String(currentResumeId.value ?? '')
  if (!id) {
    await newResume()
    return
  }
  if (!await confirmReplace()) return
  try {
    const result = await $fetch<ApiResult<{ id: number, title: string, content: ResumeDocument['content'], layout?: ResumeDocument['layout'] }>>(`/api/resumes/${id}`)
    currentResumeId.value = result.data.id
    replaceResume({
      title: result.data.title,
      content: result.data.content,
      layout: result.data.layout || createDefaultResume().layout
    })
    savedSnapshot.value = JSON.stringify(resume)
    persistDraft()
    showStatus('简历已载入')
  } catch {
    showStatus('简历载入失败', true)
  }
}

async function newResume(skipConfirmation = false) {
  if (skipConfirmation !== true && !await confirmReplace()) return
  currentResumeId.value = null
  replaceResume(createDefaultResume())
  resume.title = '未命名简历'
  savedSnapshot.value = JSON.stringify(resume)
  persistDraft()
  showStatus('已新建示例副本，可修改为你的简历')
}

async function saveResume() {
  if (!user.value || saving.value) return
  saving.value = true
  const snapshot = JSON.stringify(resume)
  try {
    const path = currentResumeId.value ? `/api/resumes/${currentResumeId.value}` : '/api/resumes'
    const result = await $fetch<ApiResult<{ id: number }>>(path, {
      method: currentResumeId.value ? 'PUT' : 'POST',
      body: JSON.parse(snapshot)
    })
    currentResumeId.value = result.data.id
    await loadLibrary()
    savedSnapshot.value = snapshot
    persistDraft()
    showStatus('已保存到个人简历库')
    return true
  } catch {
    showStatus('保存失败，请检查栏目名称和内容后重试', true)
    return false
  } finally {
    saving.value = false
  }
}

async function removeResume() {
  if (!currentResumeId.value || !window.confirm('确定删除这份简历吗？此操作无法撤销。')) return
  try {
    await $fetch(`/api/resumes/${currentResumeId.value}`, { method: 'DELETE' })
    await newResume(true)
    await loadLibrary()
    showStatus('简历已删除')
  } catch {
    showStatus('删除失败', true)
  }
}

function sectionFields(type: ResumeSectionType) {
  return sectionFieldMap[type]
}

function sectionTypeLabel(type: ResumeSectionType) {
  return sectionTypeOptions.find(option => option.type === type)?.title || '自定义栏目'
}

function sectionTitleInputSize(title: string) {
  return Math.max(4, Math.min(Array.from(title.trim()).length || 4, 14))
}

function addSection(type: ResumeSectionType) {
  const option = sectionTypeOptions.find(item => item.type === type)
  const section = {
    id: createResumeId(),
    title: option?.title || '新栏目',
    type,
    items: [createEmptySectionItem()]
  }
  resume.content.sections.push(section)
  collapsedSections[section.id] = false
  sectionPickerOpen.value = false
}

function deleteSection(index: number) {
  const title = resume.content.sections[index]?.title || '此栏目'
  if (window.confirm(`确定删除“${title}”及其中全部内容吗？`)) {
    const [removed] = resume.content.sections.splice(index, 1)
    if (removed) Reflect.deleteProperty(collapsedSections, removed.id)
  }
}

function moveSection(index: number, offset: -1 | 1) {
  const targetIndex = index + offset
  if (targetIndex < 0 || targetIndex >= resume.content.sections.length) return
  const [section] = resume.content.sections.splice(index, 1)
  if (section) resume.content.sections.splice(targetIndex, 0, section)
}

let draggedSectionMoved = false
let sectionDragPointerId: number | null = null
let sectionDragGhost: HTMLElement | null = null
let sectionDragOffsetX = 0
let sectionDragOffsetY = 0
const sectionMoveAnimations = new Map<string, Animation>()

function startSectionDrag(event: PointerEvent, sectionId: string) {
  if (event.button !== 0) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).focus({ preventScroll: true })
  draggedSectionId.value = sectionId
  dragOverSectionId.value = sectionId
  draggedSectionMoved = false
  sectionDragPointerId = event.pointerId
  createSectionDragGhost(event, sectionId)
  document.body.style.cursor = 'grabbing'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', handleSectionDrag, { passive: false })
  window.addEventListener('pointerup', stopSectionDrag)
  window.addEventListener('pointercancel', stopSectionDrag)
}

function handleSectionDrag(event: PointerEvent) {
  if (event.pointerId !== sectionDragPointerId || !draggedSectionId.value) return
  event.preventDefault()
  positionSectionDragGhost(event.clientX, event.clientY)
  autoScrollSectionList(event.clientY)

  const targetCard = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-section-id]')
  const targetId = targetCard?.dataset.sectionId
  if (!targetCard || !targetId) return
  dragOverSectionId.value = targetId
  if (targetId === draggedSectionId.value) return

  const currentIndex = resume.content.sections.findIndex(section => section.id === draggedSectionId.value)
  const targetIndex = resume.content.sections.findIndex(section => section.id === targetId)
  if (currentIndex < 0 || targetIndex < 0) return

  const insertAfterTarget = event.clientY > targetCard.getBoundingClientRect().top + targetCard.offsetHeight / 2
  let nextIndex = targetIndex + (insertAfterTarget ? 1 : 0)
  if (nextIndex > currentIndex) nextIndex -= 1
  if (nextIndex === currentIndex) return

  const previousPositions = sectionCardPositions()
  const [section] = resume.content.sections.splice(currentIndex, 1)
  if (section) {
    resume.content.sections.splice(nextIndex, 0, section)
    draggedSectionMoved = true
    nextTick(() => animateSectionCards(previousPositions))
  }
}

function createSectionDragGhost(event: PointerEvent, sectionId: string) {
  const source = resumeEditor.value?.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(sectionId)}"]`)
  const sourceHeader = source?.querySelector<HTMLElement>(':scope > header')
  if (!source || !sourceHeader) return

  sectionDragGhost?.remove()
  const sourceRect = source.getBoundingClientRect()
  sectionDragOffsetX = event.clientX - sourceRect.left
  sectionDragOffsetY = event.clientY - sourceRect.top

  const ghost = document.createElement('section')
  ghost.className = 'editor-card section-card section-drag-ghost'
  ghost.setAttribute('aria-hidden', 'true')
  Array.from(source.attributes).forEach((attribute) => {
    if (attribute.name.startsWith('data-v-')) ghost.setAttribute(attribute.name, '')
  })
  const header = sourceHeader.cloneNode(true) as HTMLElement
  const sourceInputs = sourceHeader.querySelectorAll<HTMLInputElement>('input')
  header.querySelectorAll<HTMLInputElement>('input').forEach((input, index) => {
    input.value = sourceInputs[index]?.value || ''
  })
  header.querySelectorAll<HTMLElement>('button, input').forEach((element) => { element.tabIndex = -1 })
  ghost.appendChild(header)
  ghost.style.width = `${sourceRect.width}px`
  document.body.appendChild(ghost)
  sectionDragGhost = ghost
  positionSectionDragGhost(event.clientX, event.clientY)
  requestAnimationFrame(() => ghost.classList.add('is-visible'))
}

function positionSectionDragGhost(clientX: number, clientY: number) {
  if (!sectionDragGhost) return
  sectionDragGhost.style.transform = `translate3d(${clientX - sectionDragOffsetX}px, ${clientY - sectionDragOffsetY}px, 0) rotate(.35deg) scale(1.015)`
}

function sectionCardPositions() {
  return new Map(Array.from(resumeEditor.value?.querySelectorAll<HTMLElement>('[data-section-id]') || []).map(card => (
    [card.dataset.sectionId || '', card.getBoundingClientRect().top]
  )))
}

function animateSectionCards(previousPositions: Map<string, number>) {
  resumeEditor.value?.querySelectorAll<HTMLElement>('[data-section-id]').forEach((card) => {
    const id = card.dataset.sectionId || ''
    const previousTop = previousPositions.get(id)
    if (previousTop === undefined) return
    const delta = previousTop - card.getBoundingClientRect().top
    if (Math.abs(delta) < 1) return
    sectionMoveAnimations.get(id)?.cancel()
    const animation = card.animate(
      [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
      { duration: 190, easing: 'cubic-bezier(.2, .8, .2, 1)' }
    )
    sectionMoveAnimations.set(id, animation)
    animation.addEventListener('finish', () => sectionMoveAnimations.delete(id), { once: true })
  })
}

function autoScrollSectionList(clientY: number) {
  const edgeSize = 72
  if (window.matchMedia('(max-width: 760px)').matches) {
    if (clientY < edgeSize) window.scrollBy(0, -12)
    else if (clientY > window.innerHeight - edgeSize) window.scrollBy(0, 12)
    return
  }

  const editor = resumeEditor.value
  if (!editor) return
  const rect = editor.getBoundingClientRect()
  if (clientY < rect.top + edgeSize) editor.scrollBy(0, -12)
  else if (clientY > rect.bottom - edgeSize) editor.scrollBy(0, 12)
}

function stopSectionDrag(event?: PointerEvent) {
  if (event && event.pointerId !== sectionDragPointerId) return
  const moved = draggedSectionMoved
  const droppedSectionId = draggedSectionId.value
  draggedSectionId.value = null
  dragOverSectionId.value = null
  draggedSectionMoved = false
  sectionDragPointerId = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', handleSectionDrag)
  window.removeEventListener('pointerup', stopSectionDrag)
  window.removeEventListener('pointercancel', stopSectionDrag)
  finishSectionDragGhost(droppedSectionId)
  if (moved) showStatus('栏目顺序已调整')
}

function finishSectionDragGhost(sectionId: string | null) {
  const ghost = sectionDragGhost
  if (!ghost) return
  sectionDragGhost = null
  const destination = sectionId
    ? resumeEditor.value?.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(sectionId)}"]`)?.getBoundingClientRect()
    : null
  ghost.style.transition = 'transform 140ms cubic-bezier(.2, .8, .2, 1), opacity 120ms ease'
  ghost.style.opacity = '0'
  if (destination) {
    ghost.style.transform = `translate3d(${destination.left}px, ${destination.top}px, 0) rotate(0) scale(.985)`
  }
  window.setTimeout(() => ghost.remove(), 150)
}

function reorderSectionWithKeyboard(event: KeyboardEvent, sectionId: string) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()
  const index = resume.content.sections.findIndex(section => section.id === sectionId)
  const offset = event.key === 'ArrowUp' ? -1 : 1
  if (index < 0 || index + offset < 0 || index + offset >= resume.content.sections.length) return
  moveSection(index, offset)
  showStatus(`“${resume.content.sections[index + offset]?.title || '栏目'}”已${offset < 0 ? '上移' : '下移'}`)
}

function toggleSection(id: string) {
  collapsedSections[id] = !isSectionCollapsed(id)
}

function isSectionCollapsed(id: string) {
  return collapsedSections[id] ?? true
}

async function addSectionItem(index: number) {
  const section = resume.content.sections[index]
  if (!section) return
  const item = createEmptySectionItem()
  section.items.push(item)
  collapsedSections[section.id] = false
  await nextTick()
  const entry = Array.from(workspaceBody.value?.querySelectorAll<HTMLElement>('[data-item-id]') || [])
    .find(element => element.dataset.itemId === item.id)
  entry?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  entry?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus({ preventScroll: true })
}

function requestEntryDelete(sectionIndex: number, itemIndex: number) {
  const section = resume.content.sections[sectionIndex]
  const item = section?.items[itemIndex]
  if (!section || !item) return
  const kind = section.type === 'experience' ? '项目' : '条目'
  const preferredName = section.type === 'experience' ? item.intro || item.heading : item.heading || item.intro
  const name = preferredName.split(/\r?\n/)[0]?.trim()
  pendingEntryDelete.value = {
    sectionId: section.id,
    itemId: item.id,
    kind,
    label: name ? `${kind} ${itemIndex + 1} · ${name.slice(0, 28)}` : `${kind} ${itemIndex + 1}`,
    description: section.type === 'experience' && section.items.length === 1
      ? '的项目内容将被清空，公司信息与共用技术栈会保留。'
      : '及其中填写的内容将被删除，此操作无法撤销。'
  }
  nextTick(() => entryDeleteDialog.value?.showModal())
}

function closeEntryDeleteDialog() {
  entryDeleteDialog.value?.close()
  pendingEntryDelete.value = null
}

function confirmEntryDelete() {
  const pending = pendingEntryDelete.value
  if (!pending) return
  const section = resume.content.sections.find(candidate => candidate.id === pending.sectionId)
  const itemIndex = section?.items.findIndex(item => item.id === pending.itemId) ?? -1
  if (!section || itemIndex < 0) {
    closeEntryDeleteDialog()
    return
  }

  if (section.type !== 'experience') {
    section.items.splice(itemIndex, 1)
    closeEntryDeleteDialog()
    showStatus('条目已删除')
    return
  }

  const item = section.items[itemIndex]
  if (!item) {
    closeEntryDeleteDialog()
    return
  }
  if (section.items.length === 1) {
    item.intro = ''
    item.secondary = ''
    item.bullets = ''
    item.projectRole = ''
    closeEntryDeleteDialog()
    showStatus('最后一个项目的内容已清空')
    return
  }

  const [removed] = section.items.splice(itemIndex, 1)
  if (itemIndex === 0 && removed && section.items[0]) {
    section.items[0].heading = removed.heading
    section.items[0].tag = removed.tag
    section.items[0].range = removed.range
    section.items[0].badge = removed.badge
    section.items[0].stack = removed.stack
  }
  closeEntryDeleteDialog()
  showStatus('项目已删除')
}

function changeZoom(delta: number) {
  zoomMode.value = 'manual'
  previewZoom.value = Math.min(maxZoom, Math.max(minZoom, previewZoom.value + delta))
}

function fitPreview() {
  zoomMode.value = 'fit'
  const container = workspaceBody.value?.querySelector<HTMLElement>('.preview-scroll')
  if (!container?.clientWidth || !previewDocument.value?.offsetWidth) return
  const style = getComputedStyle(container)
  const available = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
  previewZoom.value = Math.max(minZoom, Math.min(100, Math.floor(available / previewDocument.value.offsetWidth * 100)))
}

function setEditorWidth(clientX: number) {
  const container = workspaceBody.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const minEditorWidth = 360
  const minPreviewWidth = 360
  const dividerWidth = 8
  const nextWidth = Math.min(
    rect.width - minPreviewWidth - dividerWidth,
    Math.max(minEditorWidth, clientX - rect.left)
  )
  editorWidth.value = `${nextWidth}px`
}

function handleResize(event: PointerEvent) {
  if (resizing.value) setEditorWidth(event.clientX)
}

function stopResize() {
  if (!resizing.value) return
  resizing.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('pointermove', handleResize)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
}

function startResize(event: PointerEvent) {
  if (window.matchMedia('(max-width: 760px)').matches) return
  event.preventDefault()
  resizing.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', handleResize)
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
}

function resizeWithKeyboard(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const editor = workspaceBody.value?.querySelector<HTMLElement>('.resume-editor')
  if (!editor) return
  const delta = event.key === 'ArrowLeft' ? -24 : 24
  setEditorWidth(editor.getBoundingClientRect().right + delta)
}

function updatePageCount() {
  const paper = previewDocument.value?.querySelector<HTMLElement>('.resume-paper')
  if (!paper?.offsetWidth) return
  const pixelsPerMillimeter = paper.offsetWidth / 210
  const previewVerticalPadding = resume.layout.verticalMargin * 2 * pixelsPerMillimeter
  const contentHeight = Math.max(0, paper.scrollHeight - previewVerticalPadding)
  const firstPageHeight = Math.max(1, (297 - resume.layout.verticalMargin * 2) * pixelsPerMillimeter)
  const continuationPageHeight = Math.max(1, (297 - resume.layout.verticalMargin * 2 - continuationTopExtra) * pixelsPerMillimeter)
  pageCount.value = contentHeight <= firstPageHeight
    ? 1
    : 1 + Math.ceil((contentHeight - firstPageHeight - 1) / continuationPageHeight)
}

function pageBreakTop(page: number) {
  const firstPageHeight = 297 - resume.layout.verticalMargin * 2
  const continuationPageHeight = firstPageHeight - continuationTopExtra
  return `${resume.layout.verticalMargin + firstPageHeight + Math.max(0, page - 1) * continuationPageHeight}mm`
}

function observePreviewPages() {
  const paper = previewDocument.value?.querySelector<HTMLElement>('.resume-paper')
  if (!paper) return
  previewResizeObserver?.disconnect()
  previewResizeObserver = new ResizeObserver(updatePageCount)
  previewResizeObserver.observe(paper)
  updatePageCount()
}

function handleAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    showStatus('图片不能超过 10MB', true)
    input.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => { resume.content.basic.avatar = String(reader.result || '') }
  reader.readAsDataURL(file)
}

function safeFileName(value: string) {
  return Array.from(value.trim() || 'resume', (character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return '<>:"/\\|?*'.includes(character) || codePoint < 32 ? '_' : character
  }).join('')
}

function exportResumeJson() {
  const json = JSON.stringify(createPortableResume(resume), null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeFileName(resume.title)}.resume.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  showStatus('可编辑 JSON 已导出（不含证件照）')
}

async function importResumeJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    if (file.size > PORTABLE_RESUME_MAX_BYTES) {
      throw new Error('文件不能超过 2MB')
    }

    let value: unknown
    try {
      value = JSON.parse(await file.text())
    } catch {
      throw new Error('文件不是有效的 JSON')
    }

    const importedResume = parsePortableResume(value, resume.content.basic.avatar)
    if (!await confirmReplace()) return
    currentResumeId.value = null
    replaceResume(importedResume)
    persistDraft()
    Object.keys(collapsedSections).forEach(id => Reflect.deleteProperty(collapsedSections, id))
    showStatus('JSON 已导入，证件照已保留；确认后可保存')
  } catch (error) {
    showStatus(`导入失败：${error instanceof Error ? error.message : '文件格式错误'}`, true)
  } finally {
    input.value = ''
  }
}

async function exportPdf() {
  if (!user.value) {
    await loginWithDraft()
    return
  }
  if (exporting.value) return

  exporting.value = true
  showStatus('正在生成 PDF…')
  try {
    const pdf = await $fetch<Blob>('/api/resumes/export', {
      method: 'POST',
      body: {
        title: resume.title,
        content: resume.content,
        layout: resume.layout
      },
      responseType: 'blob'
    })
    const url = URL.createObjectURL(pdf)
    const anchor = document.createElement('a')
    const fileName = safeFileName(resume.title)
    anchor.href = url
    anchor.download = `${fileName}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
    showStatus('PDF 已生成')
  } catch {
    showStatus('PDF 生成失败，请稍后重试', true)
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  try {
    // Carry the guest draft through login without attaching it to another user's saved document.
    const transferGuest = !!user.value && sessionStorage.getItem('resume-transfer-guest') === '1'
    const stored = localStorage.getItem(transferGuest ? 'resume-draft-v1:guest' : draftKey.value)
    if (stored) {
      const draft = JSON.parse(stored)
      if (draft.document?.content?.basic && Array.isArray(draft.document.content.sections)) {
        replaceResume(draft.document)
        currentResumeId.value = !transferGuest && Number.isSafeInteger(draft.id) && draft.id > 0 ? draft.id : null
        savedSnapshot.value = typeof draft.savedSnapshot === 'string' ? draft.savedSnapshot : savedSnapshot.value
        draftStored.value = true
        if (transferGuest) {
          localStorage.setItem(draftKey.value, JSON.stringify({ ...draft, id: null }))
          sessionStorage.removeItem('resume-transfer-guest')
        }
        showStatus('已恢复上次编辑的本机草稿')
      }
    }
  } catch {
    showStatus('无法恢复本机草稿，可以导入此前备份的 JSON', true)
  }
  nextTick(() => {
    draftReady.value = true
    observePreviewPages()
    viewportObserver = new ResizeObserver(() => { if (zoomMode.value === 'fit') fitPreview() })
    const container = workspaceBody.value?.querySelector('.preview-scroll')
    if (container) viewportObserver.observe(container)
    fitPreview()
  })
  window.addEventListener('beforeunload', protectUnload)
  loadLibrary()
})
watch(() => resume.layout.verticalMargin, () => nextTick(updatePageCount))
watch(() => resume.layout.template, () => nextTick(observePreviewPages))
watch(mobileView, async () => {
  await nextTick()
  workspaceBody.value?.scrollIntoView({ block: 'start' })
})
onBeforeUnmount(() => {
  persistDraft()
  clearTimeout(draftTimer)
  clearTimeout(messageTimer)
  window.removeEventListener('beforeunload', protectUnload)
  resolveDiscard(false)
  closeEntryDeleteDialog()
  viewportObserver?.disconnect()
  previewResizeObserver?.disconnect()
  stopSectionDrag()
  stopResize()
})

useSeoMeta({
  title: '简历编辑器',
  description: '创建、编辑并保存中文技术简历。'
})
</script>

<style scoped>
.resume-workspace { display: flex; flex-direction: column; height: 100dvh; min-height: 0; background: #edf0f5; color: #273142; }
.workspace-bar {
  flex: 0 0 auto; position: sticky; z-index: 20; top: 0; display: grid; min-height: 62px; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 16px; padding: 9px 22px; border-bottom: 1px solid #dfe4ec; background: rgb(255 255 255 / 96%);
  box-shadow: 0 3px 14px rgb(32 42 62 / 5%); backdrop-filter: blur(12px);
}
.document-name { display: flex; min-width: 0; align-items: center; gap: 9px; }
.back-to-tools {
  display: inline-flex; height: 34px; flex: 0 0 auto; align-items: center; gap: 5px; padding: 0 9px;
  border: 1px solid #dce2e9; border-radius: 8px; background: #fff; color: #5f6b7c; font-size: 10px; font-weight: 750;
  transition: border-color .16s ease, background-color .16s ease, color .16s ease;
}
.back-to-tools:hover, .back-to-tools:focus-visible { border-color: #9bc7eb; outline: 0; background: #f2f8fd; color: #0874d1; }
.back-to-tools svg { width: 14px; }
.document-name > svg { flex: 0 0 18px; width: 18px; color: #0874d1; }
.document-details { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 3px; }
.document-name input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #1b2431; font-size: 14px; font-weight: 750; }
.library-control { display: flex; align-items: center; gap: 6px; }
.library-control label { display: flex; align-items: center; gap: 7px; }
.library-control label > span { color: #778191; font-size: 10px; font-weight: 700; }
.library-control select { width: 180px; height: 34px; padding: 0 27px 0 9px; border: 1px solid #dce1e8; border-radius: 8px; outline: 0; background: #fff; color: #455061; font-size: 10px; }
.library-control button { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #dce1e8; border-radius: 8px; background: #fff; color: #667183; cursor: pointer; }
.library-control button svg { width: 14px; }
.library-control button.danger { color: #bc5263; }
.login-tip { cursor: pointer; padding: 7px 11px; border-radius: 8px; background: #edf6ff; color: #0874d1; font-size: 10px; font-weight: 700; }
.workspace-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.json-file-input { display: none; }
.workspace-actions button { display: inline-flex; height: 35px; align-items: center; gap: 6px; padding: 0 11px; border-radius: 8px; cursor: pointer; font-size: 10px; font-weight: 750; }
.workspace-actions button svg { width: 14px; }
.json-button { border: 1px solid #cbd4df; background: #fff; color: #485466; }
.json-button:hover { border-color: #9bc7eb; background: #f2f8fd; color: #0874d1; }
.save-button { border: 1px solid #cbd4df; background: #fff; color: #485466; }
.save-button:disabled { cursor: wait; opacity: .65; }
.print-button { border: 1px solid #0874d1; background: #0874d1; box-shadow: 0 5px 12px rgb(8 116 209 / 18%); color: #fff; }
.print-button:disabled { cursor: wait; opacity: .7; }
.spin { animation: spin .8s linear infinite; }
.workspace-body { display: grid; flex: 1; min-height: 0; grid-template-columns: minmax(360px, var(--editor-width)) 8px minmax(360px, 1fr); }
.resume-editor { min-width: 0; overflow-y: auto; scrollbar-gutter: stable; padding: 26px 28px 60px; background: #f9fafc; }
.editor-heading { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
.editor-heading span { color: #0874d1; font: 750 8px "JetBrains Mono", monospace; letter-spacing: .14em; }
.editor-heading h1 { margin: 4px 0 0; color: #192230; font-size: 22px; }
.editor-heading small { color: #949ca8; font-size: 9px; }
.editor-card { margin-bottom: 15px; overflow: hidden; border: 1px solid #dfe4eb; border-radius: 12px; background: #fff; box-shadow: 0 3px 9px rgb(34 45 67 / 3%); }
.editor-card > header { display: flex; min-height: 46px; align-items: center; justify-content: space-between; gap: 12px; padding: 7px 12px; border-bottom: 1px solid #e8ebf0; background: #fbfcfd; }
.basic-card > header span { color: #263140; font-size: 12px; font-weight: 800; }
.basic-card { padding-bottom: 16px; }
.basic-card:has(> header .collapsed) { padding-bottom: 0; }
.layout-card > header span { color: #263140; font-size: 12px; font-weight: 800; }
.layout-card > header small { color: #98a0ac; font-size: 8px; }
.layout-card-meta { display: inline-flex; align-items: center; gap: 8px; }
.template-control { display: inline-flex; align-items: center; gap: 5px; }
.template-control > span { color: #7f8997 !important; font-size: 8px !important; font-weight: 700 !important; }
.template-control select {
  height: 28px; padding: 0 24px 0 8px; border: 1px solid #dce2e9; border-radius: 7px; outline: 0;
  background: #fff; color: #455061; font-size: 9px; font-weight: 700; cursor: pointer;
}
.template-control select:focus { border-color: #74afe1; box-shadow: 0 0 0 3px rgb(8 116 209 / 8%); }
.collapse-button {
  display: grid !important; width: 28px; height: 28px; flex: 0 0 28px; place-items: center; padding: 0 !important;
  border: 1px solid #dce2e9; border-radius: 7px; background: #fff; color: #778292; cursor: pointer;
}
.collapse-button svg { width: 13px !important; transition: transform .2s ease; }
.collapse-button svg.collapsed { transform: rotate(-90deg); }
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
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px 12px; padding: 0 16px; }
.form-grid :deep(.wide) { grid-column: 1 / -1; }
.section-name { display: flex; min-width: 0; flex: 1; align-items: center; gap: 7px; }
.section-drag-handle {
  display: grid; width: 26px; height: 30px; flex: 0 0 26px; place-items: center; padding: 0; border: 0;
  border-radius: 6px; background: transparent; color: #9aa6b5; cursor: grab; touch-action: none;
}
.section-drag-handle:hover, .section-drag-handle:focus-visible { outline: 0; background: #edf5fc; color: #0874d1; }
.section-drag-handle:active { cursor: grabbing; }
.section-drag-handle svg { width: 14px; pointer-events: none; }
.section-card { transition: border-color .16s ease, box-shadow .16s ease, opacity .16s ease; }
.section-card.is-dragging { border-color: #9bc7eb; box-shadow: none; opacity: .28; }
.section-card.is-drag-over:not(.is-dragging) { border-color: #9bc7eb; }
:global(.section-drag-ghost) {
  position: fixed; z-index: 200; top: 0; left: 0; max-width: calc(100vw - 16px); margin: 0 !important;
  overflow: hidden; border-color: #74afe1 !important; background: #fff; box-shadow: 0 18px 42px rgb(31 55 84 / 24%) !important;
  opacity: 0; pointer-events: none; will-change: transform;
}
:global(.section-drag-ghost.is-visible) { opacity: .97; }
:global(.section-drag-ghost > header) { border-bottom: 0 !important; }
.section-title-editor {
  display: inline-flex; min-width: 0; max-width: 190px; align-items: center; gap: 5px; padding: 4px 7px;
  border: 1px solid #dce5ee; border-radius: 6px; background: #fff; cursor: text;
  transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease;
}
.section-title-editor:hover { border-color: #a9cdeb; background: #f8fbfe; }
.section-title-editor:focus-within { border-color: #74afe1; background: #fff; box-shadow: 0 0 0 3px rgb(8 116 209 / 8%); }
.section-title-editor > svg { width: 11px; height: 11px; flex: 0 0 11px; color: #8292a5; }
.section-title-editor:hover > svg, .section-title-editor:focus-within > svg { color: #0874d1; }
.section-title-editor input {
  min-width: 4em; max-width: 155px; padding: 0; border: 0; outline: 0; background: transparent;
  color: #0874d1; font-size: 12px; font-weight: 800;
}
.section-name small {
  flex: 0 0 auto; padding: 4px 7px; border-radius: 5px; background: #eaf4fc; color: #3477ae;
  font-size: 10px; font-weight: 750; white-space: nowrap;
}
.card-actions { display: flex; align-items: center; gap: 5px; }
.card-actions button { display: inline-flex; height: 28px; align-items: center; gap: 4px; padding: 0 7px; border: 1px solid #dce2e9; border-radius: 7px; background: #fff; color: #5f6b7c; cursor: pointer; font-size: 9px; font-weight: 700; }
.card-actions button svg { width: 11px; }
.card-actions button:disabled { cursor: not-allowed; opacity: .35; }
.card-actions button.danger { width: 28px; padding: 0; justify-content: center; color: #bd5968; }
.entry-editor {
  margin: 12px; padding: 0 0 14px; overflow: hidden; border: 1px solid #e0e6ed; border-radius: 10px;
  background: #fbfcfe; box-shadow: 0 2px 7px rgb(35 48 68 / 3%);
}
.entry-editor + .entry-editor { margin-top: 14px; }
.experience-company-editor { padding: 13px 0 16px; border-bottom: 1px solid #dfe4eb; background: #f8fbfe; }
.experience-company-editor .entry-label strong { color: #3477ae; }
.experience-project-editor { background: #fff; }
.entry-editor > .entry-label {
  min-height: 42px; margin-bottom: 12px; padding: 8px 12px 8px 14px; border-bottom: 1px solid #e4e9ef; background: #f5f8fb;
}
.entry-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; padding: 0 16px; }
.entry-label strong { color: #697587; font-size: 10px; }
.entry-label button { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid #fecdd3; border-radius: 7px; background: #fff; color: #c05869; cursor: pointer; }
.entry-label button:hover, .entry-label button:focus-visible { outline: 0; border-color: #fda4af; background: #fff1f3; }
.entry-label svg { width: 11px; }
.empty-section { padding: 24px; color: #9aa3af; font-size: 10px; text-align: center; }
.add-section-wrap { position: relative; }
.add-section { display: flex; width: 100%; align-items: center; justify-content: center; gap: 10px; padding: 16px; border: 1px dashed #bfcbd8; border-radius: 11px; background: #f7fbff; color: #0874d1; cursor: pointer; }
.add-section > svg { width: 19px; }
.add-section > svg:last-child { width: 14px; margin-left: 3px; transition: transform .18s ease; }
.add-section > svg:last-child.open { transform: rotate(180deg); }
.add-section > span { display: flex; flex-direction: column; text-align: left; }
.add-section strong { font-size: 11px; }
.add-section small { margin-top: 2px; color: #8c99a8; font-size: 8px; }
.section-picker {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 9px; padding: 10px;
  border: 1px solid #dce3eb; border-radius: 12px; background: #fff; box-shadow: 0 10px 28px rgb(34 48 70 / 9%);
}
.section-picker > button {
  display: flex; min-width: 0; align-items: center; gap: 9px; padding: 10px; border: 1px solid #e3e7ed; border-radius: 9px;
  background: #fbfcfd; color: #455061; cursor: pointer; text-align: left; transition: border-color .16s, background .16s, transform .16s;
}
.section-picker > button:hover { border-color: #9bc7eb; background: #f2f8fd; transform: translateY(-1px); }
.section-picker > button > span:last-child { display: flex; min-width: 0; flex-direction: column; }
.section-picker strong { color: #2d3949; font-size: 10px; }
.section-picker small { margin-top: 2px; overflow: hidden; color: #929ca9; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.section-type-icon { display: grid; width: 28px; height: 28px; flex: 0 0 28px; place-items: center; border-radius: 7px; background: #eaf4fc; color: #0874d1; }
.section-type-icon svg { width: 14px; }
.workspace-divider {
  position: relative; z-index: 3; display: flex; height: 100%; align-items: center; justify-content: center;
  border-inline: 1px solid #d8dde5; background: #eef1f5; cursor: col-resize; touch-action: none;
  transition: background .16s ease, border-color .16s ease;
}
.workspace-divider:hover, .workspace-divider:focus-visible, .workspace-divider.resizing { border-color: #a9cce9; outline: 0; background: #dcecf9; }
.workspace-divider > span {
  display: grid; width: 18px; height: 38px; place-items: center; border: 1px solid #cfd6df; border-radius: 6px;
  background: #fff; box-shadow: 0 2px 7px rgb(37 49 69 / 8%); color: #8b95a4; pointer-events: none;
}
.workspace-divider svg { width: 12px; }
.preview-area { display: flex; min-width: 0; overflow: hidden; flex-direction: column; background: #e9ecf2; }
.preview-caption { display: grid; height: 45px; flex: 0 0 45px; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; padding: 0 20px; border-bottom: 1px solid #dadee6; background: #f3f5f8; }
.preview-caption span { color: #4f5968; font-size: 10px; font-weight: 750; }
.preview-caption small { white-space: nowrap; justify-self: end; color: #8b94a2; font-size: 8px; }
.preview-zoom { display: inline-flex; overflow: hidden; border: 1px solid #d6dce5; border-radius: 7px; background: #fff; box-shadow: 0 2px 6px rgb(36 47 67 / 5%); }
.preview-zoom button { display: grid; height: 28px; min-width: 29px; place-items: center; padding: 0; border: 0; background: #fff; color: #657183; cursor: pointer; font-size: 9px; font-weight: 750; }
.preview-zoom button + button { border-left: 1px solid #e2e6ec; }
.preview-zoom button:hover:not(:disabled) { background: #f0f6fb; color: #0874d1; }
.preview-zoom button:disabled { cursor: not-allowed; opacity: .35; }
.preview-zoom button svg { width: 12px; }
.preview-zoom .zoom-value { min-width: 48px; font-family: "JetBrains Mono", monospace; }
.preview-scroll { flex: 1; overflow: auto; scrollbar-gutter: stable; padding: 28px; }
.preview-document { position: relative; width: 210mm; margin: 0 auto; transform-origin: top center; }
.page-break-marker {
  position: absolute; z-index: 5; right: 0; left: 0; height: 0; border-top: 1px dashed #e16b78;
  color: #b84e5d; pointer-events: none;
}
.page-break-marker::before {
  position: absolute; right: 0; left: 0; height: 9px; background: linear-gradient(to bottom, rgb(225 107 120 / 8%), transparent);
  content: "";
}
.page-break-marker span {
  position: absolute; top: -10px; right: 6px; padding: 2px 6px; border: 1px solid #efc8ce; border-radius: 8px;
  background: #fff7f8; color: #b84e5d; font: 700 8px "JetBrains Mono", monospace;
}

@media (max-width: 1100px) {
  .library-control label > span { display: none; }
  .back-to-tools { width: 34px; justify-content: center; padding: 0; }
  .back-to-tools span { display: none; }
  .resume-editor { padding-inline: 18px; }
  .workspace-actions .json-button { width: 35px; justify-content: center; padding: 0; overflow: hidden; font-size: 0; }
  .card-actions > button:not(.danger, .collapse-button) { width: 28px; padding: 0; overflow: hidden; font-size: 0; justify-content: center; }
}
@media (max-width: 760px) {
  .resume-workspace { height: auto; min-height: 100dvh; }
  .workspace-bar { position: relative; grid-template-columns: 1fr auto; padding: 9px 12px; }
  .library-control { grid-row: 2; grid-column: 1 / -1; justify-content: center; }
  .library-control select { width: 230px; }
  .workspace-actions { grid-column: 1 / -1; justify-content: flex-end; }
  .workspace-actions .save-button { font-size: 12px; }
  .workspace-body { height: auto; min-height: 0; grid-template-columns: 1fr; scroll-margin-top: 56px; }
  .workspace-divider { display: none; }
  .resume-editor { overflow: visible; padding: 22px 13px 40px; }
  .preview-area { min-height: 650px; }
  .preview-scroll { padding: 18px 8px; }
}
@media (max-width: 430px) {
  .workspace-actions .print-button { padding: 0 9px; font-size: 12px; }
  .form-grid { grid-template-columns: 1fr; }
  .form-grid :deep(.wide) { grid-column: auto; }
  .layout-settings { grid-template-columns: 1fr; }
  .section-picker { grid-template-columns: 1fr; }
}
.mobile-view-tabs { display: none; }
@media (max-width: 760px) {
  .mobile-view-tabs { position: sticky; top: 0; z-index: 10; display: flex; gap: 6px; padding: 8px 12px; background: #f9fafc; border-bottom: 1px solid #dfe4eb; }
  .mobile-view-tabs button { flex: 1; min-height: 40px; border-radius: 8px; color: #64748b; font-size: 14px; cursor: pointer; }
  .mobile-view-tabs button[aria-pressed="true"] { background: #e5f2ff; color: #0874d1; font-weight: 700; }
  .workspace-body[data-view="editor"] .preview-area, .workspace-body[data-view="preview"] .resume-editor { display: none; }
  .preview-caption { gap: 6px; padding-inline: 12px; }
}
.draft-state { overflow: hidden; color: #64748b; font-size: 11px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.status-toast { position: fixed; z-index: 100; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; width: max-content; max-width: calc(100vw - 32px); padding: 14px 18px; border: 1px solid #b9decd; border-radius: 10px; background: #f0fdf4; color: #166534; box-shadow: 0 8px 28px #172b4d26; font-size: 14px; }
.status-toast.error { background: #fff1f2; color: #9f1239; border-color: #fecdd3; }
.status-toast button { flex: 0 0 28px; width: 28px; height: 28px; cursor: pointer; }
.status-toast svg { width: 18px; }
.discard-dialog { margin: auto; width: min(460px, calc(100vw - 32px)); padding: 24px; border: 1px solid #dfe4eb; border-radius: 14px; background: white; color: #273142; }
.discard-dialog::backdrop { background: #0f172a66; }
.discard-dialog h2 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
.dialog-error { color: #9f1239; margin-top: 12px; }
.discard-dialog p { font-size: 14px; line-height: 1.7; }
.discard-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.discard-actions button, .preview-options button { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; cursor: pointer; font-size: 12px; }
.discard-actions .primary { background: #0874d1; color: white; }
.discard-actions .danger-confirm { border-color: #e11d48; background: #e11d48; color: #fff; }
.discard-actions .danger-confirm:hover { background: #be123c; }
.discard-actions button:disabled { opacity: .6; cursor: wait; }
.entry-delete-dialog { text-align: center; }
.delete-dialog-icon { display: grid; width: 44px; height: 44px; margin: 0 auto 14px; place-items: center; border-radius: 50%; background: #fff1f2; color: #be123c; }
.delete-dialog-icon svg { width: 20px; }
.preview-options { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
.preview-options button { padding: 5px 7px; white-space: nowrap; }
.preview-options button[aria-pressed="true"] { background: #e5f2ff; color: #0874d1; border-color: #9bc7eb; }
@media print { .status-toast, .discard-dialog, .mobile-view-tabs { display: none !important; } }
@keyframes spin { to { transform: rotate(360deg); } }

@media print {
  :global(html), :global(body), :global(#__nuxt) { width: 210mm !important; min-width: 210mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .workspace-bar, .resume-editor, .workspace-divider, .preview-caption, .page-break-marker { display: none !important; }
  .resume-workspace, .workspace-body, .preview-area, .preview-scroll { display: block !important; width: 210mm !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; }
  .preview-document { width: 210mm !important; margin: 0 !important; zoom: 1 !important; }
  .preview-document :deep(.resume-paper) { min-height: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important; overflow: visible !important; box-shadow: none !important; }
}
</style>
