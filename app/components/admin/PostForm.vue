<template>
  <div class="admin-page">
    <div class="admin-page-header">
      <div class="admin-page-title">
        <span class="admin-page-title-icon">
          <UIcon name="i-lucide-file-pen-line" class="size-5" />
        </span>
        <div class="admin-page-title-text">
          <p>Markdown Editor</p>
          <h1>{{ mode === 'create' ? '新建文章' : '编辑文章' }}</h1>
        </div>
      </div>
      <div class="admin-page-actions">
        <UButton color="neutral" variant="outline" icon="i-lucide-arrow-left" to="/admin/posts">返回</UButton>
        <UButton color="neutral" variant="outline" icon="i-lucide-save" :loading="pending" @click="save('DRAFT')">保存草稿</UButton>
        <UButton icon="i-lucide-send" :loading="pending" @click="save('PUBLISHED')">发布文章</UButton>
      </div>
    </div>

    <div class="post-editor-layout">
      <section class="admin-panel post-settings-panel">
        <div class="post-panel-title">
          <span>
            <UIcon name="i-lucide-settings-2" class="size-4" />
          </span>
          <div>
            <h2>文章设置</h2>
            <p>标题、分类、封面和 SEO 信息</p>
          </div>
        </div>
        <div class="post-settings-form">
        <UFormField label="标题">
          <UInput v-model="form.title" placeholder="请输入文章标题" class="w-full" />
        </UFormField>
        <UFormField label="别名">
          <UInput v-model="form.slug" placeholder="留空时自动生成 8 位链接码" class="w-full" />
        </UFormField>
        <UFormField label="摘要">
          <div class="ai-summary-field">
            <UTextarea v-model="form.summary" :rows="4" class="w-full" />
            <div class="ai-summary-actions">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-sparkles"
                :loading="generatingSummary"
                :disabled="pending"
                @click="generateSummary"
              >
                AI 生成摘要
              </UButton>
              <span v-if="summaryGenerated" class="ai-summary-success">
                <UIcon name="i-lucide-check" class="size-4" />
                已填入摘要
              </span>
            </div>
          </div>
        </UFormField>
        <UFormField label="封面 URL">
          <div class="post-upload-row">
            <UInput v-model="form.cover" placeholder="/uploads/..." class="flex-1" />
            <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="uploadCover" />
            <UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="uploadingCover" @click="coverInputRef?.click()">上传</UButton>
            <UButton color="neutral" variant="outline" icon="i-lucide-images" @click="openGalleryPicker('cover')">图库</UButton>
            <span v-if="coverUploaded" class="inline-flex items-center gap-1 text-sm font-medium text-emerald-600"><UIcon name="i-lucide-check" class="size-4" />已上传</span>
            <span v-if="coverUploadError" class="inline-flex items-center gap-1 text-sm font-medium text-red-500"><UIcon name="i-lucide-alert-circle" class="size-4" />上传失败</span>
          </div>
          <div v-if="form.cover" class="cover-preview">
            <img :src="form.cover" :alt="form.title || '文章封面预览'" loading="lazy" />
            <div class="cover-preview-meta">
              <span>{{ form.cover }}</span>
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click="form.cover = ''">移除</UButton>
            </div>
          </div>
        </UFormField>
        <UFormField label="分类">
          <div class="taxonomy-field">
            <div class="taxonomy-field-main">
              <select v-model.number="form.categoryId" class="admin-select w-full">
                <option :value="null">无分类</option>
                <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </div>
            <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-folder-plus" @click="openCategoryCreator">新建</UButton>
          </div>
        </UFormField>
        <UFormField label="标签">
          <div class="taxonomy-field taxonomy-field-stacked">
            <div class="post-tag-picker" :class="{ 'is-empty': !tags.length }">
              <label v-for="item in tags" :key="item.id" class="admin-check-pill">
                <input v-model="form.tagIds" type="checkbox" :value="item.id" class="accent-slate-950" />
                {{ item.name }}
              </label>
              <p v-if="!tags.length" class="text-sm text-slate-500">暂无标签，可在这里直接新增。</p>
            </div>
            <UButton class="taxonomy-inline-action" color="neutral" variant="outline" size="sm" icon="i-lucide-tag" @click="openTagCreator">新建标签</UButton>
          </div>
        </UFormField>
        <UFormField label="SEO 标题">
          <div class="ai-summary-field">
            <UInput v-model="form.seoTitle" class="w-full" />
            <div class="ai-summary-actions">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-sparkles"
                :loading="generatingSeoMeta"
                :disabled="pending"
                @click="generateSeoMeta"
              >
                AI 生成 SEO
              </UButton>
              <span v-if="seoMetaGenerated" class="ai-summary-success">
                <UIcon name="i-lucide-check" class="size-4" />
                已填入 SEO
              </span>
            </div>
          </div>
        </UFormField>
        <UFormField label="SEO 描述">
          <UTextarea v-model="form.seoDescription" :rows="3" class="w-full" />
        </UFormField>
        <UFormField label="SEO 检查助手">
          <div class="seo-check-field">
            <div class="writing-assistant-actions">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-search-check"
                :loading="checkingSeo"
                :disabled="pending"
                @click="runSeoCheck"
              >
                检查 SEO
              </UButton>
              <span v-if="seoCheckGenerated" class="ai-summary-success">
                <UIcon name="i-lucide-check" class="size-4" />
                已完成检查
              </span>
            </div>

            <div v-if="seoCheckResult" class="seo-check-result">
              <div class="writing-score seo-score">
                <span>SEO 分数</span>
                <strong>{{ seoCheckResult.score }}</strong>
              </div>

              <section v-if="seoCheckProblems.length">
                <div class="writing-section-title">
                  <h3>待优化项</h3>
                </div>
                <div class="seo-issue-list">
                  <article v-for="issue in seoCheckProblems" :key="issue.key" :class="`is-${issue.type}`">
                    <strong>{{ issue.title }}</strong>
                    <p>{{ issue.description }}</p>
                  </article>
                </div>
              </section>

              <section>
                <div class="writing-section-title">
                  <h3>AI 修复建议</h3>
                </div>
                <ul>
                  <li v-for="item in seoCheckResult.advice.fixes" :key="item">{{ item }}</li>
                </ul>
              </section>

              <section v-if="seoCheckResult.advice.keywordSuggestions.length">
                <div class="writing-section-title">
                  <h3>关键词建议</h3>
                </div>
                <div class="seo-keyword-list">
                  <span v-for="item in seoCheckResult.advice.keywordSuggestions" :key="item">{{ item }}</span>
                </div>
              </section>

              <section>
                <div class="writing-section-title">
                  <h3>可应用内容</h3>
                </div>
                <div class="writing-apply-list">
                  <button type="button" @click="applySeoCheckMeta">
                    应用 SEO 标题和描述
                  </button>
                </div>
              </section>
            </div>
            <p v-else class="post-relations-hint">检查当前标题、摘要、SEO 字段、正文结构、图片和链接。</p>
          </div>
        </UFormField>
        <UFormField label="AI 写作助手">
          <div class="writing-assistant-field">
            <div class="writing-assistant-actions">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-wand-sparkles"
                :loading="generatingWritingAssistant"
                :disabled="pending"
                @click="generateWritingAssistantResult"
              >
                分析当前文章
              </UButton>
              <span v-if="writingAssistantGenerated" class="ai-summary-success">
                <UIcon name="i-lucide-check" class="size-4" />
                已完成分析
              </span>
            </div>

            <div v-if="writingAssistantResult" class="writing-assistant-result">
              <div class="writing-score">
                <span>完成度</span>
                <strong>{{ writingAssistantResult.completionScore }}</strong>
              </div>

              <section>
                <div class="writing-section-title">
                  <h3>内容建议</h3>
                </div>
                <ul>
                  <li v-for="item in writingAssistantResult.missingPoints" :key="item">{{ item }}</li>
                  <li v-for="item in writingAssistantResult.writingAdvice" :key="item">{{ item }}</li>
                </ul>
              </section>

              <section>
                <div class="writing-section-title">
                  <h3>可应用内容</h3>
                </div>
                <div class="writing-apply-list">
                  <button type="button" @click="applyWritingSummary">
                    应用摘要
                  </button>
                  <button type="button" @click="applyWritingSeo">
                    应用 SEO
                  </button>
                  <button v-if="writingAssistantResult.suggestedCategoryIds.length" type="button" @click="applyWritingCategory">
                    应用分类
                  </button>
                  <button v-if="writingAssistantResult.suggestedTagIds.length" type="button" @click="applyWritingTags">
                    应用标签
                  </button>
                </div>
              </section>

              <section v-if="writingAssistantResult.titleSuggestions.length">
                <div class="writing-section-title">
                  <h3>标题建议</h3>
                </div>
                <div class="writing-title-list">
                  <button v-for="item in writingAssistantResult.titleSuggestions" :key="item" type="button" @click="applyWritingTitle(item)">
                    {{ item }}
                  </button>
                </div>
              </section>
            </div>
            <p v-else class="post-relations-hint">分析不会自动覆盖表单，确认后再应用到文章。</p>
          </div>
        </UFormField>
        <UFormField v-if="mode === 'edit'" label="继续阅读">
          <div class="post-relations-field">
            <div class="post-relations-actions">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-sparkles"
                :loading="generatingRelations"
                :disabled="pending"
                @click="generateRelations"
              >
                AI 推荐关联文章
              </UButton>
              <span v-if="relationsGenerated" class="ai-summary-success">
                <UIcon name="i-lucide-check" class="size-4" />
                已生成推荐
              </span>
            </div>
            <p class="post-relations-hint">推荐结果不会自动发布，保存文章后才会写入前台。</p>
            <div v-if="relationItems.length" class="post-relations-list">
              <article v-for="(item, index) in relationItems" :key="item.relatedPostId" class="post-relation-item">
                <div class="post-relation-head">
                  <strong>{{ item.title }}</strong>
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-x" @click="removeRelation(index)" />
                </div>
                <select v-model="item.type" class="admin-select post-relation-type">
                  <option v-for="option in relationTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <UTextarea v-model="item.reason" :rows="2" class="w-full" />
                <div class="post-relation-controls">
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-arrow-up" :disabled="index === 0" @click="moveRelation(index, -1)">上移</UButton>
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-arrow-down" :disabled="index === relationItems.length - 1" @click="moveRelation(index, 1)">下移</UButton>
                </div>
              </article>
            </div>
            <div v-else class="post-relations-empty">
              暂无关联文章，可用 AI 生成后人工确认。
            </div>
          </div>
        </UFormField>
        </div>
      </section>

      <section class="admin-panel post-editor-panel">
        <div class="post-panel-title post-editor-title">
          <div class="post-panel-title-main">
            <span>
              <UIcon name="i-lucide-file-pen-line" class="size-4" />
            </span>
            <div>
              <h2>Markdown 工作区</h2>
              <p>编辑正文内容，支持图片上传</p>
            </div>
          </div>
          <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-images" @click="openGalleryPicker('content')">插入图库图片</UButton>
        </div>
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

    <UModal v-model:open="galleryPickerOpen" :title="galleryPickerTitle" :description="galleryPickerDescription" :ui="{ content: 'max-w-5xl' }">
      <template #body>
        <div class="gallery-picker">
          <div class="gallery-picker-toolbar">
            <UInput v-model="gallerySearchQuery" icon="i-lucide-search" placeholder="搜索文件名或路径..." size="sm" class="gallery-picker-search" />
            <div class="gallery-picker-filters" aria-label="图库分类">
              <button
                v-for="option in galleryCollectionOptions"
                :key="option.value"
                type="button"
                :class="{ 'is-active': galleryCollectionFilter === option.value }"
                @click="galleryCollectionFilter = option.value"
              >
                <UIcon :name="option.icon" class="size-4" />
                <span>{{ option.label }}</span>
              </button>
            </div>
            <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-refresh-cw" :loading="galleryPending" @click="refreshGallery()">刷新</UButton>
          </div>

          <div v-if="galleryPending" class="gallery-picker-state">
            <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
            <span>正在加载图库...</span>
          </div>

          <div v-else-if="filteredGalleryImages.length" class="gallery-picker-grid">
            <button v-for="image in filteredGalleryImages" :key="image.path" type="button" class="gallery-picker-card" @click="selectGalleryImage(image)">
              <span class="gallery-picker-thumb" :class="{ 'is-meme': image.collection === 'memes' }">
                <img :src="image.url" :alt="image.name" loading="lazy" />
              </span>
              <span class="gallery-picker-info">
                <strong :title="image.name">{{ image.name }}</strong>
                <small>{{ image.collection === 'memes' ? '表情包' : '普通图片' }} · {{ formatSize(image.size) }} · {{ formatDate(image.updatedAt) }}</small>
              </span>
            </button>
          </div>

          <div v-else class="gallery-picker-state">
            <UIcon name="i-lucide-image-off" class="size-8" />
            <strong>{{ gallerySearchQuery ? '没有匹配的图片' : '图库暂无图片' }}</strong>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="categoryCreatorOpen" title="新建分类" description="创建后会自动选中为当前文章分类。">
      <template #body>
        <form class="taxonomy-create-form" @submit.prevent="createCategory">
          <UFormField label="分类名称" required>
            <UInput v-model="newCategory.name" placeholder="例如：技术笔记" autofocus class="w-full" />
          </UFormField>
          <UFormField label="别名">
            <UInput v-model="newCategory.slug" placeholder="留空自动生成" class="w-full" />
          </UFormField>
          <UFormField label="图标">
            <div class="taxonomy-icon-grid" role="radiogroup" aria-label="分类图标">
              <button
                v-for="option in categoryIconOptions"
                :key="option.name"
                type="button"
                class="taxonomy-icon-option"
                :class="{ 'is-selected': newCategory.icon === option.name }"
                :title="option.label"
                @click="newCategory.icon = option.name"
              >
                <UIcon :name="option.name" class="size-4" />
                <span>{{ option.label }}</span>
              </button>
            </div>
          </UFormField>
          <div class="taxonomy-create-actions">
            <UButton type="button" color="neutral" variant="outline" @click="categoryCreatorOpen = false">取消</UButton>
            <UButton type="submit" icon="i-lucide-check" :loading="creatingCategory" :disabled="!newCategory.name.trim()">创建并选择</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="tagCreatorOpen" title="新建标签" description="创建后会自动添加到当前文章标签。">
      <template #body>
        <form class="taxonomy-create-form" @submit.prevent="createTag">
          <UFormField label="标签名称" required>
            <UInput v-model="newTag.name" placeholder="例如：Nuxt" autofocus class="w-full" />
          </UFormField>
          <UFormField label="别名">
            <UInput v-model="newTag.slug" placeholder="留空自动生成" class="w-full" />
          </UFormField>
          <div class="taxonomy-create-actions">
            <UButton type="button" color="neutral" variant="outline" @click="tagCreatorOpen = false">取消</UButton>
            <UButton type="submit" icon="i-lucide-check" :loading="creatingTag" :disabled="!newTag.name.trim()">创建并添加</UButton>
          </div>
        </form>
      </template>
    </UModal>
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
const generatingSummary = ref(false)
const summaryGenerated = ref(false)
const generatingSeoMeta = ref(false)
const seoMetaGenerated = ref(false)
const generatingRelations = ref(false)
const relationsGenerated = ref(false)
const generatingWritingAssistant = ref(false)
const writingAssistantGenerated = ref(false)
const checkingSeo = ref(false)
const seoCheckGenerated = ref(false)
const uploadingCover = ref(false)
const coverUploaded = ref(false)
const coverUploadError = ref(false)
const coverInputRef = ref<HTMLInputElement | null>(null)
const galleryPickerOpen = ref(false)
const galleryPickerMode = ref<'cover' | 'content'>('cover')
const galleryCollectionFilter = ref<'images' | 'memes'>('images')
const gallerySearchQuery = ref('')
const categoryCreatorOpen = ref(false)
const tagCreatorOpen = ref(false)
const creatingCategory = ref(false)
const creatingTag = ref(false)
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
const newCategory = reactive({
  name: '',
  slug: '',
  icon: 'i-lucide-folder'
})
const newTag = reactive({
  name: '',
  slug: ''
})

