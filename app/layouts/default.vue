<template>
  <div>
    <header class="site-header" :class="{ 'is-scrolled': isScrolled }">
      <div class="header-inner">
        <NuxtLink to="/" class="brand" aria-label="返回首页">
          <span class="brand-mark">✣</span>
          <span>HEO</span>
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
          <NuxtLink class="scroll-chip" :to="activeChip.to">
            <span>{{ activeChip.icon }}</span>
            <strong>{{ activeChip.label }}</strong>
          </NuxtLink>

          <nav class="tool-nav" aria-label="快捷入口">
            <NuxtLink to="/posts" aria-label="文库">▣</NuxtLink>
            <NuxtLink to="/archive" aria-label="归档">◈</NuxtLink>
            <NuxtLink to="/posts" aria-label="搜索">⌕</NuxtLink>
            <NuxtLink to="/admin" aria-label="后台">▪</NuxtLink>
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

const siteName = computed(() => config.public.siteName || 'HEO')

const scrollTitle = computed(() => {
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

const activeChip = computed(() => {
  if (route.path.startsWith('/posts')) {
    return { label: '文库', to: '/posts', icon: '▣' }
  }

  if (route.path.startsWith('/archive')) {
    return { label: '专栏', to: '/archive', icon: '◈' }
  }

  if (route.path.startsWith('/admin')) {
    return { label: '后台', to: '/admin', icon: '▪' }
  }

  return { label: siteName.value, to: '/', icon: '✦' }
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
  color: #303137;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0;
  transition: padding .2s ease, border-radius .2s ease, background .2s ease, box-shadow .2s ease;
}

.brand-mark {
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

.scroll-chip {
  display: inline-flex;
  max-width: 360px;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgb(255 255 255 / 20%);
  color: white;
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity .18s ease, transform .18s ease;
  pointer-events: none;
}

.scroll-chip span {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #44b5ff, #6f67f8);
}

.scroll-chip strong {
  overflow: hidden;
  color: inherit;
  font-size: 16px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-nav {
  display: flex;
  align-items: center;
  gap: 20px;
  color: #2f3339;
  font-size: 22px;
  font-weight: 900;
  transition: gap .2s ease, padding .2s ease, border-radius .2s ease, background .2s ease, box-shadow .2s ease;
}

.tool-nav a {
  display: grid;
  width: 20px;
  height: 24px;
  place-items: center;
}

.site-header.is-scrolled .brand {
  padding: 10px 22px;
  border-radius: 999px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
}

.site-header.is-scrolled .main-nav {
  opacity: 0;
  transform: translate(-50%, -8px);
  pointer-events: none;
}

.site-header.is-scrolled .scroll-title,
.site-header.is-scrolled .scroll-chip {
  opacity: 1;
  transform: translate(-50%, 0);
  pointer-events: auto;
}

.site-header.is-scrolled .scroll-chip {
  transform: translateY(0);
}

.site-header.is-scrolled .tool-nav {
  gap: 16px;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 12px 32px rgb(31 43 68 / 14%);
}

@media (max-width: 900px) {
  .scroll-chip {
    display: none;
  }
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

  .site-header.is-scrolled .brand {
    padding: 9px 18px;
  }
}
</style>
