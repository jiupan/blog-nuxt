<template>
  <div class="link-page">
    <section class="link-hero">
      <div class="hero-pill">
        <LinkIcon aria-hidden="true" />
        Blogroll
      </div>
      <h1>友链</h1>
      <p>
        这里收集常去的网站、喜欢的工具，以及值得反复阅读的内容来源。
      </p>
    </section>

    <section class="link-shell">
      <div class="link-group">
        <div class="group-heading">
          <h2>星标推荐</h2>
          <span aria-hidden="true"></span>
        </div>

        <div class="featured-grid">
          <a
            v-for="link in featuredLinks"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="featured-card"
          >
            <span class="featured-avatar" :class="link.avatarClass">{{ link.initials }}</span>
            <span class="featured-copy">
              <strong>{{ link.name }}</strong>
              <small>{{ link.description }}</small>
              <em>{{ link.label }}</em>
            </span>
          </a>
        </div>
      </div>

      <div class="link-group">
        <div class="group-heading">
          <h2>技术与工具</h2>
          <span aria-hidden="true"></span>
        </div>

        <div class="compact-grid">
          <a
            v-for="link in regularLinks"
            :key="link.url"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="compact-card"
          >
            <span class="compact-avatar" :class="link.avatarClass">{{ link.initials }}</span>
            <span>
              <strong>{{ link.name }}</strong>
              <small>{{ link.description }}</small>
            </span>
          </a>
        </div>
      </div>

      <section class="exchange-panel">
        <div class="exchange-copy">
          <h2>申请交换链接</h2>
          <p>
            欢迎原创内容、长期维护的个人站点互换链接。添加前可以先把本站信息放到你的友链页，再通过邮件告诉我。
          </p>
          <div class="site-snippet">
            <p><span>名称：</span>{{ siteName }}</p>
            <p><span>简介：</span>{{ siteDescription }}</p>
            <p><span>网址：</span>{{ siteUrl }}</p>
            <p><span>头像：</span>{{ siteLogo || '可使用站点 favicon 或首页头像' }}</p>
          </div>
        </div>

        <div class="exchange-action">
          <a href="mailto:hello@example.com">
            <SendIcon aria-hidden="true" />
            邮件申请
          </a>
          <p>请附上站点名称、地址、简介和头像链接。</p>
        </div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  Link as LinkIcon,
  Send as SendIcon
} from '@lucide/vue'

type FriendLink = {
  name: string
  description: string
  url: string
  label?: string
  initials: string
  avatarClass: string
}

const config = useRuntimeConfig()
const siteSettings = useSiteSettings()

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan Blog')
const siteUrl = computed(() => config.public.siteUrl || 'http://localhost:3000')
const siteLogo = computed(() => siteSettings.value.site_logo)
const siteDescription = computed(() => siteSettings.value.sidebar_description || siteSettings.value.site_subtitle || '记录技术、写作和日常思考')

const featuredLinks: FriendLink[] = [
  {
    name: 'Nuxt',
    description: '直观、完整的 Vue 全栈框架，也是这个博客当前使用的技术底座。',
    url: 'https://nuxt.com',
    label: 'Framework / Vue',
    initials: 'Nu',
    avatarClass: 'avatar-green'
  },
  {
    name: 'Prisma',
    description: '面向 TypeScript 的现代 ORM，用来管理本站的数据模型与数据库访问。',
    url: 'https://www.prisma.io',
    label: 'Database / ORM',
    initials: 'Pr',
    avatarClass: 'avatar-blue'
  }
]

const regularLinks: FriendLink[] = [
  {
    name: 'Vue',
    description: '渐进式 JavaScript 框架',
    url: 'https://vuejs.org',
    initials: 'Vu',
    avatarClass: 'avatar-emerald'
  },
  {
    name: 'Vite',
    description: '快速的前端构建工具',
    url: 'https://vite.dev',
    initials: 'Vi',
    avatarClass: 'avatar-purple'
  },
  {
    name: 'TypeScript',
    description: 'JavaScript 的类型系统',
    url: 'https://www.typescriptlang.org',
    initials: 'Ts',
    avatarClass: 'avatar-sky'
  },
  {
    name: 'MDN Web Docs',
    description: 'Web 标准与浏览器文档',
    url: 'https://developer.mozilla.org',
    initials: 'MD',
    avatarClass: 'avatar-gray'
  },
  {
    name: 'Nuxt UI',
    description: 'Nuxt 生态里的 UI 组件库',
    url: 'https://ui.nuxt.com',
    initials: 'UI',
    avatarClass: 'avatar-teal'
  }
]

useSeoMeta({
  title: () => `友链 - ${siteName.value}`,
  description: '友链与常用资源'
})
</script>

<style scoped>
.link-page {
  min-height: 70vh;
  color: #263238;
}

.link-hero,
.link-shell {
  width: min(100% - 32px, 1040px);
  margin: 0 auto;
}

.link-hero {
  display: grid;
  justify-items: center;
  padding: 84px 0 78px;
  text-align: center;
}

.hero-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #dce3ea;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  padding: 5px 12px;
  color: #6c7680;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 8px 20px rgba(38, 50, 56, 0.05);
}

.hero-pill svg {
  width: 14px;
  height: 14px;
  color: #738392;
}