type RelationType = 'PREREQUISITE' | 'EXTENSION' | 'SAME_TOPIC' | 'PRACTICE' | 'BACKGROUND'
type RelationSource = 'AI' | 'MANUAL'

type PostRelationItem = {
  relatedPostId: number
  title: string
  slug: string
  type: RelationType
  reason: string
  source: RelationSource
}

type WritingAssistantResult = {
  summary: string
  seoTitle: string
  seoDescription: string
  suggestedCategoryIds: number[]
  suggestedTagIds: number[]
  completionScore: number
  missingPoints: string[]
  titleSuggestions: string[]
  writingAdvice: string[]
}

type SeoCheckIssue = {
  key: string
  type: 'error' | 'warning' | 'success'
  title: string
  description: string
}

type SeoCheckResult = {
  score: number
  issues: SeoCheckIssue[]
  stats: {
    wordCount: number
    h2Count: number
    imageCount: number
    missingAltCount: number
    internalLinkCount: number
    externalLinkCount: number
  }
  advice: {
    seoTitle: string
    seoDescription: string
    fixes: string[]
    keywordSuggestions: string[]
  }
}

const relationItems = ref<PostRelationItem[]>([])
const writingAssistantResult = ref<WritingAssistantResult | null>(null)
const seoCheckResult = ref<SeoCheckResult | null>(null)
const seoCheckProblems = computed(() => seoCheckResult.value?.issues.filter((issue) => issue.type !== 'success') || [])
const relationTypeOptions: Array<{ value: RelationType, label: string }> = [
  { value: 'PREREQUISITE', label: '前置阅读' },
  { value: 'EXTENSION', label: '延伸阅读' },
  { value: 'SAME_TOPIC', label: '同主题' },
  { value: 'PRACTICE', label: '实战补充' },
  { value: 'BACKGROUND', label: '背景知识' }
]

