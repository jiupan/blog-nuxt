<template>
  <footer class="home-footer" :class="{ 'is-compact': compact }">
    <div v-if="!compact" class="footer-actions" aria-label="底部快捷入口">
      <div class="footer-action-side is-left">
        <NuxtLink
          v-for="link in footerActionLeft"
          :key="`${link.label}-${link.to}`"
          :to="link.to"
          class="footer-action"
          :aria-label="link.label"
          :data-tooltip="link.label"
        >
          <component :is="footerActionIcon(link.icon)" aria-hidden="true" />
        </NuxtLink>
      </div>
      <button class="back-top-button" type="button" aria-label="返回顶部" data-tooltip="返回顶部" @click="$emit('scrollTop')">
        <Icon name="i-lucide-rocket" class="back-top-icon" aria-hidden="true" />
      </button>
      <div class="footer-action-side is-right">
        <NuxtLink
          v-for="link in footerActionRight"
          :key="`${link.label}-${link.to}`"
          :to="link.to"
          class="footer-action"
          :aria-label="link.label"
          :data-tooltip="link.label"
        >
          <component :is="footerActionIcon(link.icon)" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>

    <div v-if="!compact" class="footer-links">
      <div v-for="group in footerGroups" :key="group.title">
        <h3>{{ group.title }}</h3>
        <NuxtLink v-for="link in group.links" :key="link.label" :to="link.to">{{ link.label }}</NuxtLink>
      </div>
    </div>

    <div class="footer-bottom">
      <p>
        <template v-for="(part, index) in footerCopyrightParts" :key="`${part.type}-${index}`">
          <strong v-if="part.type === 'siteName'">{{ siteName }}</strong>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>
      <nav>
        <NuxtLink v-for="link in footerBottomLinks" :key="`${link.label}-${link.to}`" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { FooterActionLink, FooterCopyrightPart, FooterGroup, FooterLink } from '~/composables/useSiteNavigation'

defineProps<{
  compact?: boolean
  footerActionLeft: FooterActionLink[]
  footerActionRight: FooterActionLink[]
  footerActionIcon: (icon?: string) => Component
  footerGroups: FooterGroup[]
  footerCopyrightParts: FooterCopyrightPart[]
  footerBottomLinks: FooterLink[]
  siteName: string
}>()

defineEmits<{
  scrollTop: []
}>()
</script>
