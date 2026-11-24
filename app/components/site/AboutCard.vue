<template>
  <section class="about-card" :aria-labelledby="titleId" :data-theme="theme">
    <div class="portrait-shell">
      <div class="portrait-glow" aria-hidden="true" />
      <video v-if="avatarIsVideo" :src="authorAvatar" :autoplay="!preview" muted loop playsinline preload="metadata" :aria-label="`${authorName} 的头像视频`" />
      <img v-else-if="authorAvatar" :src="authorAvatar" :alt="authorName">
      <span v-else>
        <template v-if="authorInitial">{{ authorInitial }}</template>
        <Icon v-else name="i-lucide-user-round" aria-hidden="true" />
      </span>
      <i aria-hidden="true" />
    </div>

    <div class="about-intro">
      <p class="about-eyebrow">HELLO, NICE TO MEET YOU</p>
      <component :is="preview ? 'h3' : 'h1'" :id="titleId" class="about-title">
        <template v-if="name">你好，我是 <span>{{ name }}</span></template>
        <template v-else>关于作者</template>
      </component>
      <component :is="preview ? 'p' : 'h2'" v-if="subtitle" class="about-subtitle">{{ subtitle }}</component>
      <p v-if="description" class="about-description">{{ description }}</p>
    </div>

    <section v-if="groups.length" class="stack-section" :aria-labelledby="stackId">
      <component :is="preview ? 'h4' : 'h2'" :id="stackId" class="section-label">个人技术栈</component>
      <div v-for="(group, groupIndex) in groups" :key="groupIndex" class="stack-group">
        <component :is="preview ? 'h5' : 'h3'" v-if="group.name || groups.length > 1" class="stack-group-title">{{ group.name || '未分组' }}</component>
        <div class="stack-list">
          <span v-for="(tech, itemIndex) in group.items" :key="itemIndex" class="stack-chip">
            <Icon v-if="tech.icon" :name="tech.icon" aria-hidden="true" />
            {{ tech.name }}
          </span>
        </div>
      </div>
    </section>

    <div class="about-actions">
      <component :is="preview ? 'div' : 'nav'" class="social-links" :aria-label="preview ? undefined : '关于页快捷入口'">
        <component
          :is="actionElement"
          v-for="action in shortcuts"
          :key="action.to"
          v-bind="actionAttributes(action.to)"
          class="about-shortcut"
          :aria-label="action.label"
          :data-tooltip="preview ? undefined : action.label"
        >
          <Icon :name="action.icon" aria-hidden="true" />
        </component>
      </component>
      <component :is="actionElement" v-bind="actionAttributes('/archive')" class="posts-link">
        浏览文章
        <Icon name="i-lucide-external-link" aria-hidden="true" />
      </component>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
import { visibleAboutGroups, type AboutProfile } from '~~/shared/about-profile'
import '~/assets/css/about-scene.css'

const props = defineProps<{
  profile: AboutProfile;
  authorAvatar: string;
  preview?: boolean;
  theme?: 'light' | 'dark'
}>()

