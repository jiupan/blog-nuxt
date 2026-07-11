import type { GalleryImage, PostRelationItem, SeoCheckResult, TaxonomyItem, WritingAssistantResult } from '~/components/admin/post-form.types'
import type { KnowledgeDocumentState } from '~~/types/dto/knowledge'
import { getApiErrorMessage, getApiErrorRawMessage, getApiErrorStatus, isUniqueConstraintMessage } from '~/utils/api-error'

type PostFormMode = 'create' | 'edit'
type PostStatus = 'DRAFT' | 'PUBLISHED'

type UsePostFormOptions = {
  mode: PostFormMode
  postId?: number
}

export async function usePostForm(options: UsePostFormOptions) {
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
  const knowledgePending = ref(false)
  const knowledgeDocument = ref<KnowledgeDocumentState | null>(null)
  const uploadingCover = ref(false)
  const coverUploaded = ref(false)
  const coverUploadError = ref(false)
  const galleryPickerOpen = ref(false)
  const galleryPickerMode = ref<'cover' | 'content'>('cover')
  const galleryCollectionFilter = ref<GalleryImage['collection']>('images')
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
    isPinned: false,
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

  const relationItems = ref<PostRelationItem[]>([])
  const writingAssistantResult = ref<WritingAssistantResult | null>(null)
  const seoCheckResult = ref<SeoCheckResult | null>(null)
  const { data: categoryData, refresh: refreshCategories } = await useFetch<{ data: TaxonomyItem[] }>('/api/admin/categories')
  const { data: tagData, refresh: refreshTags } = await useFetch<{ data: TaxonomyItem[] }>('/api/admin/tags')
  const { data: galleryData, pending: galleryPending, refresh: refreshGallery } = await useFetch<{ data: GalleryImage[] }>('/api/admin/gallery')
  const categories = computed(() => categoryData.value?.data || [])
  const tags = computed(() => tagData.value?.data || [])
  const galleryImages = computed(() => galleryData.value?.data || [])
  const galleryPickerTitle = computed(() => galleryPickerMode.value === 'cover' ? '选择封面图' : '插入正文图片')
  const galleryPickerDescription = computed(() => galleryPickerMode.value === 'cover' ? '从已上传图片中选择一张作为文章封面。' : '从已上传图片中选择一张插入到正文末尾。')

  if (options.mode === 'edit' && options.postId) {
    const { data } = await useFetch(`/api/admin/posts/${options.postId}`)
    if (data.value?.data) {
      Object.assign(form, {
        title: data.value.data.title,
        slug: data.value.data.slug,
        summary: data.value.data.summary || '',
        content: data.value.data.content,
        cover: data.value.data.cover || '',
        isPinned: Boolean(data.value.data.isPinned),
        categoryId: data.value.data.categoryId,
        tagIds: data.value.data.tagIds || [],
        status: data.value.data.status,
        seoTitle: data.value.data.seoTitle || '',
        seoDescription: data.value.data.seoDescription || ''
      })
      relationItems.value = normalizeLoadedRelations(data.value.data.relations || [])
      knowledgeDocument.value = data.value.data.knowledgeDocument || null
    }
  }

  async function save(status: PostStatus) {
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

      if (options.mode === 'create') {
        await $fetch('/api/admin/posts', { method: 'POST', body })
      } else {
        await $fetch(`/api/admin/posts/${options.postId}`, { method: 'PUT', body })
        await saveRelations()
      }

      toast.add({
        title: successTitle(status),
        description: options.mode === 'create' ? '文章已创建，正在返回文章列表。' : '文章修改已保存。',
        color: 'success'
      })

      if (options.mode === 'create' || status === 'PUBLISHED') {
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
    if (!options.postId) return

    await $fetch(`/api/admin/posts/${options.postId}/relations`, {
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

  async function setKnowledgeEnabled(enabled: boolean) {
    if (!options.postId) return
    knowledgePending.value = true
    try {
      const response = await $fetch<{ data: KnowledgeDocumentState }>(`/api/admin/knowledge/documents/${options.postId}/enabled`, { method: 'PUT', body: { enabled } })
      knowledgeDocument.value = response.data
      toast.add({ title: enabled ? '已加入 AI 知识库' : '已从知识库停用', color: 'success' })
    } catch (error: unknown) {
      toast.add({ title: '知识库操作失败', description: getApiErrorMessage(error), color: 'error' })
    } finally {
      knowledgePending.value = false
    }
  }

  async function syncKnowledge() {
    if (!options.postId) return
    knowledgePending.value = true
    try {
      const response = await $fetch<{ data: { document: KnowledgeDocumentState } }>(`/api/admin/knowledge/documents/${options.postId}/sync`, { method: 'POST' })
      knowledgeDocument.value = response.data.document
      toast.add({ title: '知识向量同步完成', color: 'success' })
    } catch (error: unknown) {
      toast.add({ title: '知识同步失败', description: getApiErrorMessage(error), color: 'error' })
    } finally {
      knowledgePending.value = false
    }
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
          postId: options.postId,
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

  function successTitle(status: PostStatus) {
    if (status === 'DRAFT') {
      return options.mode === 'create' ? '草稿已创建' : '草稿已保存'
    }

    return options.mode === 'create' ? '文章已发布' : '发布成功'
  }

  function validateForm() {
    if (!form.title.trim()) {
      return '请先填写文章标题。'
    }

    if (!form.content.trim()) {
      return '请先填写文章内容。'
    }

    if (options.mode === 'edit' && !form.slug.trim()) {
      return '文章别名不能为空。'
    }

    return ''
  }

  function getSaveErrorMessage(error: any) {
    const rawMessage = getApiErrorRawMessage(error)
    const zodMessage = parseZodMessage(rawMessage)

    if (zodMessage) {
      return zodMessage
    }

    if (isUniqueConstraintMessage(rawMessage)) {
      return '文章别名已存在，请换一个别名后重试。'
    }

    if (rawMessage.includes('文章别名不能为空')) {
      return '文章别名不能为空。'
    }

    if (getApiErrorStatus(error) === 401) {
      return '登录状态已失效，请重新登录后再保存。'
    }

    return rawMessage || '保存时发生未知错误，请稍后重试。'
  }

  function getAiErrorMessage(error: any) {
    return getApiErrorMessage(error, {
      fallback: 'AI 摘要生成失败，请稍后重试。',
      unauthorized: '登录状态已失效，请重新登录后再试。'
    })
  }

  function getTaxonomyErrorMessage(error: any, label: string) {
    return getApiErrorMessage(error, {
      fallback: `${label}创建失败，请稍后重试。`,
      unauthorized: '登录状态已失效，请重新登录后再试。',
      unique: `${label}名称或别名已存在，请换一个后重试。`
    })
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
      const result = await $fetch<{ data: { url: string } }>('/api/admin/upload?purpose=cover', { method: 'POST', body })
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
    galleryCollectionFilter.value = mode === 'cover' ? 'covers' : 'images'
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

  function getUploadErrorMessage(error: any) {
    return getApiErrorMessage(error, {
      fallback: '图片处理失败，请稍后重试。'
    })
  }

  return {
    pending,
    generatingSummary,
    summaryGenerated,
    generatingSeoMeta,
    seoMetaGenerated,
    generatingRelations,
    relationsGenerated,
    generatingWritingAssistant,
    writingAssistantGenerated,
    checkingSeo,
    seoCheckGenerated,
    knowledgePending,
    knowledgeDocument,
    uploadingCover,
    coverUploaded,
    coverUploadError,
    galleryPickerOpen,
    galleryCollectionFilter,
    gallerySearchQuery,
    categoryCreatorOpen,
    tagCreatorOpen,
    creatingCategory,
    creatingTag,
    form,
    newCategory,
    newTag,
    relationItems,
    writingAssistantResult,
    seoCheckResult,
    categories,
    tags,
    galleryImages,
    galleryPickerTitle,
    galleryPickerDescription,
    save,
    setKnowledgeEnabled,
    syncKnowledge,
    generateSummary,
    generateSeoMeta,
    generateRelations,
    generateWritingAssistantResult,
    runSeoCheck,
    applySeoCheckMeta,
    applyWritingSummary,
    applyWritingSeo,
    applyWritingCategory,
    applyWritingTags,
    applyWritingTitle,
    openCategoryCreator,
    openTagCreator,
    createCategory,
    createTag,
    uploadImages,
    uploadCover,
    openGalleryPicker,
    selectGalleryImage,
    refreshGallery,
    galleryPending
  }
}
