<template>
  <div>
    <header class="site-header" :class="{ 'is-scrolled': isScrolled, 'is-article-route': isArticleRoute }">
      <div class="header-inner">
        <NuxtLink to="/" class="brand" aria-label="返回首页">
          <Icon name="i-simple-icons-nuxtdotjs" class="brand-mark" aria-hidden="true" />
          <span>DYU</span>
        </NuxtLink>

        <NuxtLink to="/" class="scroll-title" aria-label="返回首页">
          {{ scrollTitle }}
        </NuxtLink>

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
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const route = useRoute()
const isScrolled = ref(false)
const layoutScrollTitle = useState<string>('layoutScrollTitle', () => '')

const siteName = computed(() => config.public.siteName || 'HEO')
const isArticleRoute = computed(() => route.path.startsWith('/posts/'))

const scrollTitle = computed(() => {
  if (route.path.startsWith('/posts/')) {
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
</style>
