<template>
  <div class="tools-page">
    <div class="tools-dot-grid" aria-hidden="true" />
    <div class="tools-scanline" aria-hidden="true" />

    <main class="tools-shell">
      <header class="tools-hero">
        <div class="tools-kicker">
          <span class="tools-kicker-mark">T</span>
          <span>TOOLS / 工具集合</span>
        </div>

        <div class="tools-hero-row">
          <div>
            <h1>顺手的<span>小工具_</span></h1>
            <p>把站内常用能力集中到一个入口，少一点寻找，多一点直接抵达。</p>
          </div>

          <label class="tools-search">
            <SearchIcon aria-hidden="true" />
            <input
              ref="searchInput"
              v-model="keyword"
              type="search"
              placeholder="搜索工具..."
              aria-label="搜索工具"
            >
            <kbd>/</kbd>
          </label>
        </div>
      </header>

      <section class="tools-content" aria-labelledby="tools-list-title">
        <h2 id="tools-list-title" class="sr-only">工具列表</h2>

        <div class="tools-filter" aria-label="工具分类">
          <button
            v-for="category in categories"
            :key="category.value"
            type="button"
            :class="{ 'is-active': activeCategory === category.value }"
            @click="activeCategory = category.value"
          >
            {{ category.label }}
            <span>{{ categoryCount(category.value) }}</span>
          </button>
        </div>

        <div v-if="filteredTools.length" class="tools-grid">
          <button
            v-for="tool in filteredTools"
            :key="tool.id"
            type="button"
            class="tool-card"
            :class="`tone-${tool.tone}`"
            @click="openTool(tool)"
          >
            <span class="tool-highlight" aria-hidden="true" />

            <span class="tool-card-head">
              <span class="tool-icon">
                <component :is="tool.icon" aria-hidden="true" />
              </span>
              <span class="tool-type">{{ categoryLabel(tool.category) }}</span>
            </span>

            <strong>{{ tool.title }}</strong>
            <p>{{ tool.description }}</p>

            <span class="tool-action">
              Coming Soon
              <ArrowRightIcon aria-hidden="true" />
            </span>
          </button>
        </div>

        <div v-else class="tools-empty">
          <SearchXIcon aria-hidden="true" />
          <strong>没有找到匹配的工具</strong>
          <p>换一个关键词，或者查看全部分类。</p>
          <button type="button" @click="resetFilters">清除筛选</button>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="tool-modal">
        <div v-if="selectedTool" class="tool-modal-layer" role="presentation" @click.self="closeTool">
          <section
            class="tool-modal-card"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="`tool-modal-${selectedTool.id}`"
          >
            <header class="tool-modal-head">
              <div class="tool-modal-title">
                <span :class="`tone-${selectedTool.tone}`">
                  <component :is="selectedTool.icon" aria-hidden="true" />
                </span>
                <h2 :id="`tool-modal-${selectedTool.id}`">{{ selectedTool.title }}</h2>
              </div>
              <button type="button" aria-label="关闭弹窗" @click="closeTool">
                <XIcon aria-hidden="true" />
              </button>
            </header>

            <div class="tool-modal-body">
              <span class="coming-icon">
                <SettingsIcon aria-hidden="true" />
              </span>
              <h3>Coming Soon</h3>
              <p><strong>{{ selectedTool.title }}</strong> 的功能模块正在建设中，准备好后会在这里开放。</p>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  Archive as ArchiveIcon,
  ArrowRight as ArrowRightIcon,
  BookOpen as BookOpenIcon,
  Bot as BotIcon,
  Image as ImageIcon,
  LayoutDashboard as LayoutDashboardIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  SearchX as SearchXIcon,
  Settings as SettingsIcon,
  UserRound as UserRoundIcon,
  X as XIcon
} from '@lucide/vue'

type ToolCategory = 'smart' | 'content' | 'site' | 'manage'
type CategoryValue = 'all' | ToolCategory
type ToolTone = 'blue' | 'violet' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'indigo' | 'slate'

type ToolItem = {
  id: string
  title: string
  description: string
  category: ToolCategory
  tone: ToolTone
  icon: Component
}

