<template>
  <div>
    <header class="site-header" :class="{ 'is-scrolled': isScrolled, 'is-article-route': isArticleRoute }">
      <div class="header-inner">
        <NuxtLink to="/" class="brand" aria-label="返回首页">
          <Icon name="i-simple-icons-nuxtdotjs" class="brand-mark" aria-hidden="true" />
          <span>DYU</span>
        </NuxtLink>

        <button class="scroll-title" aria-label="回到顶部" @click="scrollToTop">
          {{ scrollTitle }}
        </button>

        <nav class="main-nav" aria-label="主导航">
          <NuxtLink to="/posts">文库</NuxtLink>
          <NuxtLink to="/archive">专栏</NuxtLink>
          <NuxtLink to="/about">友链</NuxtLink>
          <NuxtLink to="/admin">我的</NuxtLink>
        </nav>

        <div class="header-actions">
          <nav class="tool-nav" aria-label="快捷入口">
            <NuxtLink to="/posts" aria-label="文库">
              <Icon name="i-lucide-library" aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/archive" aria-label="归档">
              <Icon name="i-lucide-archive" aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/posts" aria-label="搜索">
              <Icon name="i-lucide-search" aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/admin" aria-label="后台">
              <Icon name="i-lucide-layout-dashboard" aria-hidden="true" />
            </NuxtLink>
          </nav>
        </div>
      </div>
    </header>
    <main>
      <slot />
    </main>

    <footer class="home-footer">
      <div class="footer-actions" aria-label="底部快捷入口">
        <NuxtLink to="/posts" class="footer-action" aria-label="文章">
          <Icon name="i-lucide-library" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/archive" class="footer-action" aria-label="归档">
          <Icon name="i-lucide-archive" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/about" class="footer-action" aria-label="关于">
          <Icon name="i-lucide-user-round" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/admin" class="footer-action" aria-label="后台">
          <Icon name="i-lucide-settings" aria-hidden="true" />
        </NuxtLink>
        <button class="back-top-button" type="button" aria-label="返回顶部" @click="scrollToTop">
          <span class="footer-avatar" aria-hidden="true">
            <span class="footer-avatar-head"></span>
            <span class="footer-avatar-body"></span>
          </span>
        </button>
        <NuxtLink to="/posts" class="footer-action" aria-label="全部文章">
          <Icon name="i-lucide-newspaper" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/archive" class="footer-action" aria-label="时间线">
          <Icon name="i-lucide-clock-3" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/about" class="footer-action" aria-label="联系">
          <Icon name="i-lucide-link" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink to="/admin/login" class="footer-action" aria-label="登录">
          <Icon name="i-lucide-log-in" aria-hidden="true" />
        </NuxtLink>
      </div>

      <div class="footer-links">
        <div v-for="group in footerGroups" :key="group.title">
          <h3>{{ group.title }}</h3>
          <NuxtLink v-for="link in group.links" :key="link.label" :to="link.to">{{ link.label }}</NuxtLink>
        </div>
      </div>

      <div class="footer-bottom">
        <p>©2026 <strong>{{ siteName }}</strong></p>
        <nav>
          <NuxtLink to="/posts">文章</NuxtLink>
          <NuxtLink to="/archive">归档</NuxtLink>
          <NuxtLink to="/about">关于</NuxtLink>
          <NuxtLink to="/admin">后台</NuxtLink>
        </nav>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const route = useRoute()
const isScrolled = ref(false)
const layoutScrollTitle = useState<string>('layoutScrollTitle', () => '')
const siteSettings = useSiteSettings()

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'HEO')

useHead({
  link: computed(() => {
    const links: Array<Record<string, string>> = []
    if (siteSettings.value.site_favicon) {
      links.push({ rel: 'icon', href: siteSettings.value.site_favicon })
    }
    return links
  })
})
const footerLinkLimit = 4

