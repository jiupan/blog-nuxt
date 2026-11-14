<template>
  <div class="friend-page">
    <div class="friend-content" :class="{ 'page-sections-enter': entering }">
      <header class="friend-hero" data-page-enter style="--page-enter-order: 0">
        <h1>{{ title }}</h1>
        <p v-if="page?.settings.intro" class="friend-intro">{{ page.settings.intro }}</p>
        <div class="friend-toolbar">
          <button type="button" class="friend-pill friend-action friend-primary" aria-haspopup="dialog" :disabled="!interactive" @click="openDialog('search', $event)">
            <Icon name="i-lucide-search" aria-hidden="true" />
            搜索网站
          </button>
          <button v-if="page?.settings.showRandom !== false" type="button" class="friend-pill friend-action" :disabled="!interactive || !items.length" @click="pickLink">
            <Icon name="i-lucide-radio" aria-hidden="true" />
            随机访问
          </button>
          <button type="button" class="friend-pill friend-action" aria-haspopup="dialog" :disabled="!interactive" @click="openDialog('recommend', $event)">
            <Icon name="i-lucide-circle-chevron-right" aria-hidden="true" />
            推荐站点
          </button>
          <a v-if="page?.settings.reportUrl" :href="page.settings.reportUrl" target="_blank" rel="noopener noreferrer" class="friend-pill friend-action">
            <Icon name="i-lucide-circle-alert" aria-hidden="true" />
            链接巡查记录
          </a>
          <button v-else type="button" class="friend-pill friend-action" aria-haspopup="dialog" :disabled="!interactive" @click="openDialog('report', $event)">
            <Icon name="i-lucide-circle-alert" aria-hidden="true" />
            报告链接问题
          </button>
        </div>
      </header>

      <div v-if="error" class="friend-status" role="status" data-page-enter style="--page-enter-order: 1">
        <p>网站导航暂时没能加载。</p>
        <button type="button" class="friend-pill friend-small" :disabled="status === 'pending'" @click="refresh()">重新加载</button>
      </div>
      <p v-else-if="!page" class="friend-status" role="status" data-page-enter style="--page-enter-order: 1">正在加载网站导航…</p>
      <template v-else>
        <section v-if="spotlight.length" class="friend-section friend-spotlight" aria-labelledby="spotlight-title" data-page-enter style="--page-enter-order: 1">
          <div class="friend-section-heading">
            <div>
              <h2 id="spotlight-title">精选收录 <span class="friend-count">{{ spotlight.length }}</span></h2>
            </div>
          </div>
          <ul class="friend-cover-grid">
            <li v-for="item in spotlight" :key="item.id"><FriendLinkCard :item="item" variant="cover" /></li>
          </ul>
        </section>
        <FriendLinkLane
          v-for="(group, index) in groups"
          :key="group.key"
          :title="group.title"
          :description="group.description"
          :items="group.items"
          :random-default="group.key !== 'RECOMMENDED'"
          data-page-enter
          :style="{ '--page-enter-order': Math.min(index + (spotlight.length ? 2 : 1), 3) }"
        />
        <div v-if="!items.length" class="friend-status" data-page-enter style="--page-enter-order: 1">
          <p>这里还没有收录链接。欢迎推荐你常去的网站。</p>
        </div>
      </template>
    </div>

    <p class="sr-only" role="status">{{ picked ? `本次随机到「${picked.title}」` : '' }}</p>
    <Teleport to="body">
      <Transition name="friend-notice">
        <div v-if="picked" class="friend-notice">
          <Icon name="i-lucide-radio" class="friend-notice-icon" aria-hidden="true" />
          <span class="friend-notice-text" :title="picked.title">本次随机到「{{ picked.title }}」</span>
          <a :href="picked.url" target="_blank" rel="noopener noreferrer" class="friend-notice-go" @click="hideNotice">前往</a>
          <button type="button" class="friend-icon-button" aria-label="关闭随机提示" @click="hideNotice"><Icon name="i-lucide-x" aria-hidden="true" /></button>
        </div>
      </Transition>
    </Teleport>

    <UModal
      :open="dialog !== null"
      :title="dialogTitle"
      :ui="{ ...modalUi, content: dialog === 'search' ? 'friend-dialog friend-dialog-search' : modalUi.content }"
      :content="{ onOpenAutoFocus: focusSearch, onCloseAutoFocus: restoreDialogFocus }"
      @update:open="closeDialog"
    >
      <template #close>
        <button type="button" class="friend-icon-button" aria-label="关闭弹层"><Icon name="i-lucide-x" aria-hidden="true" /></button>
      </template>
      <template #body>
        <template v-if="dialog === 'search'">
          <form class="friend-search-form" role="search" @submit.prevent="query = searchInput?.value ?? ''">
            <input ref="searchInput" v-model="query" type="search" class="friend-search-field" maxlength="200" autocomplete="off" aria-label="搜索名称、域名、分类或简介" placeholder="搜索名称、域名、分类或简介" @keydown.down.prevent="searchResults?.querySelector('a')?.focus()">
            <button type="submit" class="friend-pill friend-search-submit" aria-label="搜索"><Icon name="i-lucide-search" aria-hidden="true" /></button>
          </form>
          <div v-if="matches.length" class="friend-search-caption">
            <span class="friend-search-scope">{{ query.trim() ? '搜索结果' : '推荐浏览' }}</span>
          </div>
          <div v-if="error" class="friend-dialog-empty" role="status">
            网站导航暂时没能加载。
            <button type="button" class="friend-pill friend-small" :disabled="status === 'pending'" @click="refresh()">重新加载</button>
          </div>
          <p v-else-if="!matches.length" class="friend-dialog-empty">{{ query.trim() ? '没有找到匹配的链接，试试其他关键词。' : '这里还没有收录链接。' }}</p>
          <ul v-else ref="searchResults" class="friend-search-results" @keydown.down.prevent="moveSearchFocus($event, 1)" @keydown.up.prevent="moveSearchFocus($event, -1)">
            <li v-for="item in matches" :key="item.id"><FriendLinkCard :item="item" variant="search" /></li>
          </ul>
          <p v-if="!error && query.trim() && matches.length" class="friend-search-count" role="status">找到 {{ matches.length }} 条链接</p>
        </template>

        <div v-else-if="dialog === 'recommend'" class="friend-dialog-copy">
          <template v-if="contactEmail">
            <p>欢迎推荐你觉得值得收藏的网站、在线工具或文章。请附上名称、网址和推荐理由。</p>
            <a :href="mailLink('推荐站点', ['名称：', '网址：', '推荐理由：'])" class="friend-pill friend-small friend-primary"><Icon name="i-lucide-mail" aria-hidden="true" />邮件推荐</a>
            <p class="friend-dialog-note">{{ contactEmail }}</p>
          </template>
          <p v-else>站点推荐暂未开放。</p>
        </div>

        <div v-else-if="dialog === 'report'" class="friend-dialog-copy">
          <template v-if="contactEmail">
            <p>发现链接打不开或内容有变？请附上网址和遇到的问题。</p>
            <a :href="mailLink('链接问题反馈', ['网址：', '遇到的问题：'])" class="friend-pill friend-small friend-primary">邮件反馈</a>
          </template>
          <p v-else>链接问题反馈暂未开放。</p>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import { bookmarkCategories, bookmarkSection, bookmarkSectionLabel, friendLinkGroups } from '~~/types/dto/bookmark'
