<template>
  <footer class="home-footer" :class="{ 'is-compact': compact }">
    <div v-if="!compact" class="footer-main">
      <div class="footer-identity">
        <div class="footer-brand">
          <div>
            <NuxtLink class="footer-brand-name" to="/">{{ siteName }}</NuxtLink>
            <p v-if="description">{{ description }}</p>
          </div>
          <button class="back-top-button" type="button" aria-label="返回顶部" data-tooltip="返回顶部" @click="$emit('scrollTop')"><FooterMascot /></button>
        </div>
        <div class="footer-actions" aria-label="社交与联系">
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
                  <img :src="link.image" :alt="`${link.label} 图片`" loading="lazy" decoding="async">
                </span>
              </button>
            </template>
          </div>
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
                  <img :src="link.image" :alt="`${link.label} 图片`" loading="lazy" decoding="async">
                </span>
              </button>
            </template>
          </div>
        </div>
      </div>
      <nav v-if="footerGroups.length" class="footer-links" aria-label="页脚导航">
        <section v-for="group in footerGroups" :key="group.title" class="footer-link-group" :class="{ 'is-tags': group.links.every(link => link.to.startsWith('/tags/')) }">
          <h3>{{ group.title }}</h3>
          <ul class="footer-link-list">
            <li v-for="link in group.links" :key="`${link.label}-${link.to}`"><NuxtLink :to="link.to">{{ link.label }}</NuxtLink></li>
          </ul>
        </section>
      </nav>
    </div>

    <div class="footer-bottom">
      <p>
        <template v-for="(part, index) in footerCopyrightParts" :key="`${part.type}-${index}`">
          <strong v-if="part.type === 'siteName'">{{ siteName }}</strong>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>
      <nav v-if="displayedBottomLinks.length" aria-label="页脚辅助导航">
        <NuxtLink v-for="link in displayedBottomLinks" :key="`${link.label}-${link.to}`" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import type { FooterActionLink, FooterCopyrightPart, FooterGroup, FooterLink } from '~/composables/useSiteNavigation'
import FooterMascot from './FooterMascot.vue'

const props = defineProps<{
  compact?: boolean
  footerActionLeft: FooterActionLink[]
  footerActionRight: FooterActionLink[]
  footerGroups: FooterGroup[]
  footerCopyrightParts: FooterCopyrightPart[]
  footerBottomLinks: FooterLink[]
  siteName: string
  description?: string
}>()

defineEmits<{
  scrollTop: []
}>()

const openImageAction = ref('')
const displayedBottomLinks = computed(() => {
  if (props.compact) return props.footerBottomLinks
  const groupedPaths = new Set(props.footerGroups.flatMap(group => group.links.map(link => link.to)))
  return props.footerBottomLinks.filter(link => !groupedPaths.has(link.to))
})

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
