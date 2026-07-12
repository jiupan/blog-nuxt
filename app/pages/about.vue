<template>
  <div class="about-page">
    <section class="about-hero">
      <div class="about-hero-copy">
        <div class="status-pill">
          <span aria-hidden="true"></span>
          持续记录和打磨这个博客
        </div>

        <h1>
          你好，这里是
          <span>{{ siteName }}</span>
        </h1>

        <p>
          我把这里当作长期写作、技术整理和生活观察的空间。页面会围绕真实内容展开：最近在写什么、常用什么工具，以及这个站点如何被一点点维护起来。
        </p>

        <div class="hero-actions">
          <NuxtLink to="/archive" class="primary-action">
            查看文章
            <ArrowRightIcon aria-hidden="true" />
          </NuxtLink>
          <div class="social-actions" aria-label="快捷入口">
            <NuxtLink to="/archive" aria-label="归档" data-tooltip="归档">
              <ArchiveIcon aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/link" aria-label="友链" data-tooltip="友链">
              <LinkIcon aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/admin" aria-label="后台" data-tooltip="后台">
              <SettingsIcon aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="about-portrait-wrap" aria-label="站点资料">
        <div class="portrait-backdrop" aria-hidden="true"></div>
        <div class="about-portrait">
          <img :src="profileImage" :alt="siteName">
        </div>
        <div class="portrait-note">
          <span>{{ totalPosts }}</span>
          篇已发布文章
        </div>
      </div>
    </section>

    <section class="about-section article-section">
      <div class="section-heading">
        <div>
          <h2>最新随笔</h2>
          <p>从最近的发布里了解这里正在关注什么。</p>
        </div>
        <NuxtLink to="/posts" class="section-link">
          查看全部
          <ArrowRightIcon aria-hidden="true" />
        </NuxtLink>
      </div>

      <div v-if="latestPosts.length" class="article-grid">
        <article v-for="post in latestPosts" :key="post.id" class="article-card">
          <div class="article-meta">
            <time>{{ formatFullDate(post.publishedAt) }}</time>
            <NuxtLink v-if="post.category" :to="`/categories/${post.category.slug}`">{{ post.category.name }}</NuxtLink>
            <span v-else>未分类</span>
          </div>
          <NuxtLink :to="postPath(post.slug)" class="article-title">{{ post.title }}</NuxtLink>
          <p>{{ post.summary || '这篇文章还没有摘要，点进去看看完整内容。' }}</p>
        </article>
      </div>

      <div v-else class="empty-about-card">
        <h3>还没有公开文章</h3>
        <p>发布第一篇文章后，这里会自动显示最新内容。</p>
      </div>
    </section>

    <section class="about-section skill-section">
      <div class="skill-copy">
        <h2>我所关注的</h2>
        <p>
          这个站点主要围绕写作、前端工程和内容管理展开。比起罗列复杂履历，我更愿意把能长期复用的经验沉淀成文章和工具。
        </p>

        <div class="skill-bars">
          <div v-for="skill in skills" :key="skill.name" class="skill-row">
            <div>
              <span>{{ skill.name }}</span>
              <strong>{{ skill.level }}%</strong>
            </div>
            <div class="skill-track">
              <span :style="{ width: `${skill.level}%` }"></span>
            </div>
          </div>
        </div>
      </div>

      <div class="tag-cloud" aria-label="标签">
        <NuxtLink
          v-for="tag in displayTags"
          :key="tag.label"
          :to="tag.to"
          class="tag-chip"
        >
          {{ tag.label }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Archive as ArchiveIcon,
  ArrowRight as ArrowRightIcon,
  Link as LinkIcon,
  Settings as SettingsIcon
} from '@lucide/vue'

type CategoryLite = {
  name: string
  slug: string
}

type TagLite = {
  name: string
  slug: string
}

type AboutPost = {
  id: number
  title: string
  slug: string
  summary?: string | null
  cover?: string | null
  publishedAt?: string | Date | null
  category?: CategoryLite | null
}