const categoryIconOptions = [
  { name: 'i-lucide-folder', label: '通用' },
  { name: 'i-lucide-code-2', label: '代码' },
  { name: 'i-lucide-terminal', label: '终端' },
  { name: 'i-lucide-book-open', label: '阅读' },
  { name: 'i-lucide-pen-tool', label: '写作' },
  { name: 'i-lucide-camera', label: '摄影' },
  { name: 'i-lucide-palette', label: '设计' },
  { name: 'i-lucide-coffee', label: '生活' },
  { name: 'i-lucide-rocket', label: '项目' },
  { name: 'i-lucide-wrench', label: '工具' }
]
const galleryCollectionOptions = [
  { value: 'images' as const, label: '普通图片', icon: 'i-lucide-image' },
  { value: 'memes' as const, label: '表情包', icon: 'i-lucide-smile' }
]

type TaxonomyItem = {
  id: number
  name: string
  slug: string
  icon?: string | null
}

const { data: categoryData, refresh: refreshCategories } = await useFetch<{ data: TaxonomyItem[] }>('/api/admin/categories')
const { data: tagData, refresh: refreshTags } = await useFetch<{ data: TaxonomyItem[] }>('/api/admin/tags')
const { data: galleryData, pending: galleryPending, refresh: refreshGallery } = await useFetch<{ data: GalleryImage[] }>('/api/admin/gallery')
const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])
const galleryImages = computed(() => galleryData.value?.data || [])
const filteredGalleryImages = computed(() => {
  const query = gallerySearchQuery.value.trim().toLowerCase()
  return galleryImages.value.filter((image) => {
    if (image.collection !== galleryCollectionFilter.value) return false
    if (!query) return true
    return image.name.toLowerCase().includes(query) || image.url.toLowerCase().includes(query)
  })
})
const galleryPickerTitle = computed(() => galleryPickerMode.value === 'cover' ? '选择封面图' : '插入正文图片')
const galleryPickerDescription = computed(() => galleryPickerMode.value === 'cover' ? '从已上传图片中选择一张作为文章封面。' : '从已上传图片中选择一张插入到正文末尾。')