const categories: Array<{ label: string, value: CategoryValue }> = [
  { label: '全部', value: 'all' },
  { label: '智能', value: 'smart' },
  { label: '内容', value: 'content' },
  { label: '站点', value: 'site' },
  { label: '管理', value: 'manage' }
]

const tools: ToolItem[] = [
  {
    id: 'ai-lab',
    title: 'AI 创作实验室',
    description: '集中使用博客问答、语义搜索、文章总结和写作辅助能力。',
    category: 'smart',
    tone: 'blue',
    icon: BotIcon
  },
  {
    id: 'post-library',
    title: '文章文库',
    description: '按列表浏览全部公开内容，快速找到想继续阅读的文章。',
    category: 'content',
    tone: 'violet',
    icon: BookOpenIcon
  },
  {
    id: 'archive',
    title: '时间归档',
    description: '沿着发布时间回看内容，查看博客长期积累的写作轨迹。',
    category: 'content',
    tone: 'emerald',
    icon: ArchiveIcon
  },
  {
    id: 'links',
    title: '友链导航',
    description: '访问常用站点、技术资源和持续关注的内容来源。',
    category: 'site',
    tone: 'rose',
    icon: LinkIcon
  },
  {
    id: 'about',
    title: '站点档案',
    description: '了解这个博客的内容方向、技术构成和维护状态。',
    category: 'site',
    tone: 'amber',
    icon: UserRoundIcon
  },
  {
    id: 'dashboard',
    title: '内容控制台',
    description: '进入管理工作台，查看站点概况并处理日常内容。',
    category: 'manage',
    tone: 'cyan',
    icon: LayoutDashboardIcon
  },
  {
    id: 'gallery',
    title: '媒体图库',
    description: '整理文章封面、表情包和站点使用的图片素材。',
    category: 'manage',
    tone: 'indigo',
    icon: ImageIcon
  },
  {
    id: 'settings',
    title: '站点设置',
    description: '维护博客基础信息、展示偏好和搜索引擎配置。',
    category: 'manage',
    tone: 'slate',
    icon: SettingsIcon
  }
]

const keyword = ref('')
const activeCategory = ref<CategoryValue>('all')
const searchInput = ref<HTMLInputElement | null>(null)
const selectedTool = ref<ToolItem | null>(null)
let previousBodyOverflow = ''

const filteredTools = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return tools.filter((tool) => {
    const matchesCategory = activeCategory.value === 'all' || tool.category === activeCategory.value
    const matchesKeyword = !query || `${tool.title} ${tool.description} ${categoryLabel(tool.category)}`.toLocaleLowerCase().includes(query)
    return matchesCategory && matchesKeyword
  })
})

function categoryLabel(category: ToolCategory) {
  return categories.find(item => item.value === category)?.label || '工具'
}

function categoryCount(category: CategoryValue) {
  return category === 'all' ? tools.length : tools.filter(tool => tool.category === category).length
}

function resetFilters() {
  keyword.value = ''
  activeCategory.value = 'all'
}

function openTool(tool: ToolItem) {
  selectedTool.value = tool
}

function closeTool() {
  selectedTool.value = null
}

function focusSearch(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedTool.value) {
    closeTool()
    return
  }
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
  event.preventDefault()
  searchInput.value?.focus()
}

watch(selectedTool, (tool) => {
  if (!import.meta.client) return
  if (tool) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }
  document.body.style.overflow = previousBodyOverflow
})

onMounted(() => window.addEventListener('keydown', focusSearch))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', focusSearch)
  document.body.style.overflow = previousBodyOverflow
})

useSeoMeta({
  title: '工具箱',
  description: '博客常用功能与内容入口集合。'
})
</script>

<style scoped>
.tools-page {
  position: relative;
  min-height: 680px;
  overflow: hidden;
  background: var(--theme-page);
  color: var(--theme-text);
  isolation: isolate;
}