type TaxonomyItem = {
  id: number
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

type PostsPayload = {
  items: AboutPost[]
  total: number
}

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()

const [{ data: postData }, { data: tagData }] = await Promise.all([
  useFetch<{ data: PostsPayload }>('/api/posts', { query: { page: 1, pageSize: 3 } }),
  useFetch<{ data: TaxonomyItem[] }>('/api/tags')
])

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const latestPosts = computed(() => postData.value?.data.items || [])
const totalPosts = computed(() => postData.value?.data.total || 0)
const profileImage = computed(() => latestPosts.value.find((post) => post.cover)?.cover || siteSettings.value.site_logo || '/images/home-hero-ai.png')

const skills = [
  { name: '内容写作与整理', level: 88 },
  { name: '前端开发与体验优化', level: 84 },
  { name: '全栈博客维护', level: 76 }
]

const fallbackTags: TagLite[] = [
  { name: 'Nuxt', slug: 'nuxt' },
  { name: 'TypeScript', slug: 'typescript' },
  { name: 'Markdown', slug: 'markdown' },
  { name: 'PostgreSQL', slug: 'postgresql' },
  { name: 'Prisma', slug: 'prisma' },
  { name: 'Web Performance', slug: 'web-performance' },
  { name: 'Writing', slug: 'writing' },
  { name: 'Design', slug: 'design' }
]

const displayTags = computed(() => {
  const source = tagData.value?.data.length ? tagData.value.data.slice(0, 10) : fallbackTags
  return source.map((tag) => ({
    label: tag.name,
    to: tagData.value?.data.length ? `/tags/${tag.slug}` : '/posts'
  }))
})

useSeoMeta({
  title: () => `关于 - ${siteName.value}`,
  description: () => siteSettings.value.seo_description || `${siteName.value} 的关于页面`
})

function formatFullDate(value?: string | Date | null) {
  if (!value) {
    return '未设置日期'
  }

  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  color: var(--theme-text);
}

.about-hero,
.about-section {
  width: min(100% - 32px, 1040px);
  margin: 0 auto;
}

.about-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: 72px;
  align-items: center;
  padding: 112px 0 76px;
}

.about-hero-copy {
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbe6df;
  border-radius: 999px;
  background: var(--theme-success-soft);
  padding: 5px 11px;
  color: #5e8271;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.status-pill span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #70bd88;
  box-shadow: 0 0 0 4px rgba(112, 189, 136, 0.16);
}

.about-hero h1 {
  max-width: 720px;
  margin: 24px 0 0;
  color: var(--theme-text);
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: clamp(42px, 7vw, 72px);
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.04;
}

.about-hero h1 span {
  color: var(--theme-text-muted);
  font-style: italic;
}

.about-hero p {
  max-width: 620px;
  margin: 24px 0 0;
  color: var(--theme-text-muted);
  font-size: 16px;
  line-height: 1.9;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  margin-top: 30px;
}

.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, #2f8f68 72%, var(--theme-border));
  background: linear-gradient(135deg, #277a5b, #356f5b);
  padding: 0 18px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 12px 26px rgb(20 83 62 / 18%);
  transition: border-color 160ms ease, box-shadow 160ms ease, filter 160ms ease, transform 160ms ease;
}