type GalleryImage = {
  name: string
  path: string
  url: string
  size: number
  type: string
  collection: 'images' | 'memes'
  updatedAt: string
}

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
    relationItems.value = normalizeLoadedRelations(data.value.data.relations || [])
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
      await saveRelations()
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

async function saveRelations() {
  if (!props.postId) return

  await $fetch(`/api/admin/posts/${props.postId}/relations`, {
    method: 'PUT',
    body: {
      items: relationItems.value.map((item, index) => ({
        relatedPostId: item.relatedPostId,
        type: item.type,
        reason: item.reason,
        source: item.source,
        sort: index
      }))
    }
  })
}

async function generateSummary() {
  const localError = validateSummaryInput()

  if (localError) {
    toast.add({
      title: '无法生成摘要',
      description: localError,
      color: 'error'
    })
    return
  }

  generatingSummary.value = true
  summaryGenerated.value = false
  try {
    const response = await $fetch<{ data: { summary: string } }>('/api/admin/ai/summary', {
      method: 'POST',
      body: {
        title: form.title,
        summary: form.summary,
        content: form.content,
        categoryId: form.categoryId,
        tagIds: form.tagIds
      }
    })

    form.summary = response.data.summary
    summaryGenerated.value = true
    toast.add({
      title: '摘要已生成',
      description: 'AI 摘要已填入表单，保存后才会写入文章。',
      color: 'success'
    })
    setTimeout(() => { summaryGenerated.value = false }, 2200)
  } catch (error: any) {
    toast.add({
      title: '生成失败',
      description: getAiErrorMessage(error),
      color: 'error'
    })
  } finally {
    generatingSummary.value = false
  }
}

