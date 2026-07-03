<template>
  <div class="lab-page">
    <div class="lab-grid-bg" aria-hidden="true"></div>

    <main class="lab-shell">
      <section class="lab-hero">
        <div class="lab-hud" aria-hidden="true">
          <div class="typewriter">SYS.INIT // 2026.x</div>
          <div class="hud-status">STATUS: ONLINE</div>
          <div class="hud-bars">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div class="lab-badge">
          <SparklesIcon aria-hidden="true" />
          <span>欢迎来到下一代博客核心驱动引擎</span>
        </div>

        <h1>
          探索博客的
          <span>智能边界</span>
        </h1>

        <p>
          这里是站点的 AI 实验室。通过
          <strong>自然语言处理</strong>
          与
          <strong>大模型技术</strong>
          ，赋予博客全方位的创作、分析与重组能力。点击各项机能，开启
          <em>自动化体验</em>。
        </p>
      </section>

      <section class="feature-grid" aria-label="AI 实验功能">
        <article
          v-for="feature in features"
          :key="feature.id"
          class="feature-card"
          :class="[
            `tone-${feature.tone}`,
            {
              'is-wide': feature.wide,
              'is-tall': feature.tall,
              'has-visual': feature.hasVisual
            }
          ]"
          tabindex="0"
          role="button"
          :aria-label="`打开${feature.title}`"
          @click="openFeature(feature)"
          @keydown.enter.prevent="openFeature(feature)"
          @keydown.space.prevent="openFeature(feature)"
        >
          <span class="hud-corner top-left" aria-hidden="true"></span>
          <span class="hud-corner top-right" aria-hidden="true"></span>
          <span class="hud-corner bottom-left" aria-hidden="true"></span>
          <span class="hud-corner bottom-right" aria-hidden="true"></span>
          <span v-if="feature.wide || feature.tall" class="shimmer" aria-hidden="true"></span>

          <component :is="feature.icon" class="watermark-icon" aria-hidden="true" :stroke-width="1" />

          <div class="feature-content">
            <div>
              <div class="feature-top">
                <span class="feature-icon">
                  <component :is="feature.icon" aria-hidden="true" :stroke-width="1.5" />
                </span>
                <span class="feature-arrow" aria-hidden="true">
                  <ChevronRightIcon />
                </span>
              </div>

              <div class="feature-copy">
                <div class="feature-subtitle">
                  <span>{{ feature.subtitle }}</span>
                  <i></i>
                </div>
                <h2>{{ feature.title }}</h2>
              </div>
            </div>

            <div v-if="feature.hasVisual && feature.tall" class="feature-visual" aria-hidden="true">
              <div>
                <span></span>
                <i class="data-bar"></i>
              </div>
              <div>
                <span></span>
                <i class="data-bar"></i>
              </div>
              <div>
                <span></span>
                <i class="data-bar"></i>
              </div>
            </div>

            <footer class="feature-status">
              <span>
                <i></i>
                Active
              </span>
              <b>{{ feature.sysId }}</b>
            </footer>
          </div>
        </article>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="lab-modal">
        <div v-if="selectedFeature" class="modal-layer" @click.self="closeFeature">
          <section class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="`modal-${selectedFeature.id}`">
            <header class="modal-header">
              <div class="modal-title">
                <span class="modal-icon" :class="`tone-${selectedFeature.tone}`">
                  <component :is="selectedFeature.icon" aria-hidden="true" />
                </span>
                <div>
                  <h2 :id="`modal-${selectedFeature.id}`">{{ selectedFeature.title }}</h2>
                  <p>{{ selectedFeature.subtitle }}</p>
                </div>
              </div>
              <button type="button" class="modal-close" aria-label="关闭" @click="closeFeature">
                <XIcon aria-hidden="true" />
              </button>
            </header>

            <div class="modal-body">
              <p>{{ selectedFeature.description }}</p>

              <div class="lab-console">
                <div v-if="modalLoading" class="console-loading">
                  <Loader2Icon aria-hidden="true" />
                  <span>Initializing Neural Engine...</span>
                </div>

                <div v-else class="console-ready">
                  <div class="console-status">
                    <i></i>
                    <span>System Ready / 运行就绪</span>
                  </div>
                  <div class="console-lines">
                    <p>&gt; Connecting to blog database...</p>
                    <p>&gt; Analyzing context and metadata...</p>
                    <strong>
                      <SparklesIcon aria-hidden="true" />
                      Waiting for input to execute [{{ selectedFeature.title }}] protocol.
                    </strong>
                  </div>
                  <span class="scan-line" aria-hidden="true"></span>
                </div>
              </div>
            </div>

            <footer class="modal-actions">
              <button type="button" class="ghost-button" @click="closeFeature">取消关闭</button>
              <button type="button" class="primary-button">
                启动功能
                <ChevronRightIcon aria-hidden="true" />
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import {
  Activity as ActivityIcon,
  Archive as ArchiveIcon,
  BrainCircuit as BrainCircuitIcon,
  CalendarDays as CalendarDaysIcon,
  ChevronRight as ChevronRightIcon,
  FileText as FileTextIcon,
  Link2Off as Link2OffIcon,
  Loader2 as Loader2Icon,
  MessageSquareText as MessageSquareTextIcon,
  Network as NetworkIcon,
  PenTool as PenToolIcon,
  Sparkles as SparklesIcon,
  Target as TargetIcon,
  X as XIcon
} from '@lucide/vue'