import type { PublicBookmark, PublicBookmarksPayload } from '~~/types/dto/bookmark'

const { data, error, status, refresh } = await useFetch<ApiResult<PublicBookmarksPayload>>('/api/bookmarks')
const page = computed(() => data.value?.data)
const title = computed(() => page.value?.settings.title || '发现值得收藏的网站。')
const items = computed(() => page.value?.items ?? [])
const isSpotlight = (item: PublicBookmark) => item.isSpotlight || item.id === page.value?.settings.featuredId
const spotlight = computed(() => items.value.filter(isSpotlight))
const directorySections = [
  { key: 'RECOMMENDED', title: friendLinkGroups.RECOMMENDED, description: '持续更新的独立博客和有特色的网站。' },
  { key: 'TOOL', title: bookmarkCategories.TOOL, description: '可以直接用的工具和服务。' },
  { key: 'TECH', title: friendLinkGroups.TECH, description: '技术文档、开源项目和学习资源。' },
  { key: 'LIFE', title: friendLinkGroups.LIFE, description: '关于日常、兴趣和生活见闻的网站。' },
  { key: 'ARTICLE', title: bookmarkCategories.ARTICLE, description: '读过后想留存的文章。' }
] as const
const groups = computed(() => {
  const regular = items.value.filter(item => !isSpotlight(item))
  return directorySections.map(section => ({
    ...section,
    items: regular.filter(item => bookmarkSection(item) === section.key)
  })).filter(group => group.items.length)
})