const previewId = useId()
const titleId = computed(() => props.preview ? `${previewId}-title` : 'about-title')
const stackId = computed(() => props.preview ? `${previewId}-stack` : 'stack-title')
const name = computed(() => props.profile.name.trim())
const subtitle = computed(() => props.profile.subtitle.trim())
const description = computed(() => props.profile.description.trim())
const groups = computed(() => visibleAboutGroups(props.profile.groups))
const authorName = computed(() => name.value || '作者')
const authorInitial = computed(() => Array.from(name.value)[0]?.toUpperCase() || '')
const avatarIsVideo = computed(() => /\.(?:mp4|webm)(?:$|[?#])/i.test(props.authorAvatar))
const actionElement = computed(() => props.preview ? 'span' : NuxtLink)

const shortcuts = [
  { to: '/archive', label: '文章归档', icon: 'i-lucide-archive' },
  { to: '/link', label: '网站导航', icon: 'i-lucide-link' },
  { to: '/admin', label: '管理后台', icon: 'i-lucide-settings' }
]

function actionAttributes(to: string) {
  return props.preview ? { role: 'link', 'aria-disabled': 'true' } : { to }
}
</script>

<style scoped>
.about-card {
  display: flex;
  width: min(100%, 530px);
  align-items: center;
  flex-direction: column;
  border: 1px solid rgb(255 255 255 / 88%);
  border-radius: 27px;
  background: rgb(255 255 255 / 62%);
  box-shadow: 0 20px 54px rgb(30 41 59 / 12%);
  padding: clamp(26px, 4vw, 39px);
  font-family: var(--site-font-family);
  text-align: center;
  backdrop-filter: blur(24px);
}

.portrait-shell {
  position: relative;
  width: clamp(94px, 11vw, 104px);
  height: clamp(94px, 11vw, 104px);
}

.portrait-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa, #818cf8, #c084fc);
  filter: blur(5px);
  opacity: .42;
  transition: opacity .3s ease;
}

.portrait-shell:hover .portrait-glow {
  opacity: .8;
}

.portrait-shell img,
.portrait-shell video,
.portrait-shell > span {
  position: relative;
  width: 100%;
  height: 100%;
  border: 3px solid rgb(255 255 255 / 94%);
  border-radius: 50%;
  background: #f1f5f9;
  object-fit: cover;
  transition: transform .35s ease;
}

.portrait-shell > span {
  display: grid;
  place-items: center;
  color: var(--theme-text);
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 28px;
  font-weight: 700;
}

.portrait-shell > i {
  position: absolute;
  right: 5px;
  bottom: 4px;
  z-index: 2;
  width: 12px;
  height: 12px;
  border: 2px solid var(--theme-surface);
  border-radius: 50%;
  background: #4ade80;
}

.portrait-shell:hover img,
.portrait-shell:hover video {
  transform: scale(1.035);
}

.about-intro {
  margin-top: 14px;
  overflow-wrap: anywhere;
}

.about-eyebrow,
.section-label {
  margin: 0;
  color: var(--theme-text-faint);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .18em;
}

.about-title {
  margin: 8px 0 0;
  color: var(--theme-text);
  font-size: clamp(27px, 4vw, 34px);
  font-weight: 900;
  letter-spacing: -.045em;
  line-height: 1.15;
}

.about-title span {
  background: linear-gradient(100deg, #2563eb, #6366f1 55%, #8b5cf6);
  background-clip: text;
  color: transparent;
}

.about-subtitle {
  margin: 7px 0 0;
  color: var(--theme-text-soft);
  font-size: clamp(13px, 1.7vw, 14px);
  font-weight: 650;
}

.about-description {
  max-width: 390px;
  margin: 7px auto 0;
  color: var(--theme-text-muted);
  font-size: 11px;
  line-height: 1.65;
  white-space: pre-line;
}

.stack-section {
  width: 100%;
  margin-top: 17px;
  padding-top: 14px;
  border-top: 1px solid rgb(148 163 184 / 18%);
}

.stack-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin-top: 8px;
}

.stack-group + .stack-group {
  margin-top: 12px;
}

.stack-group-title {
  margin: 8px 0 0;
  color: var(--theme-text-muted);
  font-size: 11px;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.stack-chip {
  display: inline-flex;
  max-width: 100%;
  min-height: 27px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgb(148 163 184 / 20%);
  border-radius: 999px;
  background: rgb(255 255 255 / 68%);
  box-shadow: 0 6px 16px rgb(30 41 59 / 5%);
  color: var(--theme-text-soft);
  padding: 0 10px;
  font-size: 10px;
  font-weight: 750;
  overflow-wrap: anywhere;
  transition: background .2s ease, transform .2s ease;
}

.stack-chip:hover {
  background: rgb(255 255 255 / 94%);
  transform: translateY(-2px);
}

.stack-chip svg,
.stack-chip :deep(.iconify) {
  width: 12px;
  height: 12px;
  flex: none;
  color: #6366f1;
}

.about-actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-top: 16px;
}

.social-links {
  display: flex;
  gap: 7px;
}

.about-shortcut {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 10px;
  background: rgb(255 255 255 / 72%);
  box-shadow: 0 7px 18px rgb(30 41 59 / 6%);
  color: var(--theme-text-muted);
  transition: color .2s ease, transform .2s ease, box-shadow .2s ease;
}

.about-shortcut:not([aria-disabled]):hover {
  color: #4f46e5;
  box-shadow: 0 12px 24px rgb(79 70 229 / 13%);
  transform: translateY(-2px);
}

.social-links svg,
.posts-link svg {
  width: 14px;
  height: 14px;
}

.posts-link {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  background: #172033;
  box-shadow: 0 12px 26px rgb(15 23 42 / 20%);
  color: #fff;
  padding: 0 14px;
  font-size: 10px;
  font-weight: 800;
  transition: background .2s ease, transform .2s ease, box-shadow .2s ease;
}

.posts-link:not([aria-disabled]):hover {
  background: #26344d;
  box-shadow: 0 16px 30px rgb(15 23 42 / 25%);
  transform: translateY(-2px);
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme]))) {
  border-color: rgb(255 255 255 / 10%);
  background: rgb(15 23 42 / 40%);
  box-shadow: 0 30px 90px rgb(0 0 0 / 35%);
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .portrait-shell img),
:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .portrait-shell video),
:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .portrait-shell > span) {
  border-color: #1e293b;
  background: #0f172a;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-eyebrow),
:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .section-label) {
  color: #64748b;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-title) {
  color: #f8fafc;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-title span) {
  background-image: linear-gradient(100deg, #22d3ee, #60a5fa 55%, #818cf8);
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-subtitle) {
  color: #cbd5e1;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-description) {
  color: #94a3b8;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .stack-section) {
  border-color: rgb(51 65 85 / 62%);
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .stack-chip) {
  border-color: rgb(51 65 85 / 72%);
  background: rgb(30 41 59 / 52%);
  box-shadow: none;
  color: #f1f5f9;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-shortcut) {
  border-color: rgb(51 65 85 / 68%);
  background: rgb(30 41 59 / 80%);
  box-shadow: none;
  color: #cbd5e1;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .stack-chip:hover),
:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-shortcut:not([aria-disabled]):hover) {
  background: #334155;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .about-shortcut:not([aria-disabled]):hover) {
  color: #22d3ee;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .posts-link) {
  background: #06b6d4;
  box-shadow: 0 0 28px rgb(6 182 212 / 28%);
  color: #020617;
}

:global(:is(.about-card[data-theme="dark"], .dark .about-card:not([data-theme])) .posts-link:not([aria-disabled]):hover) {
  background: #22d3ee;
}

@media (max-width: 640px) {
  .about-card {
    border-radius: 24px;
    padding: 26px 18px;
  }

  .about-intro {
    margin-top: 13px;
  }

  .about-description {
    font-size: 11px;
  }

  .stack-section {
    margin-top: 16px;
    padding-top: 13px;
  }

  .stack-chip {
    min-height: 27px;
    padding: 0 10px;
    font-size: 10px;
  }

  .about-actions {
    gap: 12px;
    margin-top: 16px;
  }

  .social-links {
    justify-content: center;
  }

}

@media (max-width: 380px) {
  .about-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .posts-link { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .portrait-shell img,
  .portrait-shell video,
  .stack-chip,
  .about-shortcut,
  .posts-link {
    transition: none;
  }
}
</style>