type LabFeature = {
  id: string
  sysId: string
  title: string
  subtitle: string
  description: string
  icon: Component
  tone: string
  wide?: boolean
  tall?: boolean
  hasVisual?: boolean
}

const features: LabFeature[] = [
  {
    id: 'ask-blog',
    sysId: 'SYS-001',
    title: '问问博客',
    subtitle: 'Blog Q&A',
    description: '基于站内文章回答问题，并附带参考来源。',
    icon: MessageSquareTextIcon,
    tone: 'blue',
    wide: true,
    tall: true,
    hasVisual: true
  },
  {
    id: 'semantic-search',
    sysId: 'SYS-002',
    title: '语义搜索',
    subtitle: 'Semantic Search',
    description: '不靠精确关键词，按意思搜索相关文章。',
    icon: BrainCircuitIcon,
    tone: 'indigo'
  },
  {
    id: 'writing-assistant',
    sysId: 'SYS-003',
    title: '写作助手',
    subtitle: 'Writing Assistant',
    description: '给草稿生成摘要、SEO 标题、描述、标签及分类建议。',
    icon: PenToolIcon,
    tone: 'green',
    tall: true,
    hasVisual: true
  },
  {
    id: 'article-summary',
    sysId: 'SYS-004',
    title: '文章总结器',
    subtitle: 'Article Summarizer',
    description: '生成文章摘要、重点、适合读者群和相关问题。',
    icon: FileTextIcon,
    tone: 'amber'
  },
  {
    id: 'site-insights',
    sysId: 'SYS-005',
    title: '站点洞察',
    subtitle: 'Site Insights',
    description: '分析博客内容主题、标签分布、热门方向和可补充选题。',
    icon: ActivityIcon,
    tone: 'rose',
    wide: true
  },
  {
    id: 'article-recommend',
    sysId: 'SYS-006',
    title: '文章关联推荐',
    subtitle: 'Smart Recommendation',
    description: '根据当前文章推荐相关旧文，方便读者继续阅读。',
    icon: NetworkIcon,
    tone: 'violet'
  },
  {
    id: 'seo-checker',
    sysId: 'SYS-007',
    title: 'SEO 检查助手',
    subtitle: 'SEO Checker',
    description: '检查文章标题、摘要、标签是否完整，给出优化建议。',
    icon: TargetIcon,
    tone: 'sky'
  },
  {
    id: 'dead-link-checker',
    sysId: 'SYS-008',
    title: '外链检查助手',
    subtitle: 'Link Monitor',
    description: '扫描文章里的外链，找出失效链接并给出修复建议。',
    icon: Link2OffIcon,
    tone: 'red'
  },
  {
    id: 'draft-organizer',
    sysId: 'SYS-009',
    title: '草稿整理助手',
    subtitle: 'Draft Organizer',
    description: '分析后台草稿，判断完成度，推荐适合继续写或发布。',
    icon: ArchiveIcon,
    tone: 'slate'
  },
  {
    id: 'monthly-review',
    sysId: 'SYS-010',
    title: '月度内容回顾',
    subtitle: 'Monthly Review',
    description: '自动整理一个月内发布的文章，生成月报或内容总结。',
    icon: CalendarDaysIcon,
    tone: 'fuchsia',
    wide: true
  }
]