type TaxonomyItem = {
  id: number
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

const [{ data: categoryData }, { data: tagData }] = await Promise.all([
  useFetch<{ data: TaxonomyItem[] }>('/api/categories'),
  useFetch<{ data: TaxonomyItem[] }>('/api/tags')
])

const categories = computed(() => categoryData.value?.data || [])
const tags = computed(() => tagData.value?.data || [])

const footerGroups = computed(() => {
  const groups = [
    {
      title: '导航',
      links: [
        { label: '首页', to: '/' },
        { label: '文章', to: '/posts' },
        { label: '归档', to: '/archive' },
        { label: '关于', to: '/about' }
      ]
    }
  ]

  if (categories.value.length) {
    groups.push({
      title: '分类',
      links: categories.value.slice(0, footerLinkLimit).map((category) => ({
        label: category.name,
        to: `/categories/${category.slug}`
      }))
    })
  }

  if (tags.value.length) {
    groups.push({
      title: '标签',
      links: tags.value.slice(0, footerLinkLimit).map((tag) => ({
        label: tag.name,
        to: `/tags/${tag.slug}`
      }))
    })
  }

  return groups
})

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
const isArticleRoute = computed(() => route.name === 'slug')

const scrollTitle = computed(() => {
  if (route.name === 'slug') {
    return layoutScrollTitle.value || '文章'
  }

  if (route.path.startsWith('/posts')) {
    return '文库'
  }

  if (route.path.startsWith('/archive')) {
    return '专栏'
  }

  if (route.path.startsWith('/about')) {
    return '友链'
  }

  if (route.path.startsWith('/admin')) {
    return '我的'
  }

  return `${siteName.value} - 个人博客`
})

function syncHeaderState() {
  isScrolled.value = window.scrollY > 24
}

onMounted(() => {
  syncHeaderState()
  window.addEventListener('scroll', syncHeaderState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncHeaderState)
})
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-top: 1px solid #f3d8d3;
  background: rgb(247 249 253 / 86%);
  backdrop-filter: blur(18px);
  transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
}

