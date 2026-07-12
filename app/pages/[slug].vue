<template>
  <div class="post-page">
    <section class="post-hero" :style="{ background: `radial-gradient(circle at 79% 22%, rgb(255 255 255 / 18%), transparent 25%), ${heroGradient}` }">
      <div class="post-hero-inner">
        <div class="post-hero-grid">
          <div class="post-hero-copy">
            <div v-if="post.category || post.tags.length" class="post-kicker">
              <NuxtLink v-if="post.category" :to="`/categories/${post.category.slug}`">{{ post.category.name }}</NuxtLink>
              <NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`"># {{ tag.name }}</NuxtLink>
            </div>
            <h1>{{ post.title }}</h1>
            <div class="post-meta">
              <span>
                <CalendarDaysIcon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ formatDate(post.publishedAt) }}
              </span>
              <span>
                <Clock3Icon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ post.rendered.readingTime }} 分钟阅读
              </span>
              <span>
                <FileTextIcon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ post.rendered.wordCount }} 字
              </span>
              <span>
                <EyeIcon :size="15" class="post-meta-icon" aria-hidden="true" />
                {{ post.viewCount }} 阅读
              </span>
            </div>
          </div>

          <div class="post-cover-card" :style="{ background: heroGradient }">
            <img v-if="post.cover" :src="post.cover" :alt="post.title" class="post-cover-img" />
            <div v-else class="cover-fallback">
              <span>{{ coverWord }}</span>
              <strong>{{ post.category?.name || '文章' }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="post-shell">
      <main class="post-main">
        <section v-if="post.summary" class="summary-card">
          <div class="summary-heading">
            <div class="summary-title" tabindex="0" aria-describedby="summary-tooltip">
              <Icon name="i-lucide-bot" class="summary-title-icon" />
              <span>文章摘要</span>
              <Icon name="i-lucide-chevron-right" class="summary-title-arrow" />
              <span id="summary-tooltip" class="summary-tooltip" role="tooltip">通过AI生成文章摘要</span>
            </div>
            <small>DyuGPT</small>
          </div>
          <div class="summary-body">
            <div class="summary-thumb">
              <img v-if="post.cover" :src="post.cover" :alt="post.title" class="summary-thumb-img" />
              <span v-else>{{ coverWord }}</span>
            </div>
            <p>{{ post.summary }}</p>
          </div>
          <form class="summary-chat-form" @submit.prevent="openSummaryDialog">
            <input v-model="summaryQuestion" type="text" placeholder="针对这个文章有什么想问的？" aria-label="针对这篇文章提问" />
            <button type="submit" :disabled="!summaryQuestion.trim()">
              <span>发送</span>
              <Icon name="i-lucide-corner-down-left" />
            </button>
          </form>
        </section>

        <Teleport to="body">
          <Transition name="summary-dialog-backdrop">
            <div v-if="summaryDialogOpen" class="summary-dialog-backdrop" @click="closeSummaryDialog" />
          </Transition>
          <Transition name="summary-dialog-panel" @after-enter="focusSummaryDialogInput">
            <div v-if="summaryDialogOpen" class="summary-dialog-stage">
              <section class="summary-dialog" role="dialog" aria-modal="true" aria-labelledby="summary-dialog-title">
                <header class="summary-dialog-header"><div class="summary-dialog-identity"><span><Icon name="i-lucide-sparkles" /></span><div><strong id="summary-dialog-title">DyuGPT</strong><small>当前文章智能助手</small></div></div><div class="summary-dialog-head-actions"><button type="button" aria-label="历史会话" title="历史会话" :class="{ 'is-active': summaryHistoryOpen }" @click="toggleSummaryHistory"><Icon name="i-lucide-history" /></button><button v-if="summaryConversationId" type="button" aria-label="新建对话" title="新建对话" @click="resetSummaryConversation"><Icon name="i-lucide-message-square-plus" /></button><button type="button" aria-label="关闭对话" @click="closeSummaryDialog"><Icon name="i-lucide-x" /></button></div></header>
                <div class="summary-dialog-rule" />
                <Transition name="summary-history">
                  <aside v-if="summaryHistoryOpen" class="summary-history-drawer" aria-label="历史会话"><header><div><strong>历史会话</strong><small>{{ summaryHistoryTotal }} 个对话</small></div><button type="button" aria-label="关闭历史会话" @click="summaryHistoryOpen = false"><Icon name="i-lucide-x" /></button></header><label class="summary-history-search"><Icon name="i-lucide-search" /><input v-model="summaryHistoryQuery" type="search" placeholder="搜索会话" /></label><div class="summary-history-list"><div v-if="summaryHistoryLoading && !summaryHistoryItems.length" class="summary-history-state"><Icon name="i-lucide-loader-circle" />正在加载</div><template v-else-if="summaryHistoryGroups.length"><section v-for="group in summaryHistoryGroups" :key="group.label"><h3>{{ group.label }}</h3><article v-for="item in group.items" :key="item.id" :class="{ 'is-current': item.id === summaryConversationId }"><button type="button" class="summary-history-main" @click="switchSummaryConversation(item.id)"><span><Icon name="i-lucide-message-circle" /></span><div><strong>{{ item.title }}</strong><small>{{ item.messageCount }} 条消息 · {{ formatConversationTime(item.lastMessageAt) }}</small></div></button><button type="button" class="summary-history-delete" aria-label="删除会话" @click="removeSummaryConversation(item)"><Icon name="i-lucide-trash-2" /></button></article></section><button v-if="summaryHistoryHasMore && !summaryHistoryQuery" type="button" class="summary-history-more" :disabled="summaryHistoryLoading" @click="loadSummaryHistory(false)">{{ summaryHistoryLoading ? '加载中…' : '加载更多' }}</button></template><div v-else class="summary-history-empty"><span><Icon name="i-lucide-messages-square" /></span><strong>{{ summaryHistoryQuery ? '没有匹配的会话' : '还没有历史会话' }}</strong><small>{{ summaryHistoryQuery ? '换个关键词试试' : '开始提问后，会话会保存在这里' }}</small></div></div></aside>
                </Transition>
                <div ref="summaryMessagesEl" class="summary-dialog-messages"><div class="summary-dialog-message is-assistant"><span class="summary-dialog-avatar"><Icon name="i-lucide-bot" /></span><p>你好，我是这篇文章的 AI 助手。你可以围绕文章内容继续提问。</p></div><div v-for="message in summaryMessages" :key="message.id" class="summary-dialog-message" :class="message.role === 'USER' ? 'is-user' : 'is-assistant'"><span v-if="message.role === 'ASSISTANT'" class="summary-dialog-avatar"><Icon name="i-lucide-bot" /></span><div class="summary-dialog-message-copy"><p>{{ message.content }}</p><details v-if="message.citations?.length" class="summary-dialog-citations"><summary><Icon name="i-lucide-book-open-text" /><span>参考章节</span><small>{{ message.citations.length }}</small><Icon name="i-lucide-chevron-down" class="citation-chevron" /></summary><div class="summary-dialog-citation-list"><button v-for="(citation, citationIndex) in message.citations" :key="`${citation.chunkId}-${citation.headingPath}-${citationIndex}`" type="button" @click="goToArticleCitation(citation)"><span>{{ citationIndex + 1 }}</span><strong>{{ citation.headingPath || '文章正文' }}</strong><Icon name="i-lucide-arrow-up-right" /></button></div></details></div></div><div v-if="summaryDialogLoading" class="summary-dialog-pending"><span class="summary-dialog-avatar"><Icon name="i-lucide-bot" /></span><div><i /><i /><i /></div><small>正在阅读当前文章</small></div><div v-if="summaryDialogError" class="summary-dialog-error"><Icon name="i-lucide-circle-alert" /><span>{{ summaryDialogError }}</span><button type="button" @click="retrySummaryQuestion">重试</button></div></div>
                <footer class="summary-dialog-footer"><form class="summary-dialog-composer" @submit.prevent="sendSummaryDialogMessage"><textarea ref="summaryDialogInput" v-model="summaryDialogDraft" rows="1" placeholder="继续针对这篇文章提问…" aria-label="继续提问" @keydown.enter.exact.prevent="sendSummaryDialogMessage" /><button v-if="!summaryDialogLoading" type="submit" :disabled="!summaryDialogDraft.trim()" aria-label="发送消息"><Icon name="i-lucide-send" /></button><button v-else type="button" class="is-stop" aria-label="停止生成" @click="stopSummaryDialogRequest"><Icon name="i-lucide-square" /></button></form><p>回答仅基于当前文章内容，请注意核对重要信息</p></footer>
              </section>
            </div>
          </Transition>
        </Teleport>

        <div class="content-card">
          <div ref="articleContentEl" class="prose-blog" v-html="post.rendered.html" />
        </div>

        <section v-if="continueItems.length" class="continue-card">
          <div class="continue-heading">
            <span>继续阅读</span>
            <small>{{ hasSavedRelations ? 'AI 辅助推荐' : '更多文章' }}</small>
          </div>
          <div class="continue-list">
            <NuxtLink v-for="item in continueItems" :key="item.post.slug" :to="postPath(item.post.slug)" class="continue-item">
              <span v-if="item.type" class="continue-type">{{ relationTypeLabel(item.type) }}</span>
              <strong>{{ item.post.title }}</strong>
              <p>{{ item.reason || item.post.summary || '这篇文章也许值得继续阅读。' }}</p>
            </NuxtLink>
          </div>
        </section>

        <nav v-if="post.previous || post.next" class="post-pager">
          <NuxtLink v-if="post.previous" :to="postPath(post.previous.slug)" class="post-pager-prev">
            <span>上一篇</span>
            <strong>{{ post.previous.title }}</strong>
          </NuxtLink>
          <NuxtLink v-if="post.next" :to="postPath(post.next.slug)" class="post-pager-next">
            <span>下一篇</span>
            <strong>{{ post.next.title }}</strong>
          </NuxtLink>
        </nav>
      </main>

      <PublicSidebar
        class="post-sidebar"
        :style="{ '--post-sidebar-sticky-top': postSidebarStickyTop }"
        :site-name="siteName"
        :description="siteSettings.sidebar_description"
        :categories="sidebarCategories"
        :tags="sidebarTags"
        :posts="sidebarPosts"
      >
        <template #after-author>
          <section class="toc-card toc-card-elegant">
            <div class="toc-card-inner">
              <div class="toc-card-heading">
                <span class="toc-icon" aria-hidden="true">
                  <Icon name="i-lucide-list" />
                </span>
                <h2>文章目录</h2>
              </div>

              <div v-if="post.rendered.toc.length" class="toc-list-wrap">
                <span class="toc-guide" aria-hidden="true"></span>
                <span
                  v-if="activeTocId"
                  class="toc-active-line"
                  :style="{ transform: `translateY(${activeTocOffset}px)` }"
                  aria-hidden="true"
                ></span>
                <nav class="toc-list" aria-label="文章目录">
                  <a
                    v-for="item in post.rendered.toc"
                    :key="item.id"
                    :href="`#${item.id}`"
                    :data-toc-id="item.id"
                    :class="{ 'is-child': item.level === 3, 'is-active': item.id === activeTocId }"
                    @click="activeTocId = item.id"
                  >
                    {{ item.text }}
                  </a>
                </nav>
              </div>
              <p v-else>暂无目录</p>
            </div>
          </section>
        </template>

        <template #after-tags>
          <section class="info-card">
            <h2>文章信息</h2>
            <p><span>发布于</span><strong>{{ formatDate(post.publishedAt) }}</strong></p>
            <p><span>阅读量</span><strong>{{ post.viewCount }}</strong></p>
            <p><span>分类</span><strong>{{ post.category?.name || '未分类' }}</strong></p>
          </section>
        </template>
      </PublicSidebar>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  CalendarDays as CalendarDaysIcon,
  Clock3 as Clock3Icon,
  Eye as EyeIcon,
  FileText as FileTextIcon
} from '@lucide/vue'