const selectedFeature = ref<LabFeature | null>(null)
const modalLoading = ref(false)
let modalTimer: ReturnType<typeof setTimeout> | undefined

function openFeature(feature: LabFeature) {
  selectedFeature.value = feature
  modalLoading.value = true
  clearTimeout(modalTimer)
  modalTimer = setTimeout(() => {
    modalLoading.value = false
  }, 1500)
}

function closeFeature() {
  selectedFeature.value = null
  modalLoading.value = false
  clearTimeout(modalTimer)
}

onBeforeUnmount(() => {
  clearTimeout(modalTimer)
})

useSeoMeta({
  title: 'AI 实验室',
  description: '博客 AI 实验功能集合'
})
</script>

<style scoped>
.lab-page {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(239 246 255 / 62%) 0%, transparent 36%),
    linear-gradient(315deg, rgb(253 244 255 / 54%) 0%, transparent 32%),
    #f8fafc;
  color: #0f172a;
}

.lab-grid-bg {
  position: fixed;
  inset: 0;
  z-index: -3;
  background-image: radial-gradient(circle, #d7dee9 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: .6;
  pointer-events: none;
}

.lab-shell {
  position: relative;
  z-index: 1;
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
  padding: 96px 0 84px;
}

.lab-hero {
  position: relative;
  max-width: 820px;
  margin: 0 auto 56px;
  text-align: center;
}

.lab-hud {
  position: absolute;
  top: -30px;
  left: -76px;
  display: grid;
  gap: 5px;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  letter-spacing: .14em;
  text-align: left;
}

.typewriter {
  width: max-content;
  max-width: 190px;
  overflow: hidden;
  border-right: 2px solid #3b82f6;
  color: #2563eb;
  animation: typing 1.5s steps(24, end), blink .75s step-end infinite;
  white-space: nowrap;
}

.hud-status {
  animation: fade-in .5s ease-out 1.5s forwards;
  opacity: 0;
}

.hud-bars {
  display: flex;
  gap: 4px;
  animation: fade-in .5s ease-out 1.8s forwards;
  opacity: 0;
}

.hud-bars span {
  height: 4px;
  border-radius: 999px;
  background: #cbd5e1;
}

.hud-bars span:nth-child(1) {
  width: 16px;
  background: rgb(96 165 250 / 55%);
}

.hud-bars span:nth-child(2) {
  width: 8px;
}

.hud-bars span:nth-child(3) {
  width: 32px;
}

.lab-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  box-shadow: 0 10px 26px rgb(37 99 235 / 9%);
  color: #2563eb;
  font-size: 14px;
  font-weight: 800;
  padding: 7px 13px;
  transition: background .24s ease, border-color .24s ease, box-shadow .24s ease, color .24s ease;
}

.lab-badge:hover {
  border-color: #2563eb;
  background: #2563eb;
  box-shadow: 0 16px 34px rgb(37 99 235 / 22%);
  color: white;
}

.lab-badge svg {
  width: 16px;
  height: 16px;
}

.lab-badge:hover svg {
  animation: icon-spin .7s ease;
}

.lab-hero h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(44px, 7vw, 74px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.05;
}