async function generateSeoMeta() {
  const localError = validateSummaryInput()

  if (localError) {
    toast.add({
      title: '无法生成 SEO',
      description: localError,
      color: 'error'
    })
    return
  }

  generatingSeoMeta.value = true
  seoMetaGenerated.value = false
  try {
    const response = await $fetch<{ data: { seoTitle: string, seoDescription: string } }>('/api/admin/ai/seo-meta', {
      method: 'POST',
      body: {
        title: form.title,
        summary: form.summary,
        content: form.content,
        categoryId: form.categoryId,
        tagIds: form.tagIds
      }
    })

    form.seoTitle = response.data.seoTitle
    form.seoDescription = response.data.seoDescription
    seoMetaGenerated.value = true
    toast.add({
      title: 'SEO 已生成',
      description: 'AI SEO 标题和描述已填入表单，保存后才会写入文章。',
      color: 'success'
    })
    setTimeout(() => { seoMetaGenerated.value = false }, 2200)
  } catch (error: any) {
    toast.add({
      title: '生成失败',
      description: getAiErrorMessage(error),
      color: 'error'
    })
  } finally {
    generatingSeoMeta.value = false
  }
}

async function generateRelations() {
  const localError = validateSummaryInput()

  if (localError) {
    toast.add({
      title: '无法生成推荐',
      description: localError,
      color: 'error'
    })
    return
  }

  generatingRelations.value = true
  relationsGenerated.value = false
  try {
    const response = await $fetch<{ data: { items: Array<PostRelationItem & { postId: number }> } }>('/api/admin/ai/related-posts', {
      method: 'POST',
      body: {
        postId: props.postId,
        title: form.title,
        summary: form.summary,
        content: form.content,
        categoryId: form.categoryId,
        tagIds: form.tagIds
      }
    })

    relationItems.value = response.data.items.map((item) => ({
      relatedPostId: item.relatedPostId || item.postId,
      title: item.title,
      slug: item.slug,
      type: item.type,
      reason: item.reason,
      source: item.source || 'AI'
    }))
    relationsGenerated.value = true
    toast.add({
      title: '推荐已生成',
      description: '请确认、调整后保存文章，前台才会展示。',
      color: 'success'
    })
    setTimeout(() => { relationsGenerated.value = false }, 2200)
  } catch (error: any) {
    toast.add({
      title: '生成失败',
      description: getAiErrorMessage(error),
      color: 'error'
    })
  } finally {
    generatingRelations.value = false
  }
}

async function generateWritingAssistantResult() {
  const localError = validateSummaryInput()

  if (localError) {
    toast.add({
      title: '无法分析文章',
      description: localError,
      color: 'error'
    })
    return
  }

  generatingWritingAssistant.value = true
  writingAssistantGenerated.value = false
  try {
    const response = await $fetch<{ data: WritingAssistantResult }>('/api/admin/ai/writing-assistant', {
      method: 'POST',
      body: {
        title: form.title,
        summary: form.summary,
        content: form.content,
        categoryId: form.categoryId,
        tagIds: form.tagIds
      }
    })

    writingAssistantResult.value = response.data
    writingAssistantGenerated.value = true
    toast.add({
      title: '分析完成',
      description: '可按需应用摘要、SEO、分类、标签和标题建议。',
      color: 'success'
    })
    setTimeout(() => { writingAssistantGenerated.value = false }, 2200)
  } catch (error: any) {
    toast.add({
      title: '分析失败',
      description: getAiErrorMessage(error),
      color: 'error'
    })
  } finally {
    generatingWritingAssistant.value = false
  }
}

async function runSeoCheck() {
  const localError = validateSummaryInput()

  if (localError) {
    toast.add({
      title: '无法检查 SEO',
      description: localError,
      color: 'error'
    })
    return
  }

  checkingSeo.value = true
  seoCheckGenerated.value = false
  try {
    const response = await $fetch<{ data: SeoCheckResult }>('/api/admin/ai/seo-check', {
      method: 'POST',
      body: {
        title: form.title,
        summary: form.summary,
        content: form.content,
        categoryId: form.categoryId,
        tagIds: form.tagIds,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription
      }
    })

    seoCheckResult.value = response.data
    seoCheckGenerated.value = true
    toast.add({
      title: 'SEO 检查完成',
      description: '可按建议修复，或直接应用 AI 生成的 SEO 标题和描述。',
      color: 'success'
    })
    setTimeout(() => { seoCheckGenerated.value = false }, 2200)
  } catch (error: any) {
    toast.add({
      title: '检查失败',
      description: getAiErrorMessage(error),
      color: 'error'
    })
  } finally {
    checkingSeo.value = false
  }
}

