<template>
  <header class="site-header" :class="{ 'is-scrolled': isScrolled, 'is-article-route': isArticleRoute }">
    <div class="header-inner">
      <NuxtLink to="/" class="brand" aria-label="返回博客主页" data-tooltip="返回博客主页" @click="$emit('brandClick')">
        <span
          v-if="siteSettings.site_favicon"
          class="brand-mark brand-mark-mask"
          :style="brandMarkStyle"
          aria-hidden="true"
        />
        <Icon v-else-if="siteSettingsLoaded" name="i-simple-icons-nuxtdotjs" class="brand-mark" aria-hidden="true" />
        <span>{{ brandText }}</span>
      </NuxtLink>

      <button class="scroll-title" aria-label="回到顶部" @click="$emit('scrollTop')">
        <span class="scroll-title-text">{{ scrollTitle }}</span>
      </button>

      <nav class="main-nav" aria-label="主导航">
        <div v-for="item in primaryMenuItems" :key="item.id" class="nav-item" :class="{ 'has-children': item.children.length }">
          <NuxtLink :to="item.url || '/'" :target="item.targetBlank ? '_blank' : undefined" :rel="item.targetBlank ? 'noopener noreferrer' : undefined">
            {{ item.title }}
            <Icon v-if="item.children.length" name="i-lucide-chevron-down" aria-hidden="true" />
          </NuxtLink>
          <div v-if="item.children.length" class="nav-dropdown">
            <NuxtLink
              v-for="child in item.children"
              :key="child.id"
              :to="child.url || '/'"
              :target="child.targetBlank ? '_blank' : undefined"
              :rel="child.targetBlank ? 'noopener noreferrer' : undefined"
            >
              <Icon v-if="child.icon" :name="child.icon" aria-hidden="true" />
              <span>{{ child.title }}</span>
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="header-actions">
        <nav class="tool-nav" aria-label="快捷入口">
          <NuxtLink to="/posts" aria-label="文库" data-tooltip="文库">
            <LibraryIcon aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/archive" aria-label="归档" data-tooltip="归档">
            <ArchiveIcon aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/posts" aria-label="站内搜索" data-tooltip="站内搜索">
            <SearchIcon aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/admin" aria-label="后台" data-tooltip="后台" class="desktop-admin-link">
            <LayoutDashboardIcon aria-hidden="true" />
          </NuxtLink>
          <button
            type="button"
            class="mobile-menu-button"
            aria-label="打开侧边菜单"
            :aria-expanded="mobilePanelOpen"
            @click="$emit('openMobilePanel')"
          >
            <MenuIcon aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  Archive as ArchiveIcon,
  LayoutDashboard as LayoutDashboardIcon,
  Library as LibraryIcon,
  Menu as MenuIcon,
  Search as SearchIcon
} from '@lucide/vue'
import type { MenuTreeItem } from '~/composables/useSiteNavigation'

defineProps<{
  isScrolled: boolean
  isArticleRoute: boolean
  siteSettings: Record<string, string>
  siteSettingsLoaded: boolean
  brandText: string
  brandMarkStyle?: Record<string, string>
  scrollTitle: string
  primaryMenuItems: MenuTreeItem[]
  mobilePanelOpen: boolean
}>()

defineEmits<{
  brandClick: []
  scrollTop: []
  openMobilePanel: []
}>()
</script>