.lab-hero h1 span {
  position: relative;
  display: inline-block;
  margin-left: 12px;
  background: linear-gradient(90deg, #1f2937, #64748b, #94a3b8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  transition: background .6s ease, filter .6s ease;
}

.lab-hero h1 span::after {
  position: absolute;
  left: 50%;
  bottom: -8px;
  width: 0;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, #60a5fa, #22d3ee, transparent);
  content: "";
  transform: translateX(-50%);
  transition: width .6s ease;
}

.lab-hero h1:hover span {
  background: linear-gradient(90deg, #2563eb, #6366f1, #0891b2);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 14px 28px rgb(37 99 235 / 13%));
}

.lab-hero h1:hover span::after {
  width: 100%;
}

.lab-hero p {
  max-width: 690px;
  margin: 26px auto 0;
  color: #64748b;
  font-size: 18px;
  line-height: 1.9;
}

.lab-hero strong {
  border-radius: 6px;
  color: #334155;
  font-weight: 900;
  padding: 0 4px;
  transition: background .2s ease, color .2s ease;
}

.lab-hero strong:hover {
  background: #eff6ff;
  color: #2563eb;
}

.lab-hero em {
  position: relative;
  color: #475569;
  font-style: normal;
  font-weight: 900;
}

.lab-hero em::after {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  border-radius: 999px;
  background: #cbd5e1;
  content: "";
  transition: background .2s ease;
}

.lab-hero em:hover::after {
  background: #2563eb;
}

.feature-grid {
  display: grid;
  grid-auto-rows: 160px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.feature-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 88%);
  border-radius: 12px;
  background: rgb(255 255 255 / 72%);
  box-shadow: 0 18px 34px rgb(100 116 139 / 14%);
  cursor: pointer;
  padding: 24px;
  outline: none;
  transition: transform .42s ease, box-shadow .42s ease, border-color .42s ease, background .42s ease;
  backdrop-filter: blur(12px);
}

.feature-card::before {
  position: absolute;
  inset: 0;
  background: var(--tone-bg);
  content: "";
  opacity: 0;
  transition: opacity .42s ease;
}

.feature-card:hover,
.feature-card:focus-visible {
  border-color: var(--tone-border);
  box-shadow: 0 22px 42px var(--tone-shadow);
  transform: translateY(-4px);
}

.feature-card:hover::before,
.feature-card:focus-visible::before {
  opacity: 1;
}

.feature-card.is-wide {
  grid-column: span 2;
}

.feature-card.is-tall {
  grid-row: span 2;
}

.tone-blue {
  --tone-bg: linear-gradient(135deg, rgb(59 130 246 / 10%), rgb(6 182 212 / 10%));
  --tone-border: #bfdbfe;
  --tone-shadow: rgb(59 130 246 / 18%);
  --tone-main: #2563eb;
}

.tone-indigo {
  --tone-bg: linear-gradient(135deg, rgb(99 102 241 / 10%), rgb(168 85 247 / 10%));
  --tone-border: #c7d2fe;
  --tone-shadow: rgb(99 102 241 / 18%);
  --tone-main: #4f46e5;
}

.tone-green {
  --tone-bg: linear-gradient(135deg, rgb(16 185 129 / 10%), rgb(20 184 166 / 10%));
  --tone-border: #a7f3d0;
  --tone-shadow: rgb(16 185 129 / 17%);
  --tone-main: #059669;
}

.tone-amber {
  --tone-bg: linear-gradient(135deg, rgb(245 158 11 / 11%), rgb(249 115 22 / 10%));
  --tone-border: #fde68a;
  --tone-shadow: rgb(245 158 11 / 18%);
  --tone-main: #d97706;
}

.tone-rose {
  --tone-bg: linear-gradient(135deg, rgb(244 63 94 / 10%), rgb(236 72 153 / 10%));
  --tone-border: #fecdd3;
  --tone-shadow: rgb(244 63 94 / 17%);
  --tone-main: #e11d48;
}

.tone-violet {
  --tone-bg: linear-gradient(135deg, rgb(139 92 246 / 10%), rgb(217 70 239 / 10%));
  --tone-border: #ddd6fe;
  --tone-shadow: rgb(139 92 246 / 18%);
  --tone-main: #7c3aed;
}

.tone-sky {
  --tone-bg: linear-gradient(135deg, rgb(14 165 233 / 10%), rgb(59 130 246 / 10%));
  --tone-border: #bae6fd;
  --tone-shadow: rgb(14 165 233 / 18%);
  --tone-main: #0284c7;
}

.tone-red {
  --tone-bg: linear-gradient(135deg, rgb(239 68 68 / 10%), rgb(249 115 22 / 10%));
  --tone-border: #fecaca;
  --tone-shadow: rgb(239 68 68 / 16%);
  --tone-main: #dc2626;
}

.tone-slate {
  --tone-bg: linear-gradient(135deg, rgb(100 116 139 / 10%), rgb(107 114 128 / 10%));
  --tone-border: #cbd5e1;
  --tone-shadow: rgb(100 116 139 / 17%);
  --tone-main: #475569;
}

.tone-fuchsia {
  --tone-bg: linear-gradient(135deg, rgb(217 70 239 / 10%), rgb(236 72 153 / 10%));
  --tone-border: #f5d0fe;
  --tone-shadow: rgb(217 70 239 / 17%);
  --tone-main: #c026d3;
}

.hud-corner {
  position: absolute;
  z-index: 2;
  width: 8px;
  height: 8px;
  border-color: #cbd5e1;
  opacity: .65;
}

.top-left {
  top: 16px;
  left: 16px;
  border-top: 1px solid;
  border-left: 1px solid;
}

.top-right {
  top: 16px;
  right: 16px;
  border-top: 1px solid;
  border-right: 1px solid;
}

.bottom-left {
  bottom: 16px;
  left: 16px;
  border-bottom: 1px solid;
  border-left: 1px solid;
}

.bottom-right {
  right: 16px;
  bottom: 16px;
  border-right: 1px solid;
  border-bottom: 1px solid;
}

.shimmer {
  position: absolute;
  top: 0;
  left: -110%;
  z-index: 1;
  width: 48%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 76%), transparent);
  transform: skewX(-20deg);
}