function applySeoCheckMeta() {
  if (!seoCheckResult.value) return
  form.seoTitle = seoCheckResult.value.advice.seoTitle
  form.seoDescription = seoCheckResult.value.advice.seoDescription
  toast.add({ title: 'SEO 已应用', description: '保存文章后才会写入数据库。', color: 'success' })
}

function applyWritingSummary() {
  if (!writingAssistantResult.value) return
  form.summary = writingAssistantResult.value.summary
  toast.add({ title: '摘要已应用', description: '保存文章后才会写入数据库。', color: 'success' })
}

function applyWritingSeo() {
  if (!writingAssistantResult.value) return
  form.seoTitle = writingAssistantResult.value.seoTitle
  form.seoDescription = writingAssistantResult.value.seoDescription
  toast.add({ title: 'SEO 已应用', description: '保存文章后才会写入数据库。', color: 'success' })
}

function applyWritingCategory() {
  const categoryId = writingAssistantResult.value?.suggestedCategoryIds[0]
  if (!categoryId) return
  form.categoryId = categoryId
  toast.add({ title: '分类已应用', description: '保存文章后才会写入数据库。', color: 'success' })
}

function applyWritingTags() {
  if (!writingAssistantResult.value) return
  form.tagIds = [...new Set([...form.tagIds, ...writingAssistantResult.value.suggestedTagIds])]
  toast.add({ title: '标签已应用', description: '保存文章后才会写入数据库。', color: 'success' })
}

function applyWritingTitle(title: string) {
  form.title = title
  toast.add({ title: '标题已应用', description: '保存文章后才会写入数据库。', color: 'success' })
}

function removeRelation(index: number) {
  relationItems.value.splice(index, 1)
}

function moveRelation(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= relationItems.value.length) return

  const next = relationItems.value.slice()
  const [item] = next.splice(index, 1)
  if (!item) return

  next.splice(nextIndex, 0, item)
  relationItems.value = next
}

function normalizeLoadedRelations(relations: any[]): PostRelationItem[] {
  return relations.map((relation) => ({
    relatedPostId: relation.relatedPostId,
    title: relation.post?.title || '未命名文章',
    slug: relation.post?.slug || '',
    type: relation.type,
    reason: relation.reason || '',
    source: relation.source || 'AI'
  }))
}

function openCategoryCreator() {
  newCategory.name = ''
  newCategory.slug = ''
  newCategory.icon = 'i-lucide-folder'
  categoryCreatorOpen.value = true
}

function openTagCreator() {
  newTag.name = ''
  newTag.slug = ''
  tagCreatorOpen.value = true
}

async function createCategory() {
  if (!newCategory.name.trim()) return

  creatingCategory.value = true
  try {
    const created = await $fetch<{ data: TaxonomyItem }>('/api/admin/categories', {
      method: 'POST',
      body: {
        name: newCategory.name.trim(),
        slug: newCategory.slug.trim(),
        icon: newCategory.icon
      }
    })
    await refreshCategories()
    form.categoryId = created.data.id
    categoryCreatorOpen.value = false
    toast.add({ title: '分类已创建', description: '新分类已选中为当前文章分类。', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '分类创建失败',
      description: getTaxonomyErrorMessage(error, '分类'),
      color: 'error'
    })
  } finally {
    creatingCategory.value = false
  }
}

async function createTag() {
  if (!newTag.name.trim()) return

  creatingTag.value = true
  try {
    const created = await $fetch<{ data: TaxonomyItem }>('/api/admin/tags', {
      method: 'POST',
      body: {
        name: newTag.name.trim(),
        slug: newTag.slug.trim()
      }
    })
    await refreshTags()
    if (!form.tagIds.includes(created.data.id)) {
      form.tagIds.push(created.data.id)
    }
    tagCreatorOpen.value = false
    toast.add({ title: '标签已创建', description: '新标签已添加到当前文章。', color: 'success' })
  } catch (error: any) {
    toast.add({
      title: '标签创建失败',
      description: getTaxonomyErrorMessage(error, '标签'),
      color: 'error'
    })
  } finally {
    creatingTag.value = false
  }
}