const route = useRoute()
const config = useRuntimeConfig()
const [{ data, error }, { data: categoryData }, { data: tagData }, { data: relatedData }] = await Promise.all([
  useFetch(`/api/posts/${route.params.slug}`),
  useFetch('/api/categories'),
  useFetch('/api/tags'),
  useFetch('/api/posts', { query: { page: 1, pageSize: 5 } })
])

if (error.value || !data.value?.data) {
  throw createError({ statusCode: 404, message: '文章不存在' })
}

const post = computed(() => data.value!.data)
const siteSettings = useSiteSettings()
const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const layoutScrollTitle = useState<string>('layoutScrollTitle', () => '')
const postSidebarStickyTop = ref('84px')
const activeTocId = ref('')
const activeTocOffset = ref(0)
const summaryQuestion = ref('')
const summaryDialogDraft = ref('')
const summaryDialogOpen = ref(false)
type ArticleChatCitation = { chunkId?: number, headingPath?: string | null, excerpt?: string }
type ArticleChatMessage = { id: number | string, role: 'USER' | 'ASSISTANT', content: string, status: string, citations?: ArticleChatCitation[], error?: string | null }
type ArticleConversationItem = { id: number, status: 'ACTIVE' | 'ARCHIVED', title: string, messageCount: number, lastMessageAt: string, createdAt: string }
const summaryMessages = ref<ArticleChatMessage[]>([])
const summaryConversationId = ref<number | null>(null)
const summaryHistoryOpen = ref(false)
const summaryHistoryLoading = ref(false)
const summaryHistoryQuery = ref('')
const summaryHistoryItems = ref<ArticleConversationItem[]>([])
const summaryHistoryPage = ref(1)
const summaryHistoryHasMore = ref(false)
const summaryHistoryTotal = ref(0)
const summaryDialogLoading = ref(false)
const summaryDialogError = ref('')
const summaryDialogInput = ref<HTMLTextAreaElement | null>(null)
const summaryMessagesEl = ref<HTMLElement | null>(null)
const articleContentEl = ref<HTMLElement | null>(null)
let summaryDialogController: AbortController | null = null
let sidebarResizeObserver: ResizeObserver | undefined
let tocObserver: IntersectionObserver | undefined
const sidebarCategories = computed(() => categoryData.value?.data || [])
const sidebarTags = computed(() => tagData.value?.data || [])
const sidebarPosts = computed(() => {
  return (relatedData.value?.data?.items || []).filter((item: any) => item.slug !== post.value.slug)
})
const summaryHistoryGroups = computed(() => {
  const query = summaryHistoryQuery.value.trim().toLocaleLowerCase()
  const items = query
    ? summaryHistoryItems.value.filter(item => item.title.toLocaleLowerCase().includes(query))
    : summaryHistoryItems.value
  const groups = new Map<string, ArticleConversationItem[]>()
  for (const item of items) {
    const label = conversationDateGroup(item.lastMessageAt)
    groups.set(label, [...(groups.get(label) || []), item])
  }
  return [...groups].map(([label, groupedItems]) => ({ label, items: groupedItems }))
})
const savedRelations = computed(() => post.value.relations || [])
const hasSavedRelations = computed(() => savedRelations.value.length > 0)
const continueItems = computed(() => {
  if (hasSavedRelations.value) {
    return savedRelations.value
  }

  return sidebarPosts.value.slice(0, 3).map((item: any) => ({
    type: '',
    reason: '',
    post: item
  }))
})
const coverWord = computed(() => {
  return post.value.category?.name || post.value.title.slice(0, 4)
})

const heroGradients = [
  'linear-gradient(135deg, #5c2348, #8b2f6a)',
  'linear-gradient(135deg, #18345f, #1f5d91)',
  'linear-gradient(135deg, #29462c, #4e7433)',
  'linear-gradient(135deg, #5a3517, #9a5a1d)',
  'linear-gradient(135deg, var(--theme-text), #5d6470)',
  'linear-gradient(135deg, #68312e, #a9463e)'
]
const heroGradient = computed(() => heroGradients[post.value.id % heroGradients.length])

layoutScrollTitle.value = post.value.title