.site-header.is-scrolled {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.site-header.is-article-route:not(.is-scrolled) {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.header-inner {
  position: relative;
  display: flex;
  width: min(100% - 32px, 1290px);
  height: 70px;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  min-height: 48px;
  padding: 10px 22px;
  border-radius: 999px;
  background: transparent;
  color: #303137;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0;
  transition: background .2s ease, box-shadow .2s ease, color .2s ease;
}

.brand-mark {
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
  font-size: 22px;
  line-height: 1;
}

.main-nav {
  position: absolute;
  left: 50%;
  display: flex;
  gap: 30px;
  transform: translateX(-50%);
  color: #303137;
  font-size: 16px;
  font-weight: 900;
  opacity: 1;
  transition: opacity .18s ease, transform .18s ease;
}

.scroll-title {
  position: absolute;
  left: 50%;
  max-width: min(520px, 42vw);
  overflow: hidden;
  padding: 10px 28px;
  border-radius: 999px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
  cursor: pointer;
  color: #303137;
  font-size: 18px;
  font-weight: 900;
  opacity: 0;
  text-overflow: ellipsis;
  transform: translate(-50%, -8px);
  transition: opacity .18s ease, transform .18s ease;
  white-space: nowrap;
  pointer-events: none;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 999px;
  background: transparent;
  color: #2f3339;
  font-size: 22px;
  font-weight: 900;
  transition: background .2s ease, box-shadow .2s ease, color .2s ease;
}

.tool-nav a {
  display: grid;
  width: 20px;
  height: 24px;
  place-items: center;
}

.tool-nav svg,
.tool-nav span {
  width: 20px;
  height: 20px;
}

.site-header.is-article-route:not(.is-scrolled) .brand,
.site-header.is-article-route:not(.is-scrolled) .main-nav,
.site-header.is-article-route:not(.is-scrolled) .tool-nav {
  color: white;
}

.site-header.is-scrolled .brand {
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
}

.site-header.is-scrolled .main-nav {
  opacity: 0;
  transform: translate(-50%, -8px);
  pointer-events: none;
}

.site-header.is-scrolled .scroll-title {
  opacity: 1;
  transform: translate(-50%, 0);
  pointer-events: auto;
}

.site-header.is-scrolled .tool-nav {
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
}

@media (max-width: 760px) {
  .header-inner {
    width: min(100% - 20px, 1290px);
  }

  .brand {
    font-size: 20px;
  }

  .main-nav {
    position: static;
    gap: 16px;
    transform: none;
    font-size: 14px;
  }

  .scroll-title {
    display: none;
  }

  .tool-nav {
    display: none;
  }
}

/* ---- footer ---- */

.home-footer {
  margin-top: 40px;
  background: linear-gradient(180deg, #f3f6fc 0%, #fff 26%);
}

.footer-actions {
  display: flex;
  width: min(100% - 32px, 780px);
  align-items: center;
  justify-content: center;
  gap: 34px;
  margin: 0 auto;
  padding: 10px 0 54px;
}

.footer-action,
.back-top-button {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: #3d3f45;
  box-shadow: 0 10px 22px rgb(34 38 46 / 12%);
  color: white;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
}

.footer-action :deep(svg),
.footer-action :deep(span) {
  width: 17px;
  height: 17px;
}

.back-top-button {
  position: relative;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #ff777c, #f23842);
  box-shadow: 0 14px 28px rgb(242 56 66 / 28%);
  cursor: pointer;
}

.back-top-button::before {
  position: absolute;
  top: 5px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: white;
  content: "";
}

.footer-avatar {
  position: relative;
  display: grid;
  width: 32px;
  height: 36px;
  place-items: center;
}

.footer-avatar-head {
  position: absolute;
  top: 6px;
  width: 12px;
  height: 12px;
  border: 3px solid #fff;
  border-radius: 999px;
  background: #19191d;
}

.footer-avatar-body {
  position: absolute;
  bottom: 2px;
  width: 25px;
  height: 25px;
  border-radius: 999px 999px 10px 10px;
  background: #111217;
}

.footer-avatar-body::before {
  position: absolute;
  top: 9px;
  left: 7px;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: white;
  box-shadow: 8px 0 0 white;
  content: "";
}

.footer-links {
  display: grid;
  width: min(100% - 32px, 1180px);
  grid-template-columns: repeat(auto-fit, 160px);
  justify-content: center;
  gap: 92px;
  margin: 0 auto;
  padding: 0 0 50px;
  text-align: center;
}

.footer-links h3 {
  margin: 0 0 20px;
  color: #383a40;
  font-size: 16px;
  font-weight: 900;
}

.footer-links a {
  display: block;
  margin-top: 14px;
  color: #626873;
  font-weight: 700;
}

.footer-bottom {
  display: flex;
  width: 100%;
  height: 82px;
  align-items: center;
  justify-content: space-between;
  margin: 0 auto;
  padding: 0 max(16px, calc((100% - 1290px) / 2));
  background: #f4f6fa;
  color: #444a55;
}

.footer-bottom p {
  margin: 0;
  line-height: 1;
}

.footer-bottom nav {
  display: flex;
  align-items: center;
  gap: 22px;
  font-weight: 800;
  line-height: 1;
}

@media (max-width: 1100px) {
  .footer-links {
    grid-template-columns: repeat(3, 150px);
    gap: 54px;
  }
}

@media (max-width: 760px) {
  .footer-actions {
    gap: 16px;
    flex-wrap: wrap;
  }

  .footer-links {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
    gap: 28px;
  }

  .footer-bottom {
    display: grid;
    gap: 16px;
  }

  .footer-bottom nav {
    flex-wrap: wrap;
    gap: 14px;
  }
}
</style>