function validateSummaryInput() {
  if (!form.title.trim()) {
    return '请先填写文章标题。'
  }

  if (!form.content.trim()) {
    return '请先填写文章内容。'
  }

  return ''
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

function getAiErrorMessage(error: any) {
  if (error?.statusCode === 401 || error?.status === 401) {
    return '登录状态已失效，请重新登录后再试。'
  }

  return error?.data?.statusMessage || error?.data?.message || error?.statusMessage || error?.message || 'AI 摘要生成失败，请稍后重试。'
}

function getTaxonomyErrorMessage(error: any, label: string) {
  const rawMessage = error?.data?.message || error?.statusMessage || error?.message || ''

  if (rawMessage.includes('Unique constraint') || rawMessage.includes('P2002')) {
    return `${label}名称或别名已存在，请换一个后重试。`
  }

  if (error?.statusCode === 401 || error?.status === 401) {
    return '登录状态已失效，请重新登录后再试。'
  }

  return rawMessage || `${label}创建失败，请稍后重试。`
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
  try {
    for (const file of files) {
      const data = new FormData()
      data.append('file', file)
      const result = await $fetch<{ data: { url: string } }>('/api/admin/upload', {
        method: 'POST',
        body: data
      })
      urls.push(result.data.url)
    }
    callback(urls)
    await refreshGallery()
  } catch (error: any) {
    toast.add({
      title: '图片上传失败',
      description: getUploadErrorMessage(error),
      color: 'error'
    })
  }
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
    await refreshGallery()
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

function openGalleryPicker(mode: 'cover' | 'content') {
  galleryPickerMode.value = mode
  galleryCollectionFilter.value = 'images'
  gallerySearchQuery.value = ''
  galleryPickerOpen.value = true
  refreshGallery()
}

function selectGalleryImage(image: GalleryImage) {
  if (galleryPickerMode.value === 'cover') {
    form.cover = image.url
  } else {
    const imageMarkdown = `\n\n![${image.name}](${image.url})\n`
    form.content = `${form.content.trimEnd()}${imageMarkdown}`
  }

  galleryPickerOpen.value = false
}

function formatSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  if (size >= 1024) return `${Math.round(size / 1024)} KB`
  return `${size} B`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function getUploadErrorMessage(error: any) {
  return error?.data?.message || error?.statusMessage || error?.message || '图片处理失败，请稍后重试。'
}
</script>

<style scoped>
.post-editor-layout {
  display: grid;
  gap: 1rem;
  grid-template-columns: 21rem minmax(0, 1fr);
  align-items: start;
}

.post-settings-panel,
.post-editor-panel {
  min-width: 0;
}

.post-settings-panel {
  position: sticky;
  top: 4.75rem;
  align-self: start;
}

.post-panel-title {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-bottom: 1px solid #eef2f7;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.85rem 1rem;
}

.post-panel-title-main {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
}

.post-panel-title > span,
.post-panel-title-main > span {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 0.6rem;
  background: #eef2ff;
  color: #4f46e5;
}

.post-panel-title h2 {
  margin: 0;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 850;
}

.post-panel-title p {
  margin: 0.15rem 0 0;
  color: #64748b;
  font-size: 0.75rem;
}

.post-settings-form {
  display: grid;
  gap: 0.85rem;
  padding: 1rem;
}

.post-upload-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.ai-summary-field {
  display: grid;
  gap: 0.55rem;
}

.ai-summary-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.ai-summary-success {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #059669;
  font-size: 0.8rem;
  font-weight: 750;
}

.post-relations-field {
  display: grid;
  gap: 0.65rem;
}

.post-relations-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.post-relations-hint {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.5;
}

.post-relations-list {
  display: grid;
  gap: 0.65rem;
}

.post-relation-item {
  display: grid;
  gap: 0.55rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.7rem;
}

.post-relation-head {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.post-relation-head strong {
  min-width: 0;
  color: #0f172a;
  font-size: 0.86rem;
  line-height: 1.45;
}

.post-relation-type {
  min-height: 2.2rem;
  font-size: 0.82rem;
}

.post-relation-controls {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.post-relations-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.85rem;
  color: #64748b;
  font-size: 0.82rem;
  line-height: 1.5;
}

.writing-assistant-field {
  display: grid;
  gap: 0.65rem;
}

.seo-check-field {
  display: grid;
  gap: 0.65rem;
}

.writing-assistant-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.writing-assistant-result,
.seo-check-result {
  display: grid;
  gap: 0.65rem;
}

.writing-score {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #dbeafe;
  border-radius: 0.75rem;
  background: #eff6ff;
  padding: 0.7rem 0.8rem;
}

.writing-score span {
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 850;
}

.writing-score strong {
  color: #1e3a8a;
  font-size: 1.4rem;
  font-weight: 950;
}

.seo-score {
  background: #fff7ed;
  border-color: #fed7aa;
}

.seo-score span {
  color: #c2410c;
}

.seo-score strong {
  color: #9a3412;
}

.writing-assistant-result section,
.seo-check-result section {
  display: grid;
  gap: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.7rem;
}

.writing-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.writing-section-title h3 {
  margin: 0;
  color: #0f172a;
  font-size: 0.84rem;
  font-weight: 900;
}

.writing-assistant-result ul,
.seo-check-result ul {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.55;
  padding-left: 1rem;
}

.seo-issue-list {
  display: grid;
  gap: 0.45rem;
}

.seo-issue-list article {
  display: grid;
  gap: 0.18rem;
  border-left: 3px solid #f59e0b;
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.6rem;
}

.seo-issue-list article.is-error {
  border-left-color: #ef4444;
}

.seo-issue-list article.is-warning {
  border-left-color: #f59e0b;
}

.seo-issue-list strong {
  color: #0f172a;
  font-size: 0.78rem;
  font-weight: 900;
}

.seo-issue-list p {
  margin: 0;
  color: #64748b;
  font-size: 0.75rem;
  line-height: 1.45;
}

.seo-keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.seo-keyword-list span {
  border-radius: 999px;
  background: #eef2ff;
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 850;
  padding: 0.25rem 0.5rem;
}

.writing-apply-list,
.writing-title-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.writing-apply-list button,
.writing-title-list button {
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  background: white;
  color: #334155;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.35;
  padding: 0.38rem 0.6rem;
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.writing-apply-list button:hover,
.writing-title-list button:hover {
  border-color: #94a3b8;
  background: #0f172a;
  color: white;
}

.cover-preview {
  display: grid;
  overflow: hidden;
  margin-top: 0.6rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.cover-preview img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.cover-preview-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-top: 1px solid #e2e8f0;
  padding: 0.45rem 0.55rem;
}

.cover-preview-meta span {
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.taxonomy-field-main {
  min-width: 0;
  flex: 1;
}

.taxonomy-field-stacked {
  align-items: flex-start;
  flex-direction: column;
}

.taxonomy-inline-action {
  align-self: flex-start;
}

.post-tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.post-tag-picker.is-empty {
  border: 1px dashed #cbd5e1;
  border-radius: 0.75rem;
  background: #f8fafc;
  padding: 0.85rem;
}

.post-editor-panel {
  overflow: hidden;
}

.post-editor-title {
  justify-content: space-between;
}

.taxonomy-create-form {
  display: grid;
  gap: 0.9rem;
}

.taxonomy-icon-grid {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(auto-fill, minmax(5.75rem, 1fr));
}

.taxonomy-icon-option {
  display: inline-flex;
  min-width: 0;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.55rem;
  background: #fff;
  color: #334155;
  font-size: 0.8rem;
  font-weight: 750;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.taxonomy-icon-option:hover,
.taxonomy-icon-option.is-selected {
  border-color: #818cf8;
  background: #eef2ff;
  color: #4338ca;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.1);
}

.taxonomy-icon-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 0.9rem;
}

.gallery-picker {
  display: grid;
  gap: 0.85rem;
}

.gallery-picker-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.gallery-picker-search {
  width: min(28rem, 100%);
}

.gallery-picker-filters {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.65rem;
  background: #f8fafc;
  padding: 0.2rem;
}

.gallery-picker-filters button {
  display: inline-flex;
  min-height: 1.9rem;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border-radius: 0.5rem;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0 0.55rem;
  transition: background 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.gallery-picker-filters button:hover,
.gallery-picker-filters button.is-active {
  background: #fff;
  color: #4338ca;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.gallery-picker-grid {
  display: grid;
  max-height: min(62vh, 42rem);
  overflow-y: auto;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
  padding-right: 0.15rem;
}

.gallery-picker-card {
  display: grid;
  overflow: hidden;
  grid-template-rows: auto minmax(3.75rem, auto);
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  background: #fff;
  text-align: left;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.gallery-picker-card:hover {
  border-color: #a5b4fc;
  box-shadow: 0 12px 28px rgba(79, 70, 229, 0.12);
  transform: translateY(-1px);
}

.gallery-picker-thumb {
  display: block;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  background: #f8fafc;
}

.gallery-picker-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-picker-thumb.is-meme {
  background:
    linear-gradient(45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(-45deg, #f8fafc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f8fafc 75%),
    linear-gradient(-45deg, transparent 75%, #f8fafc 75%);
  background-color: #fff;
  background-position: 0 0, 0 0.5rem, 0.5rem -0.5rem, -0.5rem 0;
  background-size: 1rem 1rem;
}

.gallery-picker-thumb.is-meme img {
  object-fit: contain;
}

.gallery-picker-info {
  display: grid;
  min-width: 0;
  gap: 0.25rem;
  border-top: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.88);
  padding: 0.65rem 0.75rem;
  box-shadow: 0 -1px 0 rgba(15, 23, 42, 0.02);
}

.gallery-picker-info strong,
.gallery-picker-info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-picker-info strong {
  color: #020617;
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.25;
}

.gallery-picker-info small {
  color: #475569;
  font-size: 0.74rem;
  font-weight: 650;
  line-height: 1.25;
}

.gallery-picker-state {
  display: grid;
  min-height: 18rem;
  place-items: center;
  align-content: center;
  gap: 0.5rem;
  color: #94a3b8;
  text-align: center;
}

.gallery-picker-state strong {
  color: #64748b;
  font-size: 0.95rem;
}

.post-editor-panel :deep(.admin-md-editor) {
  min-height: calc(100vh - 12.25rem);
  border-radius: 0;
}

@media (max-width: 1180px) {
  .post-editor-layout {
    grid-template-columns: 1fr;
  }

  .post-settings-panel {
    position: static;
  }
}

@media (max-width: 640px) {
  .taxonomy-field {
    align-items: stretch;
    flex-direction: column;
  }

  .taxonomy-inline-action,
  .taxonomy-field-main {
    width: 100%;
  }

  .post-upload-row {
    align-items: stretch;
    flex-direction: column;
  }

  .ai-summary-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .post-editor-title,
  .gallery-picker-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .gallery-picker-search {
    width: 100%;
  }

  .gallery-picker-filters {
    width: 100%;
  }

  .gallery-picker-filters button {
    flex: 1;
  }

  .taxonomy-create-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}
</style>