const picked = ref<PublicBookmark>()
const interactive = ref(false)
const entering = ref(false)
let lastPickedId: number | undefined
let noticeTimer: ReturnType<typeof setTimeout> | undefined
let enterTimer: ReturnType<typeof setTimeout> | undefined

function hideNotice() {
  clearTimeout(noticeTimer)
  picked.value = undefined
}

function pickLink() {
  const pool = items.value.length > 1 ? items.value.filter(item => item.id !== lastPickedId) : items.value
  const item = pool[Math.floor(Math.random() * pool.length)]
  if (!item) return
  clearTimeout(noticeTimer)
  picked.value = item
  lastPickedId = item.id
  noticeTimer = setTimeout(hideNotice, 8000)
}

onMounted(() => {
  interactive.value = true
  entering.value = true
  enterTimer = setTimeout(() => { entering.value = false }, 680)
})

onBeforeUnmount(() => {
  clearTimeout(noticeTimer)
  clearTimeout(enterTimer)
})

const dialogTitles = { search: '搜索网站', recommend: '推荐站点', report: '报告链接问题' }
type DirectoryDialog = keyof typeof dialogTitles
const dialog = ref<DirectoryDialog | null>(null)
let dialogTrigger: HTMLElement | undefined
const dialogTitle = computed(() => dialog.value ? dialogTitles[dialog.value] : '网站导航')
const modalUi = { content: 'friend-dialog', overlay: 'friend-dialog-overlay', header: 'friend-dialog-header', body: 'friend-dialog-body', title: 'friend-dialog-title' }
const query = ref('')
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const searchResults = useTemplateRef<HTMLUListElement>('searchResults')
const matches = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!keyword) {
    return [...spotlight.value, ...items.value.filter(item => !isSpotlight(item))].slice(0, 12)
  }
  return items.value.filter(item => [item.title, item.url, item.note, bookmarkSectionLabel(item)].some(value => value.toLowerCase().includes(keyword)))
})
const contactEmail = computed(() => page.value?.settings.applicationEmail)

function openDialog(kind: DirectoryDialog, event: MouseEvent) {
  dialogTrigger = event.currentTarget as HTMLButtonElement
  query.value = ''
  dialog.value = kind
}

function focusSearch(event: Event) {
  if (dialog.value !== 'search' || !searchInput.value) return
  event.preventDefault()
  searchInput.value.focus()
}

function closeDialog(open: boolean) {
  if (open) return
  dialog.value = null
}

function restoreDialogFocus(event: Event) {
  event.preventDefault()
  dialogTrigger?.focus()
  dialogTrigger = undefined
}

function moveSearchFocus(event: KeyboardEvent, direction: -1 | 1) {
  const links = Array.from((event.currentTarget as HTMLUListElement).querySelectorAll('a'))
  const next = links.indexOf(document.activeElement as HTMLAnchorElement) + direction
  if (next < 0) searchInput.value?.focus()
  else links[next]?.focus()
}

function mailLink(subject: string, lines: string[]) {
  return `mailto:${contactEmail.value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\r\n'))}`
}

useSeoMeta({
  title: () => `网站导航 · ${title.value}`,
  description: () => page.value?.settings.intro.replace(/\s+/g, ' ').trim() || '收录值得访问的网站、在线工具和文章。'
})
</script>

<style src="~/assets/css/friend-links.css"></style>