.primary-action:hover {
  border-color: #55b58c;
  box-shadow: 0 16px 34px rgb(47 143 104 / 24%);
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.primary-action:focus-visible {
  outline: 3px solid color-mix(in srgb, #55b58c 32%, transparent);
  outline-offset: 3px;
}

.primary-action svg {
  width: 17px;
  height: 17px;
}

.social-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.social-actions a {
  position: relative;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
  color: var(--theme-text-faint);
  transition: background-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.social-actions a:hover {
  background: var(--theme-success-soft);
  color: var(--theme-text);
  transform: translateY(-1px);
}

.social-actions svg {
  width: 20px;
  height: 20px;
}

.about-portrait-wrap {
  position: relative;
  display: grid;
  justify-items: center;
  padding: 20px 0 42px;
}

.portrait-backdrop {
  position: absolute;
  inset: 50px 12px 28px;
  border: 1px solid #dde4df;
  border-radius: 8px;
  background: var(--theme-success-soft);
  transform: rotate(-6deg);
}

.about-portrait {
  position: relative;
  z-index: 1;
  width: min(100%, 260px);
  aspect-ratio: 1;
  overflow: hidden;
  border: 6px solid #ffffff;
  border-radius: 8px;
  background: #edf1f5;
  box-shadow: 0 24px 44px rgba(38, 50, 56, 0.16);
  transform: rotate(3deg);
  transition: filter 300ms ease, transform 300ms ease;
}

.about-portrait:hover {
  transform: rotate(0deg) translateY(-2px);
}

.about-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(1);
  transition: filter 300ms ease;
}

.about-portrait:hover img {
  filter: grayscale(0);
}

.portrait-note {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: grid;
  gap: 2px;
  min-width: 126px;
  border: 1px solid #e1e7e2;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  padding: 12px 14px;
  color: var(--theme-text-muted);
  font-size: 12px;
  box-shadow: 0 16px 30px rgba(38, 50, 56, 0.12);
  backdrop-filter: blur(12px);
}

.portrait-note span {
  color: var(--theme-text);
  font-size: 22px;
  font-weight: 850;
  line-height: 1;
}

.about-section {
  padding: 68px 0;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 32px;
}

.section-heading h2,
.skill-copy h2 {
  margin: 0;
  color: var(--theme-text);
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: 34px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.2;
}

.section-heading p,
.skill-copy p {
  margin: 8px 0 0;
  color: var(--theme-text-muted);
  line-height: 1.8;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--theme-text-muted);
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
  transition: color 160ms ease, transform 160ms ease;
}

.section-link:hover {
  color: var(--theme-text);
  transform: translateX(2px);
}

.section-link svg {
  width: 16px;
  height: 16px;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.article-card,
.empty-about-card {
  border: 1px solid #edf0ed;
  border-radius: 8px;
  background: var(--theme-surface);
  box-shadow:
    0 2px 14px rgba(38, 50, 56, 0.05),
    0 16px 30px rgba(38, 50, 56, 0.04);
}

.article-card {
  min-height: 210px;
  padding: 24px;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.article-card:hover {
  border-color: var(--theme-border);
  box-shadow:
    0 4px 18px rgba(38, 50, 56, 0.07),
    0 24px 42px rgba(38, 50, 56, 0.08);
  transform: translateY(-3px);
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  color: var(--theme-text-faint);
  font-size: 12px;
}

.article-meta a,
.article-meta span {
  border-radius: 999px;
  background: var(--theme-success-soft);
  padding: 4px 9px;
  color: #5d8270;
  font-weight: 750;
}

.article-title {
  display: block;
  margin-top: 18px;
  color: var(--theme-text);
  font-size: 17px;
  font-weight: 850;
  line-height: 1.55;
  transition: color 160ms ease;
}

.article-title:hover {
  color: var(--theme-text-muted);
}

.article-card p,
.empty-about-card p {
  display: -webkit-box;
  overflow: hidden;
  margin: 12px 0 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: var(--theme-text-muted);
  font-size: 14px;
  line-height: 1.8;
}

.empty-about-card {
  padding: 28px;
}

.empty-about-card h3 {
  margin: 0;
  color: var(--theme-text);
  font-size: 18px;
}

.skill-section {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(280px, 1.08fr);
  gap: 72px;
  align-items: center;
}

.skill-copy p {
  max-width: 520px;
}

.skill-bars {
  display: grid;
  gap: 18px;
  margin-top: 28px;
}

.skill-row > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 7px;
  color: var(--theme-text-soft);
  font-size: 13px;
  font-weight: 800;
}

.skill-row strong {
  color: var(--theme-text-faint);
  font-size: 12px;
}

.skill-track {
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: var(--theme-border);
}

.skill-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--theme-text-muted);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-content: center;
}

.tag-chip {
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-surface);
  padding: 9px 15px;
  color: var(--theme-text-muted);
  font-size: 13px;
  line-height: 1;
  box-shadow: 0 7px 16px rgba(38, 50, 56, 0.04);
  transition: border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.tag-chip:hover {
  border-color: var(--theme-border);
  color: #4f7564;
  transform: translateY(-1px);
}

@media (max-width: 860px) {
  .about-hero {
    grid-template-columns: 1fr;
    gap: 34px;
    padding: 82px 0 56px;
  }

  .about-portrait-wrap {
    order: -1;
    width: min(100%, 340px);
    margin: 0 auto;
  }

  .about-hero h1 {
    font-size: clamp(38px, 11vw, 54px);
  }

  .article-grid,
  .skill-section {
    grid-template-columns: 1fr;
  }

  .skill-section {
    gap: 34px;
  }
}

@media (max-width: 640px) {
  .about-hero,
  .about-section {
    width: min(100% - 24px, 1040px);
  }

  .about-hero {
    padding-top: 62px;
  }

  .hero-actions,
  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .primary-action {
    width: 100%;
  }

  .section-heading h2,
  .skill-copy h2 {
    font-size: 30px;
  }

  .about-section {
    padding: 52px 0;
  }

  .article-card {
    min-height: 0;
  }
}
</style>
