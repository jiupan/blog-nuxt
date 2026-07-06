<template>
  <Teleport to="body">
    <Transition name="mobile-panel">
      <div v-if="open" class="mobile-sidebar-overlay" @click.self="$emit('close')">
        <aside class="mobile-sidebar-panel" aria-label="侧边信息">
          <section class="mobile-stats-card">
            <div>
              <span>文章</span>
              <strong>{{ totalPosts }}</strong>
            </div>
            <div>
              <span>标签</span>
              <strong>{{ tags.length }}</strong>
            </div>
            <div>
              <span>分类</span>
              <strong>{{ categories.length }}</strong>
            </div>
          </section>

          <NuxtLink to="/posts" class="mobile-green-card" @click="$emit('close')">
            <strong>文章</strong>
            <span>查看全部已发布内容</span>
          </NuxtLink>

          <div class="mobile-panel-group">
            <h3>博客</h3>
            <div class="mobile-panel-grid">
              <NuxtLink
                v-for="item in mobileMenuItems"
                :key="item.key"
                :to="item.to"
                :target="item.targetBlank ? '_blank' : undefined"
                :rel="item.targetBlank ? 'noopener noreferrer' : undefined"
                class="mobile-panel-row"
                @click="$emit('close')"
              >
                <Icon v-if="item.icon" :name="item.icon" class="mobile-row-icon" aria-hidden="true" />
                <component v-else :is="footerActionIcon(item.fallbackIcon)" class="mobile-row-icon" aria-hidden="true" />
                <span>{{ item.title }}</span>
              </NuxtLink>
            </div>
          </div>

          <div v-if="cloudTags.length" class="mobile-panel-group">
            <h3>热门标签</h3>
            <div class="mobile-tag-grid">
              <NuxtLink v-for="tag in cloudTags" :key="tag.name" :to="`/tags/${tag.slug}`" @click="$emit('close')">
                # {{ tag.name }}
              </NuxtLink>
            </div>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { MobileMenuItem, TaxonomyItem } from '~/composables/useSiteNavigation'

defineProps<{
  open: boolean
  totalPosts: number
  tags: TaxonomyItem[]
  categories: TaxonomyItem[]
  mobileMenuItems: MobileMenuItem[]
  cloudTags: TaxonomyItem[]
  footerActionIcon: (icon?: string) => Component
}>()

defineEmits<{
  close: []
}>()
</script>