.feature-card:hover .shimmer,
.feature-card:focus-visible .shimmer {
  animation: shimmer 1.8s linear;
}

.watermark-icon {
  position: absolute;
  right: -34px;
  bottom: -34px;
  z-index: 1;
  width: 160px;
  height: 160px;
  color: #0f172a;
  opacity: .045;
  pointer-events: none;
  transition: opacity .5s ease, transform .5s ease;
}

.feature-card.is-tall .watermark-icon {
  width: 260px;
  height: 260px;
}

.feature-card:hover .watermark-icon,
.feature-card:focus-visible .watermark-icon {
  opacity: .065;
  transform: rotate(12deg) scale(1.08);
}

.feature-content {
  position: relative;
  z-index: 3;
  display: flex;
  min-height: 100%;
  flex-direction: column;
  justify-content: space-between;
}

.feature-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.feature-icon {
  position: relative;
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  box-shadow: 0 8px 18px rgb(100 116 139 / 10%);
  color: #334155;
  transition: transform .4s ease;
}

.feature-icon svg {
  width: 24px;
  height: 24px;
}

.feature-card:not(.is-tall) .feature-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
}

.feature-card:not(.is-tall) .feature-icon svg {
  width: 20px;
  height: 20px;
}

.feature-card:hover .feature-icon,
.feature-card:focus-visible .feature-icon {
  color: var(--tone-main);
  transform: scale(1.08);
}

.feature-arrow {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: rgb(255 255 255 / 64%);
  box-shadow: 0 8px 16px rgb(100 116 139 / 9%);
  color: #94a3b8;
  transition: background .24s ease, border-color .24s ease, color .24s ease;
}

.feature-arrow svg {
  width: 16px;
  height: 16px;
}

.feature-card:hover .feature-arrow,
.feature-card:focus-visible .feature-arrow {
  border-color: #0f172a;
  background: #0f172a;
  color: white;
}

.feature-copy {
  margin-top: 20px;
}

.feature-card:not(.is-tall) .feature-copy {
  margin-top: 10px;
}

.feature-subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}

.feature-subtitle span {
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
  transition: color .24s ease;
}

.feature-card:hover .feature-subtitle span,
.feature-card:focus-visible .feature-subtitle span {
  color: var(--tone-main);
}

.feature-subtitle i {
  display: block;
  flex: 1 1 auto;
  border-bottom: 1px dashed rgb(203 213 225 / 75%);
}