.tools-dot-grid {
  position: absolute;
  z-index: -2;
  inset: 0;
  background-image: radial-gradient(color-mix(in srgb, var(--theme-text-faint) 42%, transparent) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: .52;
  pointer-events: none;
}

.tools-page::before {
  position: absolute;
  z-index: -1;
  top: -180px;
  left: 50%;
  width: 780px;
  height: 480px;
  border-radius: 999px;
  background: radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 13%, transparent), transparent 68%);
  content: "";
  transform: translateX(-50%);
  pointer-events: none;
}

.tools-scanline {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, color-mix(in srgb, var(--theme-accent) 62%, transparent), transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--theme-accent) 22%, transparent);
  animation: tools-scan 6s cubic-bezier(.4, 0, .2, 1) infinite;
  opacity: .65;
  pointer-events: none;
}

.tools-shell {
  width: min(100% - 48px, 1152px);
  min-height: 680px;
  margin: 0 auto;
  padding: 54px 0 88px;
}

.tools-hero {
  margin-bottom: 42px;
}

.tools-kicker {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 42px;
  color: var(--theme-text-muted);
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .13em;
}

.tools-kicker-mark {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 7px;
  background: var(--theme-accent);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--theme-accent) 25%, transparent);
  color: #fff;
  font-size: 13px;
  letter-spacing: 0;
}

.tools-hero-row {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 40px;
}

.tools-hero h1 {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 0;
  color: var(--theme-text-strong);
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 850;
  letter-spacing: -.05em;
  line-height: 1.05;
}

.tools-hero h1 span {
  color: var(--theme-accent);
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: .82em;
  font-weight: 650;
  letter-spacing: -.06em;
}

.tools-hero p {
  max-width: 650px;
  margin: 14px 0 0;
  color: var(--theme-text-muted);
  font-size: 15px;
  line-height: 1.8;
}

.tools-search {
  display: flex;
  width: min(100%, 270px);
  height: 40px;
  flex: 0 0 270px;
  align-items: center;
  gap: 9px;
  padding: 0 10px 0 13px;
  border: 1px solid var(--theme-border);
  border-radius: 9px;
  background: color-mix(in srgb, var(--theme-surface) 94%, transparent);
  box-shadow: 0 5px 15px rgb(var(--theme-shadow) / 5%);
  transition: border-color .2s ease, box-shadow .2s ease;
}

.tools-search:focus-within {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-accent) 14%, transparent);
}

.tools-search > svg {
  width: 15px;
  flex: 0 0 15px;
  color: var(--theme-text-faint);
}

.tools-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--theme-text);
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
}

.tools-search input::placeholder {
  color: var(--theme-text-faint);
}

.tools-search kbd {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 1px solid var(--theme-border);
  border-radius: 5px;
  background: var(--theme-surface-muted);
  color: var(--theme-text-faint);
  font: 10px "JetBrains Mono", monospace;
}

.tools-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--theme-border-soft);
}

.tools-filter button {
  display: inline-flex;
  min-height: 29px;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border: 1px solid var(--theme-border);
  border-radius: 7px;
  background: var(--theme-surface);
  color: var(--theme-text-muted);
  cursor: pointer;
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 11px;
  font-weight: 650;
  transition: background .18s ease, border-color .18s ease, color .18s ease;
}

.tools-filter button span {
  color: var(--theme-text-faint);
  font-size: 9px;
}

.tools-filter button:hover,
.tools-filter button:focus-visible {
  border-color: color-mix(in srgb, var(--theme-accent) 45%, var(--theme-border));
  color: var(--theme-text);
  outline: none;
}

.tools-filter button.is-active {
  border-color: color-mix(in srgb, var(--theme-accent) 28%, var(--theme-border));
  background: var(--theme-accent-soft);
  color: var(--theme-accent);
}

