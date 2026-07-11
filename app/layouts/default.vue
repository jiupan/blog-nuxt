<template>
  <div class="default-layout" :class="{ 'is-viewport-fit': viewportFit }">
    <SiteHeader
      :is-scrolled="forceStandardHeader ? false : navigation.isScrolled.value"
      :is-article-route="forceStandardHeader ? false : navigation.isArticleRoute.value"
      :site-settings="navigation.siteSettings.value"
      :site-settings-loaded="navigation.siteSettingsLoaded.value"
      :brand-text="navigation.brandText.value"
      :brand-mark-style="navigation.brandMarkStyle.value"
      :scroll-title="navigation.scrollTitle.value"
      :primary-menu-items="navigation.primaryMenuItems.value"
      :mobile-panel-open="navigation.mobilePanelOpen.value"
      @brand-click="navigation.handleBrandClick"
      @scroll-top="navigation.scrollToTop"
      @open-mobile-panel="navigation.openMobilePanel"
    />

    <main>
      <slot />
    </main>

    <MobileSidebar
      :open="navigation.mobilePanelOpen.value"
      :total-posts="navigation.totalPosts.value"
      :tags="navigation.tags.value"
      :categories="navigation.categories.value"
      :mobile-menu-items="navigation.mobileMenuItems.value"
      :cloud-tags="navigation.cloudTags.value"
      :footer-action-icon="navigation.footerActionIcon"
      @close="navigation.closeMobilePanel"
    />

    <SiteFooter
      :compact="compactFooter"
      :footer-action-left="navigation.footerActionLeft.value"
      :footer-action-right="navigation.footerActionRight.value"
      :footer-action-icon="navigation.footerActionIcon"
      :footer-groups="navigation.footerGroups.value"
      :footer-copyright-parts="navigation.footerCopyrightParts.value"
      :footer-bottom-links="navigation.footerBottomLinks.value"
      :site-name="navigation.siteName.value"
      @scroll-top="navigation.scrollToTop"
    />

    <CuteBackToTop @scroll-top="navigation.scrollToTop" />
  </div>
</template>

<script setup lang="ts">
import CuteBackToTop from '~/components/site/CuteBackToTop.vue'
import MobileSidebar from '~/components/site/MobileSidebar.vue'
import SiteFooter from '~/components/site/SiteFooter.vue'
import SiteHeader from '~/components/site/SiteHeader.vue'

const navigation = await useSiteNavigation()
const { forceStandardHeader = false, compactFooter = false, viewportFit = false } = defineProps<{
  forceStandardHeader?: boolean
  compactFooter?: boolean
  viewportFit?: boolean
}>()

onMounted(() => {
  navigation.syncHeaderState()
  window.addEventListener('scroll', navigation.syncHeaderState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', navigation.syncHeaderState)
})
</script>

<style scoped>
.default-layout.is-viewport-fit {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  flex-direction: column;
}

.default-layout.is-viewport-fit > main {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
}

.default-layout.is-viewport-fit > :deep(.site-header),
.default-layout.is-viewport-fit > :deep(.home-footer) {
  flex: 0 0 auto;
}

.default-layout.is-viewport-fit > main > :deep(*) {
  flex: 1 0 auto;
}
</style>
