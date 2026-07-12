<template>
  <footer class="home-footer" :class="{ 'is-compact': compact }">
    <div v-if="!compact" class="footer-actions" aria-label="底部快捷入口">
      <div class="footer-action-side is-left">
        <template
          v-for="link in footerActionLeft"
          :key="`${link.label}-${link.to}`"
        >
          <NuxtLink v-if="link.to" :to="link.to" :target="link.targetBlank ? '_blank' : undefined" :rel="link.targetBlank ? 'noopener noreferrer' : undefined" class="footer-action" :aria-label="link.label" :data-tooltip="link.label">
            <Icon :name="link.icon || 'i-simple-icons-linktree'" aria-hidden="true" />
          </NuxtLink>
          <button
            v-else
            type="button"
            class="footer-action is-image-action"
            :class="{ 'is-open': openImageAction === actionKey(link) }"
            :aria-label="link.label"
            :aria-expanded="openImageAction === actionKey(link)"
            :data-tooltip="link.image ? undefined : link.label"
            @click.stop="toggleImageAction(link)"
          >
            <Icon :name="link.icon || 'i-simple-icons-linktree'" aria-hidden="true" />
            <span v-if="link.image" class="footer-action-image" role="tooltip">
              <img :src="link.image" :alt="`${link.label} 图片`">
            </span>
          </button>
        </template>
      </div>
      <button class="back-top-button" type="button" aria-label="返回顶部" data-tooltip="返回顶部" @click="$emit('scrollTop')">
        <Icon name="i-lucide-rocket" class="back-top-icon" aria-hidden="true" />
      </button>
      <div class="footer-action-side is-right">
        <template
          v-for="link in footerActionRight"
          :key="`${link.label}-${link.to}`"
        >
          <NuxtLink v-if="link.to" :to="link.to" :target="link.targetBlank ? '_blank' : undefined" :rel="link.targetBlank ? 'noopener noreferrer' : undefined" class="footer-action" :aria-label="link.label" :data-tooltip="link.label">
            <Icon :name="link.icon || 'i-simple-icons-linktree'" aria-hidden="true" />
          </NuxtLink>
          <button
            v-else
            type="button"
            class="footer-action is-image-action"
            :class="{ 'is-open': openImageAction === actionKey(link) }"
            :aria-label="link.label"
            :aria-expanded="openImageAction === actionKey(link)"
            :data-tooltip="link.image ? undefined : link.label"
            @click.stop="toggleImageAction(link)"
          >
            <Icon :name="link.icon || 'i-simple-icons-linktree'" aria-hidden="true" />
            <span v-if="link.image" class="footer-action-image" role="tooltip">
              <img :src="link.image" :alt="`${link.label} 图片`">
            </span>
          </button>
        </template>
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
import type { FooterActionLink, FooterCopyrightPart, FooterGroup, FooterLink } from '~/composables/useSiteNavigation'

defineProps<{
  compact?: boolean
  footerActionLeft: FooterActionLink[]
  footerActionRight: FooterActionLink[]
  footerGroups: FooterGroup[]
  footerCopyrightParts: FooterCopyrightPart[]
  footerBottomLinks: FooterLink[]
  siteName: string
}>()

defineEmits<{
  scrollTop: []
}>()

const openImageAction = ref('')

function actionKey(link: FooterActionLink) {
  return `${link.label}-${link.icon}-${link.image}`
}

function toggleImageAction(link: FooterActionLink) {
  if (!link.image) return
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const key = actionKey(link)
  openImageAction.value = openImageAction.value === key ? '' : key
}

function closeImageAction() {
  openImageAction.value = ''
}

onMounted(() => document.addEventListener('click', closeImageAction))
onBeforeUnmount(() => document.removeEventListener('click', closeImageAction))
</script>