.tools-filter button.is-active span {
  color: inherit;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.tool-card {
  --tool-color: #2563eb;
  --tool-soft: #eff6ff;

  position: relative;
  display: flex;
  min-height: 180px;
  overflow: hidden;
  flex-direction: column;
  width: 100%;
  padding: 15px;
  border: 1px solid var(--theme-border);
  border-radius: 13px;
  background: color-mix(in srgb, var(--theme-surface) 97%, transparent);
  box-shadow: 0 3px 12px rgb(var(--theme-shadow) / 3%);
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color .28s ease, box-shadow .28s ease, transform .28s cubic-bezier(.4, 0, .2, 1);
}

.tool-card:hover,
.tool-card:focus-visible {
  border-color: color-mix(in srgb, var(--tool-color) 30%, var(--theme-border));
  box-shadow: 0 14px 25px -12px color-mix(in srgb, var(--tool-color) 20%, transparent), 0 5px 8px -5px rgb(var(--theme-overlay) / 9%);
  outline: none;
  transform: translateY(-3px);
}

.tool-highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, var(--tool-color), color-mix(in srgb, var(--tool-color) 45%, #fff));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .3s ease;
}

.tool-card:hover .tool-highlight,
.tool-card:focus-visible .tool-highlight {
  transform: scaleX(1);
}

.tool-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 13px;
}

.tool-icon {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--tool-color) 13%, var(--theme-border));
  border-radius: 9px;
  background: color-mix(in srgb, var(--tool-soft) 82%, var(--theme-surface));
  color: var(--tool-color);
  transition: background .25s ease, color .25s ease, transform .25s ease;
}

.tool-icon svg {
  width: 16px;
  height: 16px;
}

.tool-card:hover .tool-icon,
.tool-card:focus-visible .tool-icon {
  background: var(--tool-color);
  color: #fff;
  transform: rotate(-4deg) scale(1.04);
}

.tool-type {
  padding: 3px 6px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 6px;
  background: var(--theme-surface-muted);
  color: var(--theme-text-faint);
  font: 600 9px "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  letter-spacing: .08em;
}

.tool-card > strong {
  color: var(--theme-text-strong);
  font-size: 14px;
  font-weight: 750;
  transition: color .2s ease;
}

.tool-card:hover > strong,
.tool-card:focus-visible > strong {
  color: var(--tool-color);
}

.tool-card > p {
  display: -webkit-box;
  overflow: hidden;
  margin: 7px 0 12px;
  color: var(--theme-text-muted);
  font-size: 11px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.tool-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: auto;
  color: var(--tool-color);
  font: 650 10px "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  opacity: 0;
  transform: translateX(-5px);
  transition: opacity .2s ease, transform .2s ease;
}

.tool-action svg {
  width: 12px;
  height: 12px;
}

.tool-card:hover .tool-action,
.tool-card:focus-visible .tool-action {
  opacity: 1;
  transform: translateX(0);
}