.feature-copy h2 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 950;
  letter-spacing: 0;
}

.feature-card:not(.is-tall) .feature-copy h2 {
  font-size: 17px;
  line-height: 1.15;
}

.feature-visual {
  display: grid;
  gap: 12px;
  margin: 24px 0 12px;
  opacity: .72;
  transition: opacity .24s ease;
}

.feature-card:hover .feature-visual,
.feature-card:focus-visible .feature-visual {
  opacity: 1;
}

.feature-visual div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-visual span {
  width: 4px;
  height: 13px;
  border-radius: 999px;
  background: rgb(59 130 246 / 38%);
}

.feature-visual div:nth-child(2) span {
  background: rgb(99 102 241 / 38%);
}

.feature-visual div:nth-child(3) span {
  background: rgb(6 182 212 / 38%);
}

.data-bar {
  display: block;
  height: 6px;
  border-radius: 999px;
  background: rgb(203 213 225 / 76%);
  animation: pulse-width 2s infinite ease-in-out alternate;
}

.feature-visual div:nth-child(1) .data-bar {
  animation-delay: 0s;
}

.feature-visual div:nth-child(2) .data-bar {
  animation-delay: .3s;
}

.feature-visual div:nth-child(3) .data-bar {
  animation-delay: .6s;
}

.feature-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  border-top: 1px solid #e2e8f0;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .12em;
  padding-right: 12px;
  padding-left: 12px;
  padding-top: 14px;
  text-transform: uppercase;
}

.feature-card:not(.is-tall) .feature-status {
  margin-top: 8px;
  padding-top: 7px;
}

.feature-status span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.feature-status i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #34d399;
  box-shadow: 0 0 8px rgb(52 211 153 / 75%);
  animation: status-pulse 1.2s infinite ease-in-out;
}

.feature-card:hover .feature-status span,
.feature-card:focus-visible .feature-status span {
  color: #10b981;
}

.feature-status b {
  color: #cbd5e1;
  font: inherit;
}

.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  background: rgb(255 255 255 / 42%);
  padding: 20px;
  backdrop-filter: blur(7px);
}

.modal-card {
  width: min(100%, 672px);
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 100%);
  border-radius: 12px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 30px 70px rgb(100 116 139 / 24%);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid #eef2f7;
  padding: 24px;
}

.modal-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 16px;
}

.modal-icon {
  display: grid;
  width: 54px;
  height: 54px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid white;
  border-radius: 10px;
  background: var(--tone-bg);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 70%);
  color: #334155;
}

.modal-icon svg {
  width: 24px;
  height: 24px;
}

.modal-title h2 {
  margin: 0;
  color: #1e293b;
  font-size: 20px;
  font-weight: 950;
}

.modal-title p {
  margin: 4px 0 0;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 750;
}

.modal-close {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: background .2s ease, color .2s ease;
}

.modal-close:hover,
.modal-close:focus-visible {
  background: #f1f5f9;
  color: #475569;
  outline: none;
}

.modal-close svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  display: flex;
  min-height: 334px;
  flex-direction: column;
  background: rgb(248 250 252 / 72%);
  padding: 24px;
}

.modal-body > p {
  margin: 0 0 22px;
  color: #64748b;
  line-height: 1.7;
}

.lab-console {
  position: relative;
  display: grid;
  flex: 1 1 auto;
  min-height: 230px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  box-shadow: 0 12px 26px rgb(100 116 139 / 9%);
  padding: 24px;
}

.console-loading {
  display: grid;
  place-items: center;
  gap: 15px;
  align-content: center;
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.console-loading svg {
  width: 32px;
  height: 32px;
  color: #2563eb;
  animation: icon-spin 1s linear infinite;
}

.console-ready {
  position: relative;
  min-height: 100%;
  overflow: hidden;
  color: #475569;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 14px;
}

.console-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  border-bottom: 1px solid #eef2f7;
  color: #94a3b8;
  font-size: 12px;
  padding-bottom: 10px;
}

.console-status i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #4ade80;
  animation: status-pulse 1.2s infinite ease-in-out;
}