.link-hero h1 {
  margin: 18px 0 0;
  color: #23313d;
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: clamp(42px, 7vw, 58px);
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.1;
}

.link-hero p {
  max-width: 640px;
  margin: 18px 0 0;
  color: #596674;
  font-size: 17px;
  line-height: 1.8;
}

.link-shell {
  padding-bottom: 84px;
}

.link-group + .link-group {
  margin-top: 58px;
}

.group-heading {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}

.group-heading h2,
.exchange-panel h2 {
  margin: 0;
  color: #263238;
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: 26px;
  font-weight: 550;
  letter-spacing: 0;
}

.group-heading span {
  height: 1px;
  flex: 1;
  background: #dce3ea;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.featured-card,
.compact-card,
.exchange-panel {
  border: 1px solid #e8edf2;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    0 2px 12px rgba(38, 50, 56, 0.04),
    0 16px 30px rgba(38, 50, 56, 0.03);
}

.featured-card {
  display: flex;
  align-items: center;
  gap: 24px;
  min-height: 150px;
  padding: 28px;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.featured-card:hover,
.compact-card:hover {
  border-color: #cbd8d2;
  box-shadow:
    0 4px 18px rgba(38, 50, 56, 0.07),
    0 24px 42px rgba(38, 50, 56, 0.08);
  transform: translateY(-3px);
}

.featured-avatar,
.compact-avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  color: #ffffff;
  font-weight: 900;
  letter-spacing: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.24);
}

.featured-avatar {
  width: 92px;
  height: 92px;
  font-size: 24px;
}

.featured-copy {
  min-width: 0;
}

.featured-copy strong,
.compact-card strong {
  display: block;
  color: #263238;
  font-weight: 850;
  line-height: 1.35;
}

.featured-copy strong {
  font-size: 20px;
}

.featured-copy small {
  display: block;
  margin-top: 8px;
  color: #66717d;
  font-size: 14px;
  line-height: 1.75;
}

.featured-copy em {
  display: inline-flex;
  margin-top: 12px;
  border-radius: 6px;
  background: #eef4f0;
  padding: 5px 8px;
  color: #647e73;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.compact-card {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  min-height: 86px;
  padding: 18px;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.compact-avatar {
  width: 52px;
  height: 52px;
  font-size: 15px;
}

.compact-card span:last-child {
  min-width: 0;
}

.compact-card strong,
.compact-card small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-card strong {
  font-size: 16px;
}

.compact-card small {
  display: block;
  margin-top: 4px;
  color: #66717d;
  font-size: 13px;
}

.exchange-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 44px;
  align-items: start;
  margin-top: 72px;
  padding: 38px;
}

.exchange-copy p {
  max-width: 680px;
  margin: 14px 0 0;
  color: #5d6875;
  line-height: 1.85;
}

.site-snippet {
  margin-top: 22px;
  border: 1px solid #dce3ea;
  border-radius: 8px;
  background: rgba(247, 249, 251, 0.82);
  padding: 16px;
  color: #53606d;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  line-height: 1.65;
}

.site-snippet p {
  margin: 0;
  line-height: inherit;
}

.site-snippet span {
  color: #45525f;
  font-weight: 850;
}

.exchange-action {
  display: grid;
  justify-items: end;
  gap: 14px;
}

.exchange-action a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 48px;
  border-radius: 8px;
  background: #1f2933;
  padding: 0 20px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 850;
  box-shadow: 0 14px 28px rgba(31, 41, 51, 0.14);
  transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.exchange-action a:hover {
  background: #344150;
  box-shadow: 0 18px 34px rgba(31, 41, 51, 0.18);
  transform: translateY(-1px);
}

.exchange-action svg {
  width: 18px;
  height: 18px;
}

.exchange-action p {
  max-width: 190px;
  margin: 0;
  color: #8a949d;
  font-size: 12px;
  line-height: 1.65;
  text-align: right;
}

.avatar-green {
  background: linear-gradient(135deg, #354f52, #84a98c);
}

.avatar-blue {
  background: linear-gradient(135deg, #1f2933, #738392);
}

.avatar-emerald {
  background: linear-gradient(135deg, #236f5a, #77bfa3);
}

.avatar-purple {
  background: linear-gradient(135deg, #6d5a8d, #a48fc7);
}

.avatar-sky {
  background: linear-gradient(135deg, #386c8f, #8bb7d5);
}

.avatar-gray {
  background: linear-gradient(135deg, #48545f, #aab4bd);
}

.avatar-teal {
  background: linear-gradient(135deg, #2c6f73, #88b7b5);
}

@media (max-width: 860px) {
  .link-hero {
    padding: 64px 0 56px;
  }

  .featured-grid,
  .compact-grid,
  .exchange-panel {
    grid-template-columns: 1fr;
  }

  .exchange-action {
    justify-items: start;
  }

  .exchange-action p {
    max-width: none;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .link-hero,
  .link-shell {
    width: min(100% - 24px, 1040px);
  }

  .link-hero h1 {
    font-size: 42px;
  }

  .link-hero p {
    font-size: 15px;
  }

  .featured-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    padding: 22px;
  }

  .featured-avatar {
    width: 72px;
    height: 72px;
    font-size: 20px;
  }

  .exchange-panel {
    margin-top: 56px;
    padding: 24px;
  }

  .exchange-action a {
    width: 100%;
  }
}
</style>