.tone-violet { --tool-color: #7c3aed; --tool-soft: #f5f3ff; }
.tone-emerald { --tool-color: #059669; --tool-soft: #ecfdf5; }
.tone-rose { --tool-color: #e11d48; --tool-soft: #fff1f2; }
.tone-amber { --tool-color: #d97706; --tool-soft: #fffbeb; }
.tone-cyan { --tool-color: #0891b2; --tool-soft: #ecfeff; }
.tone-indigo { --tool-color: #4f46e5; --tool-soft: #eef2ff; }
.tone-slate { --tool-color: #64748b; --tool-soft: #f1f5f9; }

.tools-empty {
  display: grid;
  min-height: 260px;
  place-items: center;
  align-content: center;
  padding: 36px;
  border: 1px dashed var(--theme-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--theme-surface) 72%, transparent);
  text-align: center;
}

.tools-empty > svg {
  width: 30px;
  height: 30px;
  margin-bottom: 13px;
  color: var(--theme-text-faint);
}

.tools-empty strong {
  color: var(--theme-text-strong);
  font-size: 15px;
}

.tools-empty p {
  margin: 7px 0 16px;
  color: var(--theme-text-muted);
  font-size: 12px;
}

.tools-empty button {
  padding: 7px 12px;
  border: 1px solid var(--theme-border);
  border-radius: 7px;
  background: var(--theme-surface);
  color: var(--theme-accent);
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.tool-modal-layer {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgb(var(--theme-overlay) / 22%);
  backdrop-filter: blur(6px);
}

.tool-modal-card {
  width: min(100%, 760px);
  max-height: 85vh;
  overflow: hidden;
  border: 1px solid var(--theme-border);
  border-radius: 17px;
  background: var(--theme-surface);
  box-shadow: 0 28px 70px rgb(var(--theme-overlay) / 18%);
  color: var(--theme-text);
}

.tool-modal-head {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px 12px 22px;
  border-bottom: 1px solid var(--theme-border-soft);
  background: color-mix(in srgb, var(--theme-surface-muted) 72%, var(--theme-surface));
}

.tool-modal-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.tool-modal-title > span {
  --tool-color: #2563eb;
  --tool-soft: #eff6ff;

  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border-radius: 7px;
  background: var(--tool-color);
  box-shadow: 0 6px 14px color-mix(in srgb, var(--tool-color) 20%, transparent);
  color: #fff;
}

.tool-modal-title svg {
  width: 16px;
  height: 16px;
}

.tool-modal-title h2 {
  overflow: hidden;
  margin: 0;
  color: var(--theme-text-strong);
  font-size: 14px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-modal-head > button {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: var(--theme-surface);
  color: var(--theme-text-faint);
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
}

.tool-modal-head > button:hover,
.tool-modal-head > button:focus-visible {
  background: var(--theme-surface-hover);
  color: var(--theme-text);
  outline: none;
}

.tool-modal-head > button svg {
  width: 17px;
  height: 17px;
}

.tool-modal-body {
  display: flex;
  min-height: 350px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 44px 24px;
  background: transparent;
  text-align: center;
}

.coming-icon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  margin-bottom: 17px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 16px;
  background: var(--theme-surface-muted);
  box-shadow: 0 7px 18px rgb(var(--theme-shadow) / 6%);
  color: var(--theme-text-faint);
}

.coming-icon svg {
  width: 25px;
  height: 25px;
}

.tool-modal-body h3 {
  margin: 0 0 7px;
  color: var(--theme-text-strong);
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  font-size: 15px;
  font-weight: 750;
}

.tool-modal-body p {
  max-width: 330px;
  margin: 0;
  color: var(--theme-text-muted);
  font-size: 12px;
  line-height: 1.75;
}

.tool-modal-body p strong {
  color: var(--theme-text-soft);
}

.tool-modal-enter-active,
.tool-modal-leave-active {
  transition: opacity .28s ease;
}

.tool-modal-enter-active .tool-modal-card,
.tool-modal-leave-active .tool-modal-card {
  transition: opacity .28s ease, transform .28s cubic-bezier(.2, .75, .2, 1);
}

.tool-modal-enter-from,
.tool-modal-leave-to {
  opacity: 0;
}

.tool-modal-enter-from .tool-modal-card,
.tool-modal-leave-to .tool-modal-card {
  opacity: 0;
  transform: translateY(16px) scale(.96);
}

@keyframes tools-scan {
  0% { opacity: 0; transform: translateY(-10px); }
  10%, 90% { opacity: .65; }
  100% { opacity: 0; transform: translateY(720px); }
}

@media (max-width: 960px) {
  .tools-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tools-hero-row { align-items: flex-start; flex-direction: column; gap: 24px; }
  .tools-search { width: 100%; flex-basis: auto; }
}

@media (max-width: 640px) {
  .tools-shell { width: min(100% - 28px, 1152px); padding: 34px 0 64px; }
  .tools-kicker { margin-bottom: 30px; }
  .tools-hero { margin-bottom: 32px; }
  .tools-hero h1 { display: block; font-size: 36px; }
  .tools-hero h1 span { display: block; margin-top: 7px; font-size: 29px; }
  .tools-hero p { font-size: 13px; }
  .tools-grid { grid-template-columns: 1fr; }
  .tool-card { min-height: 168px; }
  .tool-action { opacity: 1; transform: none; }
  .tool-modal-layer { align-items: flex-end; padding: 10px; }
  .tool-modal-card { border-radius: 16px; }
  .tool-modal-body { min-height: 300px; }
}

@media (prefers-reduced-motion: reduce) {
  .tools-scanline { display: none; }
  .tool-card,
  .tool-highlight,
  .tool-icon,
  .tool-action,
  .tool-modal-layer,
  .tool-modal-card { transition: none; }
}
</style>