.console-lines {
  display: grid;
  gap: 12px;
  animation: fade-in .5s ease-out forwards;
}

.console-lines p {
  margin: 0;
}

.console-lines p:first-child {
  color: #2563eb;
}

.console-lines strong {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #1e293b;
  font-weight: 900;
}

.console-lines strong svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  color: #f59e0b;
}

.scan-line {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
  opacity: .6;
  animation: scan 2s infinite linear;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #eef2f7;
  background: white;
  padding: 16px;
}

.ghost-button,
.primary-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 850;
  padding: 0 20px;
  transition: background .2s ease, box-shadow .2s ease, color .2s ease, transform .2s ease;
}

.ghost-button {
  background: transparent;
  color: #475569;
}

.ghost-button:hover,
.ghost-button:focus-visible {
  background: #f1f5f9;
  outline: none;
}

.primary-button {
  gap: 8px;
  background: #0f172a;
  box-shadow: 0 12px 24px rgb(100 116 139 / 18%);
  color: white;
}

.primary-button:hover,
.primary-button:focus-visible {
  background: #020617;
  outline: none;
  transform: translateY(-1px);
}

.primary-button svg {
  width: 16px;
  height: 16px;
  transition: transform .2s ease;
}

.primary-button:hover svg,
.primary-button:focus-visible svg {
  transform: translateX(3px);
}

.lab-modal-enter-active,
.lab-modal-leave-active {
  transition: opacity .18s ease;
}

.lab-modal-enter-active .modal-card,
.lab-modal-leave-active .modal-card {
  transition: opacity .22s ease, transform .22s ease;
}

.lab-modal-enter-from,
.lab-modal-leave-to {
  opacity: 0;
}

.lab-modal-enter-from .modal-card,
.lab-modal-leave-to .modal-card {
  opacity: 0;
  transform: scale(.96) translateY(8px);
}

@keyframes typing {
  from {
    width: 0;
  }
  to {
    width: 190px;
  }
}

@keyframes blink {
  from,
  to {
    border-color: transparent;
  }
  50% {
    border-color: #3b82f6;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  from {
    left: -110%;
  }
  to {
    left: 210%;
  }
}

@keyframes pulse-width {
  from {
    width: 30%;
    opacity: .45;
  }
  to {
    width: 90%;
    opacity: .9;
  }
}

@keyframes scan {
  0% {
    top: 0;
    opacity: 0;
  }
  10%,
  90% {
    opacity: .8;
  }
  100% {
    top: 100%;
    opacity: 0;
  }
}

@keyframes icon-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes status-pulse {
  0%,
  100% {
    opacity: .55;
    transform: scale(.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@media (max-width: 1040px) {
  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .lab-shell {
    width: min(100% - 28px, 1290px);
    padding: 64px 0 56px;
  }

  .lab-hud {
    display: none;
  }

  .lab-hero {
    margin-bottom: 34px;
    text-align: left;
  }

  .lab-badge {
    max-width: 100%;
    font-size: 12px;
  }

  .lab-hero h1 {
    font-size: 42px;
  }

  .lab-hero h1 span {
    display: block;
    margin: 6px 0 0;
  }

  .lab-hero p {
    margin-top: 22px;
    font-size: 16px;
    line-height: 1.75;
  }

  .feature-grid {
    grid-auto-rows: auto;
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .feature-card,
  .feature-card.is-wide,
  .feature-card.is-tall {
    grid-column: auto;
    grid-row: auto;
    min-height: 210px;
    padding: 20px;
  }

  .feature-card.is-tall.has-visual {
    min-height: 300px;
  }

  .feature-card:not(.is-tall) .feature-copy p,
  .feature-copy p {
    -webkit-line-clamp: 2;
  }

  .modal-layer {
    padding: 14px;
  }

  .modal-card {
    max-height: calc(100dvh - 28px);
    overflow-y: auto;
  }

  .modal-header {
    padding: 18px;
  }

  .modal-body {
    min-height: auto;
    padding: 18px;
  }

  .lab-console {
    min-height: 230px;
    padding: 18px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .ghost-button,
  .primary-button {
    width: 100%;
  }
}
</style>