onBeforeUnmount(() => {
  layoutScrollTitle.value = ''
  document.body.style.overflow = ''
  window.removeEventListener('resize', updatePostSidebarStickyTop)
  window.removeEventListener('keydown', handleSummaryDialogEscape)
  sidebarResizeObserver?.disconnect()
  tocObserver?.disconnect()
})

onMounted(() => {
  updatePostSidebarStickyTop()
  setupTocObserver()
  nextTick(() => requestAnimationFrame(setupCollapsibleCodeBlocks))
  window.addEventListener('resize', updatePostSidebarStickyTop)
  window.addEventListener('keydown', handleSummaryDialogEscape)
  const sidebar = document.querySelector<HTMLElement>('.post-sidebar')

  if (sidebar && 'ResizeObserver' in window) {
    sidebarResizeObserver = new ResizeObserver(() => updatePostSidebarStickyTop())
    sidebarResizeObserver.observe(sidebar)
  }
})

function setupCollapsibleCodeBlocks() {
  const content = articleContentEl.value
  if (!content) return

  for (const block of content.querySelectorAll<HTMLElement>('.md-editor-code')) {
    const pre = block.querySelector<HTMLElement>('pre')
    const code = pre?.querySelector<HTMLElement>('code')
    const actions = block.querySelector<HTMLElement>('.md-editor-code-action')

    if (code && actions && block.dataset.copyReady !== 'true') {
      block.dataset.copyReady = 'true'

      const copyButton = document.createElement('button')
      copyButton.type = 'button'
      copyButton.className = 'code-copy-button'
      copyButton.innerHTML = codeCopyIcon('copy')
      copyButton.setAttribute('aria-label', '复制代码')
      copyButton.title = '复制代码'
      copyButton.addEventListener('click', async () => {
        try {
          await copyText(code.textContent || '')
          copyButton.innerHTML = codeCopyIcon('check')
          copyButton.setAttribute('aria-label', '已复制')
          copyButton.title = '已复制'
          copyButton.classList.add('is-copied')
          window.setTimeout(() => {
            copyButton.innerHTML = codeCopyIcon('copy')
            copyButton.setAttribute('aria-label', '复制代码')
            copyButton.title = '复制代码'
            copyButton.classList.remove('is-copied')
          }, 1600)
        } catch {
          copyButton.setAttribute('aria-label', '复制失败')
          copyButton.title = '复制失败'
          copyButton.classList.add('is-copy-error')
          window.setTimeout(() => {
            copyButton.setAttribute('aria-label', '复制代码')
            copyButton.title = '复制代码'
            copyButton.classList.remove('is-copy-error')
          }, 1600)
        }
      })
      actions.append(copyButton)
    }

    if (!pre || pre.scrollHeight <= 480 || block.dataset.collapseReady === 'true') continue

    block.dataset.collapseReady = 'true'
    block.classList.add('is-code-collapsed')

    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'code-collapse-toggle'
    toggle.textContent = '展开全部代码'
    toggle.setAttribute('aria-expanded', 'false')
    toggle.addEventListener('click', () => {
      const willExpand = block.classList.contains('is-code-collapsed')
      block.classList.toggle('is-code-collapsed', !willExpand)
      toggle.textContent = willExpand ? '收起代码' : '展开全部代码'
      toggle.setAttribute('aria-expanded', String(willExpand))

      if (!willExpand && block.getBoundingClientRect().top < 0) {
        block.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
    block.append(toggle)
  }
}

function codeCopyIcon(icon: 'copy' | 'check') {
  const path = icon === 'check'
    ? '<path d="M20 6 9 17l-5-5" />'
    : '<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />'
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy command failed')
}

watch(activeTocId, () => {
  nextTick(updateTocIndicatorPosition)
})

watch(() => post.value.rendered.html, () => {
  nextTick(() => requestAnimationFrame(setupCollapsibleCodeBlocks))
})

useSeoMeta({
  title: () => post.value.seoTitle || post.value.title,
  description: () => post.value.seoDescription || post.value.summary || '',
  ogTitle: () => post.value.title,
  ogDescription: () => post.value.summary || '',
  ogImage: () => post.value.cover || ''
})

async function openSummaryDialog() {
  const question = summaryQuestion.value.trim()
  if (!question) return
  summaryDialogOpen.value = true
  document.body.style.overflow = 'hidden'
  if (!summaryMessages.value.length) await restoreSummaryConversation()
  await submitSummaryQuestion(question)
  summaryQuestion.value = ''
}

function closeSummaryDialog() {
  summaryDialogController?.abort()
  summaryHistoryOpen.value = false
  summaryDialogOpen.value = false
  document.body.style.overflow = ''
}

async function toggleSummaryHistory() {
  summaryHistoryOpen.value = !summaryHistoryOpen.value
  if (summaryHistoryOpen.value) await loadSummaryHistory(true)
}

async function loadSummaryHistory(reset: boolean) {
  if (summaryHistoryLoading.value) return
  if (reset) {
    summaryHistoryPage.value = 1
    summaryHistoryItems.value = []
  }
  summaryHistoryLoading.value = true
  try {
    const response = await $fetch<{ data: { items: ArticleConversationItem[], pagination: { page: number, total: number, hasMore: boolean } } }>(`/api/posts/${post.value.slug}/chat/conversations`, {
      query: { page: summaryHistoryPage.value, pageSize: 20 }
    })
    summaryHistoryItems.value.push(...response.data.items)
    summaryHistoryTotal.value = response.data.pagination.total
    summaryHistoryHasMore.value = response.data.pagination.hasMore
    if (response.data.pagination.hasMore) summaryHistoryPage.value += 1
  } catch (error: unknown) {
    summaryDialogError.value = getArticleChatError(error)
  } finally {
    summaryHistoryLoading.value = false
  }
}

async function switchSummaryConversation(conversationId: number) {
  if (summaryDialogLoading.value || conversationId === summaryConversationId.value) {
    summaryHistoryOpen.value = false
    return
  }
  summaryDialogError.value = ''
  try {
    const response = await $fetch<{ data: { conversation: { id: number }, messages: ArticleChatMessage[] } }>(`/api/posts/${post.value.slug}/chat/conversations/${conversationId}`, { method: 'PUT' })
    summaryConversationId.value = response.data.conversation.id
    summaryMessages.value = response.data.messages
    summaryHistoryOpen.value = false
    await scrollSummaryMessages(false)
    summaryDialogInput.value?.focus()
  } catch (error: unknown) {
    summaryDialogError.value = getArticleChatError(error)
  }
}

async function removeSummaryConversation(item: ArticleConversationItem) {
  if (summaryDialogLoading.value || !window.confirm(`确定删除会话“${item.title}”吗？删除后无法恢复。`)) return
  try {
    await $fetch(`/api/posts/${post.value.slug}/chat/conversations/${item.id}`, { method: 'DELETE' })
    summaryHistoryItems.value = summaryHistoryItems.value.filter(conversation => conversation.id !== item.id)
    summaryHistoryTotal.value = Math.max(0, summaryHistoryTotal.value - 1)
    if (item.id === summaryConversationId.value) {
      summaryConversationId.value = null
      summaryMessages.value = []
      summaryDialogError.value = ''
    }
  } catch (error: unknown) {
    summaryDialogError.value = getArticleChatError(error)
  }
}

function conversationDateGroup(value: string) {
  const date = new Date(value)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(date); target.setHours(0, 0, 0, 0)
  const days = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (days === 0) return '今天'
  if (days <= 7) return '最近 7 天'
  return '更早'
}

function formatConversationTime(value: string) {
  const date = new Date(value)
  return conversationDateGroup(value) === '今天'
    ? date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function goToArticleCitation(citation: ArticleChatCitation) {
  const headingName = citation.headingPath?.split('/').at(-1)?.trim()
  const headings = [...document.querySelectorAll<HTMLElement>('.prose-blog h1, .prose-blog h2, .prose-blog h3')]
  const target = headingName
    ? headings.find(heading => normalizeHeadingText(heading.textContent) === normalizeHeadingText(headingName))
    : document.querySelector<HTMLElement>('.prose-blog')

  closeSummaryDialog()
  window.requestAnimationFrame(() => {
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (target) window.setTimeout(() => target.focus({ preventScroll: true }), 450)
  })
}

function normalizeHeadingText(value?: string | null) {
  return (value || '').replace(/\s+/g, '').replace(/[＃#]/g, '').trim()
}

function focusSummaryDialogInput() {
  summaryDialogInput.value?.focus()
}

function handleSummaryDialogEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && summaryDialogOpen.value) closeSummaryDialog()
}

async function restoreSummaryConversation() {
  try {
    const response = await $fetch<{ data: { conversation: { id: number } | null, messages: ArticleChatMessage[] } }>(`/api/posts/${post.value.slug}/chat`)
    summaryConversationId.value = response.data.conversation?.id || null
    summaryMessages.value = response.data.messages
  } catch {
    summaryMessages.value = []
  }
}

async function sendSummaryDialogMessage() {
  const question = summaryDialogDraft.value.trim()
  if (!question || summaryDialogLoading.value) return
  summaryDialogDraft.value = ''
  await submitSummaryQuestion(question)
}

async function submitSummaryQuestion(question: string) {
  if (summaryDialogLoading.value) return
  const temporaryId = `pending-${Date.now()}`
  const assistantTemporaryId = `stream-${Date.now()}`
  summaryMessages.value.push({ id: temporaryId, role: 'USER', content: question, status: 'COMPLETED', citations: [] })
  summaryDialogLoading.value = true
  summaryDialogError.value = ''
  summaryDialogController = new AbortController()
  await scrollSummaryMessages()
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(post.value.slug)}/chat/stream`, {
      method: 'POST',
      signal: summaryDialogController.signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ conversationId: summaryConversationId.value || undefined, message: question })
    })
    if (!response.ok || !response.body) throw new Error(await readStreamHttpError(response))
    summaryMessages.value.push({ id: assistantTemporaryId, role: 'ASSISTANT', content: '', status: 'COMPLETED', citations: [] })
    await consumeArticleChatStream(response.body, {
      meta: (data) => {
        const payload = data as { conversation: { id: number }, userMessage: ArticleChatMessage }
        summaryConversationId.value = payload.conversation.id
        const index = summaryMessages.value.findIndex(item => item.id === temporaryId)
        if (index >= 0) summaryMessages.value[index] = payload.userMessage
      },
      delta: (data) => {
        const message = summaryMessages.value.find(item => item.id === assistantTemporaryId)
        if (message) message.content += String((data as { text?: string }).text || '')
        void scrollSummaryMessages(false)
      },
      done: (data) => {
        const payload = data as { assistantMessage: ArticleChatMessage }
        const index = summaryMessages.value.findIndex(item => item.id === assistantTemporaryId)
        if (index >= 0) summaryMessages.value[index] = payload.assistantMessage
      },
      error: data => { throw new Error(String((data as { message?: string }).message || '回答生成失败，请稍后重试')) }
    })
  } catch (error: unknown) {
    if (summaryDialogController?.signal.aborted) summaryDialogError.value = '已停止本次回答'
    else summaryDialogError.value = error instanceof Error ? error.message : getArticleChatError(error)
    const partial = summaryMessages.value.find(item => item.id === assistantTemporaryId)
    if (partial && !partial.content) summaryMessages.value = summaryMessages.value.filter(item => item.id !== assistantTemporaryId)
  } finally {
    summaryDialogLoading.value = false
    summaryDialogController = null
    await scrollSummaryMessages()
  }
}

function stopSummaryDialogRequest() {
  summaryDialogController?.abort()
}

async function resetSummaryConversation() {
  if (summaryDialogLoading.value || !summaryConversationId.value) return
  summaryHistoryOpen.value = false
  try {
    await $fetch(`/api/posts/${post.value.slug}/chat`, { method: 'DELETE', body: { conversationId: summaryConversationId.value } })
    summaryConversationId.value = null
    summaryMessages.value = []
    summaryDialogError.value = ''
    summaryDialogDraft.value = ''
    await nextTick()
    summaryDialogInput.value?.focus()
  } catch (error: unknown) {
    summaryDialogError.value = getArticleChatError(error)
  }
}

async function retrySummaryQuestion() {
  if (summaryDialogLoading.value) return
  const lastUser = [...summaryMessages.value].reverse().find(item => item.role === 'USER')
  if (!lastUser) return
  if (typeof lastUser.id === 'string' && lastUser.id.startsWith('pending-')) summaryMessages.value = summaryMessages.value.filter(item => item.id !== lastUser.id)
  await submitSummaryQuestion(lastUser.content)
}

async function scrollSummaryMessages(smooth = true) {
  await nextTick()
  summaryMessagesEl.value?.scrollTo({ top: summaryMessagesEl.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

async function consumeArticleChatStream(
  body: ReadableStream<Uint8Array>,
  handlers: Record<'meta' | 'delta' | 'done' | 'error', (data: unknown) => void>
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    for (const block of events) {
      const eventName = block.match(/^event:\s*(.+)$/m)?.[1]?.trim() as keyof typeof handlers | undefined
      const dataText = block.match(/^data:\s*(.+)$/m)?.[1]
      if (eventName && dataText && handlers[eventName]) handlers[eventName](JSON.parse(dataText))
    }
    if (done) break
  }
}

async function readStreamHttpError(response: Response) {
  const payload = await response.json().catch(() => null) as { statusMessage?: string, message?: string, data?: { message?: string } } | null
  return payload?.data?.message || payload?.statusMessage || payload?.message || '无法建立流式连接'
}

function getArticleChatError(error: unknown) {
  const candidate = error as { data?: { statusMessage?: string, message?: string, data?: { message?: string } }, statusMessage?: string }
  return candidate.data?.data?.message || candidate.data?.statusMessage || candidate.data?.message || candidate.statusMessage || '回答生成失败，请稍后重试'
}

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : ''
}

function relationTypeLabel(type: string) {
  const labels: Record<string, string> = {
    PREREQUISITE: '前置阅读',
    EXTENSION: '延伸阅读',
    SAME_TOPIC: '同主题',
    PRACTICE: '实战补充',
    BACKGROUND: '背景知识'
  }

  return labels[type] || '推荐'
}

function updatePostSidebarStickyTop() {
  const baseTop = 84

  if (window.matchMedia('(max-width: 900px)').matches) {
    postSidebarStickyTop.value = `${baseTop}px`
    return
  }

  const sidebar = document.querySelector<HTMLElement>('.post-sidebar')
  const toc = sidebar?.querySelector<HTMLElement>('.toc-card')

  if (!sidebar || !toc) {
    postSidebarStickyTop.value = `${baseTop}px`
    return
  }

  postSidebarStickyTop.value = `${baseTop - toc.offsetTop}px`
}

function setupTocObserver() {
  const tocItems = post.value.rendered.toc || []
  if (!tocItems.length || !('IntersectionObserver' in window)) {
    activeTocId.value = tocItems[0]?.id || ''
    return
  }

  const visibleHeadingIds = new Set<string>()
  const headingMap = new Map<string, Element>()

  tocObserver?.disconnect()
  activeTocId.value = tocItems[0]?.id || ''

  for (const item of tocItems) {
    const heading = document.getElementById(item.id)
    if (!heading) continue
    headingMap.set(item.id, heading)
  }

  tocObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = entry.target.id
      if (!id) continue

      if (entry.isIntersecting) {
        visibleHeadingIds.add(id)
      } else {
        visibleHeadingIds.delete(id)
      }
    }

    const activeId = [...visibleHeadingIds].sort((a, b) => {
      const headingA = headingMap.get(a)
      const headingB = headingMap.get(b)
      if (!headingA || !headingB) return 0
      return headingA.compareDocumentPosition(headingB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })[0]

    if (activeId) {
      activeTocId.value = activeId
      return
    }

    const passedHeading = [...headingMap.entries()]
      .filter(([, heading]) => heading.getBoundingClientRect().top <= 120)
      .pop()
    activeTocId.value = passedHeading?.[0] || tocItems[0]?.id || ''
  }, {
    rootMargin: '-12% 0px -58% 0px',
    threshold: [0, 1]
  })

  for (const heading of headingMap.values()) {
    tocObserver.observe(heading)
  }

  nextTick(updateTocIndicatorPosition)
}

function updateTocIndicatorPosition() {
  if (!activeTocId.value) return

  const links = document.querySelectorAll<HTMLElement>('.toc-card-elegant .toc-list a')
  const activeLink = Array.from(links).find((link) => link.dataset.tocId === activeTocId.value)
  if (!activeLink) return

  const indicatorHeight = 20
  activeTocOffset.value = activeLink.offsetTop + (activeLink.offsetHeight - indicatorHeight) / 2
}
</script>

<style scoped>
.post-page {
  min-height: 100vh;
  background: var(--theme-page);
  color: var(--theme-text);
}

.post-hero {
  min-height: 400px;
  margin-top: -70px;
  padding: 108px 0 58px;
  color: white;
}

.post-hero-inner {
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
}

.post-kicker {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
  color: rgb(255 255 255 / 86%);
  font-size: 15px;
  font-weight: 500;
}

.post-kicker a:first-child {
  padding: 5px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-surface) 18%, transparent);
  color: white;
  font-weight: 800;
}

.post-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 72px;
  align-items: center;
}

.post-hero-copy h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(34px, 3.6vw, 52px);
  font-weight: 900;
  line-height: 1.2;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 36px;
  font-size: 15px;
  font-weight: 500;
}

.post-meta span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-surface) 18%, transparent);
}

.post-meta-icon {
  flex: 0 0 auto;
}

.post-cover-card {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 26px 56px rgb(91 11 65 / 22%);
}

.post-cover-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  display: grid;
  place-items: center;
  color: rgb(255 255 255 / 72%);
  text-align: center;
}

.cover-fallback span {
  font-size: 48px;
  font-weight: 900;
}

.cover-fallback strong {
  margin-top: 8px;
  color: white;
  font-size: 18px;
}

.post-shell {
  position: relative;
  isolation: isolate;
  display: grid;
  width: min(100% - 32px, 1290px);
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;
  margin: -24px auto 72px;
  padding-top: 42px;
}

.post-shell::before {
  position: absolute;
  inset: 0 auto -72px 50%;
  z-index: -1;
  width: 100vw;
  border-radius: 24px 24px 0 0;
  background: var(--theme-page);
  content: "";
  transform: translateX(-50%);
}

.post-main {
  min-width: 0;
}

.summary-card,
.content-card,
.continue-card,
.toc-card,
.info-card,
.post-pager a {
  border: 1px solid var(--theme-border);
  border-radius: 10px;
  background: var(--theme-surface);
}

.summary-card {
  padding: 12px 16px;
  background: var(--theme-surface-muted);
}

.summary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-heading small {
  color: #6a6f7a;
  font-size: 14px;
  font-weight: 500;
}

.summary-title {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #a14b40;
  cursor: pointer;
  font-size: 15px;
  font-weight: 900;
  outline: none;
}

.summary-title :deep(svg) {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
}

.summary-title-icon {
  width: 20px;
  height: 20px;
  font-size: 20px;
}

.summary-title-arrow {
  color: #d1aaa5;
}

.summary-title :deep(.summary-title-icon svg) {
  width: 20px;
  height: 20px;
}

.summary-tooltip {
  position: absolute;
  bottom: calc(100% + 14px);
  left: 50%;
  z-index: 4;
  width: max-content;
  max-width: 220px;
  padding: 10px 18px;
  border: 1px solid var(--theme-border);
  border-radius: 14px;
  background: var(--theme-surface);
  box-shadow: 0 14px 32px rgb(15 23 42 / 10%);
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 6px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.summary-tooltip::after {
  position: absolute;
  top: 100%;
  left: 50%;
  width: 12px;
  height: 12px;
  border-right: 1px solid var(--theme-border);
  border-bottom: 1px solid var(--theme-border);
  background: var(--theme-surface);
  content: "";
  transform: translate(-50%, -6px) rotate(45deg);
}

.summary-title:hover .summary-tooltip,
.summary-title:focus-visible .summary-tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.summary-body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  margin-top: 10px;
  padding: 0 8px;
}

.summary-thumb {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid #e2e8f4;
  background: var(--theme-surface-muted);
  color: #a14b40;
  font-size: 16px;
  font-weight: 900;
}

.summary-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.summary-body p {
  margin: 0;
  color: var(--theme-text);
  font-size: 18px;
  line-height: 1.45;
}

.summary-chat-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 8px;
}

.summary-chat-form input {
  width: 100%;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-surface);
  color: var(--theme-text);
  font: inherit;
  font-size: 14px;
  outline: none;
  padding: 0 16px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.summary-chat-form input::placeholder {
  color: #7d838d;
}

.summary-chat-form input:focus {
  border-color: #b9c8dd;
  box-shadow: 0 0 0 3px rgb(92 118 153 / 12%);
}

.summary-chat-form button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-surface);
  color: var(--theme-text);
  font: inherit;
  font-size: 14px;
  padding: 0 16px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.summary-chat-form button:hover,
.summary-chat-form button:focus-visible {
  border-color: #b9c8dd;
  box-shadow: 0 0 0 3px rgb(92 118 153 / 12%);
}

.summary-chat-form button:active {
  transform: translateY(1px);
}

.summary-chat-form button :deep(svg) {
  width: 15px;
  height: 15px;
}

.summary-chat-form button:disabled { opacity: .48; cursor: not-allowed; box-shadow: none; }
.summary-dialog-backdrop { position: fixed; inset: 0; z-index: 80; background: rgb(28 34 45 / 16%); backdrop-filter: blur(12px); }
.summary-dialog-stage { position: fixed; inset: 0; z-index: 81; display: grid; place-items: center; padding: 24px; pointer-events: none; }
.summary-dialog { position: relative; display: flex; width: min(680px, 100%); height: min(750px, 80vh); overflow: hidden; flex-direction: column; border: 1px solid rgb(255 255 255 / 68%); border-radius: 30px; background: color-mix(in srgb, var(--theme-surface) 88%, transparent); box-shadow: 0 30px 80px -20px rgb(32 40 55 / 24%), 0 0 0 1px rgb(49 57 72 / 4%); backdrop-filter: blur(28px) saturate(125%); pointer-events: auto; }
.summary-dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 17px 20px 16px 22px; }
.summary-dialog-identity { display: flex; align-items: center; gap: 11px; }
.summary-dialog-identity>span { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: linear-gradient(145deg,#b65348,#d17b68); color: #fff; box-shadow: 0 6px 16px rgb(182 83 72 / 22%); }
.summary-dialog-identity>span :deep(svg) { width: 17px; height: 17px; }
.summary-dialog-identity strong,.summary-dialog-identity small { display: block; }
.summary-dialog-identity strong { color: var(--theme-text); font-size: 14px; letter-spacing: .02em; }
.summary-dialog-identity small { margin-top: 2px; color: #9298a2; font-size: 11px; }
.summary-dialog-head-actions { display: flex; gap: 7px; }.summary-dialog-head-actions button { display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 50%; background: var(--theme-surface-muted); color: var(--theme-text-faint); cursor: pointer; transition: background .18s ease,color .18s ease,transform .18s ease; }
.summary-dialog-head-actions button:hover { background: var(--theme-border-soft); color: var(--theme-text-soft); transform: translateY(-1px); }
.summary-dialog-head-actions button.is-active { background: #f5e9e7; color: #a64f45; }
.summary-dialog-head-actions button :deep(svg) { width: 17px; height: 17px; }
.summary-dialog-rule { height: 1px; flex: 0 0 auto; background: linear-gradient(90deg,transparent,var(--theme-border-soft) 18%,var(--theme-border-soft) 82%,transparent); }
.summary-history-drawer { position: absolute; top: 68px; bottom: 0; left: 0; z-index: 4; display: flex; width: min(310px, 72%); overflow: hidden; flex-direction: column; border-right: 1px solid rgb(222 218 218 / 72%); background: rgb(249 249 250 / 88%); box-shadow: 18px 0 42px rgb(44 38 38 / 9%); backdrop-filter: blur(24px) saturate(120%); }
.summary-history-drawer>header { display: flex; align-items: center; justify-content: space-between; padding: 20px 18px 12px; }
.summary-history-drawer>header strong,.summary-history-drawer>header small { display: block; }.summary-history-drawer>header strong { color: var(--theme-text); font-size: 14px; }.summary-history-drawer>header small { margin-top: 3px; color: #9a9fa8; font-size: 10px; }
.summary-history-drawer>header button { display: grid; width: 28px; height: 28px; place-items: center; border: 0; border-radius: 50%; background: transparent; color: var(--theme-text-faint); cursor: pointer; }.summary-history-drawer>header button:hover { background: var(--theme-surface-hover); color: var(--theme-text-soft); }.summary-history-drawer>header button :deep(svg) { width: 14px; height: 14px; }
.summary-history-search { display: flex; align-items: center; gap: 8px; margin: 0 14px 12px; border: 1px solid var(--theme-border-soft); border-radius: 12px; background: color-mix(in srgb, var(--theme-surface) 78%, transparent); color: var(--theme-text-faint); padding: 0 11px; }.summary-history-search:focus-within { border-color: #d9b1aa; box-shadow: 0 0 0 3px rgb(182 83 72 / 6%); }.summary-history-search :deep(svg) { width: 14px; height: 14px; }.summary-history-search input { width: 100%; height: 36px; border: 0; background: transparent; color: var(--theme-text); font: inherit; font-size: 12px; outline: 0; }
.summary-history-list { flex: 1; overflow-y: auto; padding: 0 10px 14px; scrollbar-width: thin; scrollbar-color: #dfe1e5 transparent; }.summary-history-list section+section { margin-top: 15px; }.summary-history-list h3 { margin: 0 8px 6px; color: #a1a5ad; font-size: 9px; font-weight: 800; letter-spacing: .08em; }
.summary-history-list article { position: relative; display: flex; align-items: center; border-radius: 13px; transition: background .18s ease; }.summary-history-list article:hover,.summary-history-list article.is-current { background: rgb(238 231 230 / 72%); }.summary-history-list article.is-current::before { position: absolute; top: 12px; bottom: 12px; left: 0; width: 2px; border-radius: 2px; background: #b65348; content: ''; }
.summary-history-main { display: grid; min-width: 0; flex: 1; grid-template-columns: 30px minmax(0,1fr); align-items: center; gap: 9px; border: 0; background: transparent; cursor: pointer; padding: 9px 7px 9px 10px; text-align: left; }.summary-history-main>span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 10px; background: color-mix(in srgb, var(--theme-surface) 72%, transparent); color: #a8645c; }.summary-history-main>span :deep(svg) { width: 14px; height: 14px; }.summary-history-main div { min-width: 0; }.summary-history-main strong,.summary-history-main small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.summary-history-main strong { color: var(--theme-text-soft); font-size: 11px; font-weight: 680; }.summary-history-main small { margin-top: 4px; color: var(--theme-text-faint); font-size: 9px; }
.summary-history-delete { display: grid; width: 28px; height: 28px; flex: 0 0 auto; place-items: center; margin-right: 6px; border: 0; border-radius: 9px; background: transparent; color: transparent; cursor: pointer; }.summary-history-list article:hover .summary-history-delete { color: #a8a1a1; }.summary-history-delete:hover { background: color-mix(in srgb, var(--theme-surface) 72%, transparent); color: #b65348!important; }.summary-history-delete :deep(svg) { width: 13px; height: 13px; }
.summary-history-more { width: calc(100% - 16px); margin: 12px 8px 0; border: 1px solid var(--theme-border-soft); border-radius: 10px; background: color-mix(in srgb, var(--theme-surface) 65%, transparent); color: var(--theme-text-muted); cursor: pointer; font-size: 10px; padding: 8px; }.summary-history-state,.summary-history-empty { display: flex; min-height: 220px; align-items: center; justify-content: center; flex-direction: column; color: var(--theme-text-faint); font-size: 11px; }.summary-history-state :deep(svg) { width: 18px; height: 18px; margin-bottom: 8px; animation: summary-history-spin .9s linear infinite; }.summary-history-empty>span { display: grid; width: 42px; height: 42px; margin-bottom: 11px; place-items: center; border-radius: 14px; background: var(--theme-surface-hover); color: var(--theme-text-faint); }.summary-history-empty>span :deep(svg) { width: 19px; height: 19px; }.summary-history-empty strong { color: var(--theme-text-muted); font-size: 12px; }.summary-history-empty small { margin-top: 5px; font-size: 9px; }
.summary-history-enter-active,.summary-history-leave-active { transition: opacity .24s ease,transform .28s cubic-bezier(.22,1,.36,1); }.summary-history-enter-from,.summary-history-leave-to { opacity: 0; transform: translateX(-20px); }
@keyframes summary-history-spin { to { transform: rotate(360deg); } }
.summary-dialog-messages { display: flex; flex: 1; overflow-y: auto; flex-direction: column; gap: 28px; padding: 32px 26px; scrollbar-width: thin; scrollbar-color: #dfe2e7 transparent; }
.summary-dialog-message { display: flex; width: 100%; }
.summary-dialog-avatar { display: grid; width: 32px; height: 32px; flex: 0 0 auto; place-items: center; border: 1px solid var(--theme-border-soft); border-radius: 50%; background: var(--theme-surface-raised); color: #b65348; }
.summary-dialog-avatar :deep(svg) { width: 16px; height: 16px; }
.summary-dialog-message p { margin: 0; font-size: 15px; line-height: 1.72; }
.summary-dialog-message.is-assistant { max-width: 88%; align-items: flex-start; gap: 13px; color: #555b65; }
.summary-dialog-message.is-assistant p { padding-top: 4px; }
.summary-dialog-message.is-user { justify-content: flex-end; }
.summary-dialog-message.is-user p { max-width: 76%; border-radius: 18px 18px 4px 18px; background: var(--theme-surface-hover); color: var(--theme-text); padding: 11px 16px; }
.summary-dialog-message-copy { min-width: 0; }
.summary-dialog-message.is-user .summary-dialog-message-copy { display: flex; justify-content: flex-end; width: 100%; }
.summary-dialog-citations { width: min(100%, 390px); margin-top: 12px; }
.summary-dialog-citations summary { display: inline-flex; align-items: center; gap: 6px; min-height: 30px; border: 1px solid rgb(182 83 72 / 12%); border-radius: 999px; background: rgb(248 238 238 / 72%); color: #985148; cursor: pointer; font-size: 11px; font-weight: 750; list-style: none; padding: 0 10px; transition: border-color .18s ease,background .18s ease,transform .18s ease; }
.summary-dialog-citations summary::-webkit-details-marker { display: none; }
.summary-dialog-citations summary:hover { border-color: rgb(182 83 72 / 24%); background: rgb(248 238 238 / 95%); transform: translateY(-1px); }
.summary-dialog-citations summary>small { display: grid; min-width: 18px; height: 18px; place-items: center; border-radius: 999px; background: color-mix(in srgb, var(--theme-surface) 72%, transparent); color: #a85b51; font-size: 9px; }
.summary-dialog-citations summary :deep(svg) { width: 12px; height: 12px; }
.summary-dialog-citations .citation-chevron { margin-left: 1px; transition: transform .2s ease; }
.summary-dialog-citations[open] .citation-chevron { transform: rotate(180deg); }
.summary-dialog-citation-list { display: grid; gap: 4px; margin-top: 7px; padding: 5px; border: 1px solid rgb(224 217 216 / 72%); border-radius: 14px; background: color-mix(in srgb, var(--theme-surface) 66%, transparent); box-shadow: 0 8px 24px rgb(57 47 45 / 6%); backdrop-filter: blur(12px); }
.summary-dialog-citation-list button { display: grid; grid-template-columns: 20px minmax(0,1fr) 16px; align-items: center; gap: 8px; width: 100%; border: 0; border-radius: 10px; background: transparent; color: var(--theme-text-muted); cursor: pointer; padding: 8px; text-align: left; transition: background .18s ease,color .18s ease; }
.summary-dialog-citation-list button:hover { background: rgb(248 238 238 / 72%); color: #974d45; }
.summary-dialog-citation-list button>span { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 7px; background: #f5f1f1; color: #a75a50; font-size: 9px; font-weight: 800; }
.summary-dialog-citation-list strong { overflow: hidden; font-size: 11px; font-weight: 650; line-height: 1.45; text-overflow: ellipsis; white-space: nowrap; }
.summary-dialog-citation-list :deep(svg) { width: 13px; height: 13px; color: #b3a5a3; }
.summary-dialog-pending { display: flex; align-items: center; gap: 12px; color: #9ba1aa; }
.summary-dialog-pending>div { display: flex; gap: 4px; }
.summary-dialog-pending i { width: 6px; height: 6px; border-radius: 50%; background: #c47263; animation: summary-dialog-dot 1.15s infinite ease-in-out; }
.summary-dialog-pending i:nth-child(2) { animation-delay: 140ms; }.summary-dialog-pending i:nth-child(3) { animation-delay: 280ms; }
.summary-dialog-pending small { font-size: 11px; }
.summary-dialog-error { display: flex; align-items: center; gap: 8px; border-radius: 12px; background: var(--theme-danger-soft); color: #b5544b; font-size: 12px; padding: 10px 12px; }
.summary-dialog-error :deep(svg) { width: 15px; height: 15px; }
.summary-dialog-error button { margin-left: auto; border: 0; border-radius: 8px; background: var(--theme-surface); color: #a4473e; cursor: pointer; font-size: 11px; font-weight: 800; padding: 5px 9px; }
.summary-dialog-footer { flex: 0 0 auto; padding: 14px 18px 16px; }
.summary-dialog-composer { display: flex; align-items: flex-end; gap: 8px; border: 1px solid var(--theme-border-soft); border-radius: 22px; background: var(--theme-surface-muted); padding: 6px; transition: background .18s ease,border-color .18s ease,box-shadow .18s ease; }
.summary-dialog-composer:focus-within { border-color: #d5aaa2; background: var(--theme-surface); box-shadow: 0 0 0 4px rgb(182 83 72 / 7%); }
.summary-dialog-composer textarea { width: 100%; min-height: 38px; max-height: 116px; resize: none; border: 0; background: transparent; color: var(--theme-text); font: inherit; font-size: 14px; line-height: 1.5; outline: none; padding: 9px 10px 7px; }
.summary-dialog-composer button { display: grid; width: 36px; height: 36px; flex: 0 0 auto; place-items: center; border: 0; border-radius: 50%; background: #b65348; color: #fff; cursor: pointer; transition: opacity .18s ease,transform .18s ease,background .18s ease; }
.summary-dialog-composer button:hover { background: #a4473e; transform: scale(1.04); }.summary-dialog-composer button:disabled { background: #c7cbd1; cursor: not-allowed; opacity: .55; transform: none; }.summary-dialog-composer button.is-stop { background: #737a85; }
.summary-dialog-composer button :deep(svg) { width: 16px; height: 16px; }
.summary-dialog-footer>p { margin: 9px 0 0; color: var(--theme-text-faint); font-size: 10px; letter-spacing: .02em; text-align: center; }
.summary-dialog-backdrop-enter-active,.summary-dialog-backdrop-leave-active { transition: opacity 420ms cubic-bezier(.22,1,.36,1); }.summary-dialog-backdrop-enter-from,.summary-dialog-backdrop-leave-to { opacity: 0; }
.summary-dialog-panel-enter-active,.summary-dialog-panel-leave-active { transition: opacity 460ms cubic-bezier(.34,1.56,.64,1),transform 460ms cubic-bezier(.34,1.56,.64,1); }.summary-dialog-panel-enter-from,.summary-dialog-panel-leave-to { opacity: 0; transform: translateY(18px) scale(.965); }
@keyframes summary-dialog-dot { 0%,70%,100% { transform: translateY(0); opacity: .42; } 35% { transform: translateY(-4px); opacity: 1; } }

.content-card {
  margin-top: 14px;
  padding: 40px 24px;
}

.content-card :deep(.prose-blog) {
  max-width: 94ch;
}

.content-card :deep(.md-editor-code.is-code-collapsed pre) {
  max-height: 480px;
  overflow-x: auto;
  overflow-y: hidden;
}

.content-card :deep(.md-editor-code.is-code-collapsed::after) {
  position: absolute;
  right: 0;
  bottom: 42px;
  left: 0;
  height: 88px;
  background: linear-gradient(to bottom, transparent, #282c34);
  content: '';
  pointer-events: none;
}

.content-card :deep(.code-collapse-toggle) {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-top: 1px solid rgb(255 255 255 / 8%);
  background: #242830;
  color: #cbd5e1;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.content-card :deep(.code-collapse-toggle:hover),
.content-card :deep(.code-collapse-toggle:focus-visible) {
  background: #303640;
  color: #fff;
  outline: none;
}

.post-main > .content-card:first-child {
  margin-top: 0;
}

.continue-card {
  margin-top: 14px;
  padding: 18px;
}

.continue-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.continue-heading span {
  color: var(--theme-text);
  font-size: 18px;
  font-weight: 900;
}

.continue-heading small {
  color: var(--theme-text-faint);
  font-size: 12px;
  font-weight: 800;
}

.continue-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.continue-item {
  display: grid;
  gap: 7px;
  border: 1px solid #e6edf7;
  border-radius: 8px;
  background: var(--theme-surface-muted);
  padding: 14px;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.continue-item:hover {
  border-color: #c9d7ea;
  background: var(--theme-surface);
  transform: translateY(-1px);
}

.continue-type {
  width: fit-content;
  border-radius: 999px;
  background: var(--theme-accent-soft);
  color: #4f46e5;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 850;
}

.continue-item strong {
  color: var(--theme-text-strong);
  font-size: 16px;
}

.continue-item p {
  margin: 0;
  color: #5f6673;
  font-size: 14px;
  line-height: 1.65;
}

.post-pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.post-pager a {
  display: block;
  padding: 18px;
}

.post-pager-prev {
  grid-column: 1;
}

.post-pager-next {
  grid-column: 2;
  text-align: right;
}

.post-pager span {
  color: var(--theme-text-faint);
  font-size: 12px;
  font-weight: 800;
}

.post-pager strong {
  display: block;
  margin-top: 6px;
  color: var(--theme-text);
}

.post-sidebar {
  position: sticky;
  top: var(--post-sidebar-sticky-top, 84px);
  align-self: start;
  display: grid;
  gap: 10px;
}

.author-card {
  display: grid;
  height: 154px;
  grid-template-columns: 72px minmax(0, 1fr);
  grid-template-rows: 1fr auto auto;
  column-gap: 14px;
  align-items: center;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(135deg, #c7439e, #a51f76);
  color: white;
  padding: 16px 18px;
  box-shadow: 0 18px 40px rgb(96 18 70 / 16%);
}

.author-avatar {
  display: grid;
  width: 72px;
  height: 72px;
  grid-row: 1 / 4;
  place-items: center;
  margin: 0;
  border: 4px solid rgb(255 255 255 / 72%);
  border-radius: 999px;
  background: #121318;
  box-shadow: 0 12px 26px rgb(74 10 54 / 18%);
  font-size: 32px;
  font-weight: 900;
}

.author-card h2 {
  margin: 0;
  align-self: end;
  font-size: 18px;
  font-weight: 900;
}

.author-card p {
  margin: 4px 0 12px;
  color: rgb(255 255 255 / 82%);
  font-size: 13px;
}

.author-actions {
  display: flex;
  gap: 8px;
  align-self: end;
}

.author-actions a {
  flex: 1;
  padding: 8px 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-surface) 18%, transparent);
  text-align: center;
  font-size: 13px;
  font-weight: 800;
}

.info-card {
  padding: 16px;
}

.info-card h2 {
  margin: 0 0 12px;
  color: var(--theme-text);
  font-size: 15px;
  font-weight: 900;
}

.toc-card.toc-card-elegant {
  position: relative;
  overflow: hidden;
  padding: 0;
  border-color: var(--theme-border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--theme-surface) 82%, transparent);
  box-shadow: 0 8px 30px rgb(15 23 42 / 5%);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.toc-card-elegant .toc-card-inner {
  padding: 22px;
}

.toc-card-elegant .toc-card-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--theme-border-soft) 80%, transparent);
}

.toc-card-elegant .toc-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: #fdf8f6;
  color: #826561;
}

.toc-card-elegant .toc-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.toc-card-elegant .toc-card-heading h2 {
  margin: 0;
  color: var(--theme-text-strong);
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0;
}

.toc-card-elegant .toc-list-wrap {
  position: relative;
}

.toc-card-elegant .toc-guide {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 7px;
  width: 2px;
  border-radius: 999px;
  background: var(--theme-surface-hover);
}

.toc-card-elegant .toc-active-line {
  position: absolute;
  top: 0;
  left: 7px;
  z-index: 2;
  width: 2px;
  height: 20px;
  border-radius: 999px;
  background: #9b7e7a;
  transition: transform .24s cubic-bezier(.4, 0, .2, 1);
}

.toc-card-elegant .toc-list {
  position: relative;
  z-index: 3;
  display: grid;
  gap: 7px;
}

.toc-card-elegant .toc-list a {
  position: relative;
  display: block;
  overflow: hidden;
  padding: 6px 12px 6px 26px;
  border-radius: 0 10px 10px 0;
  color: var(--theme-text-muted);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  transition: background .18s ease, color .18s ease;
  white-space: nowrap;
}

.toc-card-elegant .toc-list a::before {
  position: absolute;
  top: 50%;
  left: 4px;
  width: 8px;
  height: 8px;
  border: 2px solid #d8e0eb;
  border-radius: 999px;
  background: var(--theme-surface);
  content: "";
  transform: translateY(-50%);
  transition: border-color .18s ease, background .18s ease;
}

.toc-card-elegant .toc-list a:hover,
.toc-card-elegant .toc-list a:focus-visible,
.toc-card-elegant .toc-list a.is-active {
  background: var(--theme-surface-muted);
  color: #826561;
  outline: none;
}

.toc-card-elegant .toc-list a:hover::before,
.toc-card-elegant .toc-list a:focus-visible::before,
.toc-card-elegant .toc-list a.is-active::before {
  border-color: #9b7e7a;
  background: #9b7e7a;
}

.toc-card-elegant .toc-list a.is-active {
  font-weight: 900;
}

.toc-card-elegant .toc-list a.is-child {
  margin-left: 16px;
  padding-left: 24px;
  color: #7b8797;
  font-size: 12.5px;
  font-weight: 600;
}

.toc-card-elegant .toc-list a.is-child.is-active {
  color: #826561;
  font-weight: 800;
}

.toc-card-elegant p {
  margin: 0;
  color: var(--theme-text-muted);
  font-size: 13px;
  font-weight: 700;
}

.info-card p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0 0;
  color: var(--theme-text-muted);
  font-size: 13px;
}

.info-card strong {
  color: var(--theme-text);
}

.return-card {
  display: block;
  padding: 14px 16px;
  border-radius: 10px;
  background: #b32683;
  color: white;
  text-align: center;
  font-weight: 900;
}

@media (max-width: 900px) {
  .post-hero-grid {
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 36px;
  }

  .post-shell {
    grid-template-columns: 1fr;
  }

  .summary-body {
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .post-cover-card {
    max-width: 320px;
  }

  .post-sidebar {
    position: static;
  }

  .author-card {
    height: auto;
    min-height: 154px;
  }
}

@media (max-width: 640px) {
  .post-hero {
    margin-top: -70px;
    min-height: 0;
    padding: 92px 0 48px;
  }

  .post-hero-inner {
    width: min(100% - 28px, 560px);
  }

  .post-hero-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
    text-align: center;
  }

  .post-hero-copy {
    display: contents;
  }

  .post-cover-card {
    order: 1;
    width: min(46vw, 190px);
    max-width: none;
    aspect-ratio: 1;
    justify-self: center;
    border-radius: 28px;
    box-shadow:
      inset 0 0 0 10px rgb(255 255 255 / 12%),
      0 28px 60px rgb(24 25 33 / 18%);
  }

  .post-cover-card img {
    border: 10px solid rgb(255 255 255 / 18%);
    border-radius: inherit;
  }

  .cover-fallback {
    width: 100%;
    height: 100%;
    border: 10px solid rgb(255 255 255 / 18%);
    border-radius: inherit;
    background: color-mix(in srgb, var(--theme-surface) 18%, transparent);
  }

  .cover-fallback span {
    max-width: 82%;
    font-size: clamp(28px, 9vw, 42px);
    line-height: 1.08;
  }

  .cover-fallback strong {
    font-size: 14px;
  }

  .post-kicker {
    order: 2;
    justify-content: center;
    gap: 10px;
    margin: 4px auto 0;
    font-size: 14px;
  }

  .post-kicker a {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 13px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--theme-surface) 16%, transparent);
    color: white;
  }

  .post-kicker a:first-child {
    padding: 0 13px;
  }

  .post-hero-copy h1 {
    order: 3;
    max-width: 12em;
    justify-self: center;
    font-size: clamp(24px, 7.4vw, 34px);
    line-height: 1.22;
    text-wrap: balance;
  }

  .post-meta {
    order: 4;
    justify-content: center;
    gap: 10px;
    margin-top: 0;
    font-size: 13px;
  }

  .post-meta span {
    min-height: 36px;
    padding: 0 13px;
    background: color-mix(in srgb, var(--theme-surface) 18%, transparent);
    color: rgb(255 255 255 / 94%);
    white-space: nowrap;
  }

  .post-shell {
    width: min(100% - 20px, 560px);
    margin-top: -18px;
    padding-top: 30px;
  }

  .post-shell::before {
    border-radius: 22px 22px 0 0;
  }

  .post-sidebar {
    gap: 0;
  }

  .post-sidebar :deep(.toc-card),
  .post-sidebar :deep(.sidebar-section),
  .post-sidebar :deep(.info-card) {
    display: none;
  }

  .summary-body,
  .summary-chat-form,
  .post-pager {
    grid-template-columns: 1fr;
  }

  .summary-card {
    padding: 12px;
  }

  .summary-heading small {
    font-size: 13px;
  }

  .summary-title {
    gap: 5px;
    font-size: 14px;
  }

  .summary-title :deep(svg) {
    width: 17px;
    height: 17px;
  }

  .summary-title-icon,
  .summary-title :deep(.summary-title-icon svg) {
    width: 19px;
    height: 19px;
    font-size: 19px;
  }

  .summary-body {
    gap: 12px;
    align-items: start;
    padding: 0;
  }

  .summary-thumb {
    display: none;
  }

  .summary-body p {
    font-size: 16px;
  }

  .summary-chat-form {
    gap: 8px;
  }

  .summary-chat-form input,
  .summary-chat-form button {
    height: 34px;
    font-size: 13px;
  }

  .summary-dialog-stage { align-items: end; padding: 10px; }
  .summary-dialog { height: min(86vh,750px); border-radius: 24px; }
  .summary-dialog-header { padding: 14px 15px 13px 17px; }
  .summary-history-drawer { top: 63px; width: 100%; border-right: 0; }
  .summary-dialog-messages { gap: 22px; padding: 24px 17px; }
  .summary-dialog-message.is-assistant { max-width: 96%; }
  .summary-dialog-message.is-user p { max-width: 88%; }
  .summary-dialog-footer { padding: 11px 12px 13px; }

  .post-pager-prev,
  .post-pager-next {
    grid-column: auto;
    text-align: left;
  }

  .content-card {
    padding: 22px 14px;
  }
}
</style>
