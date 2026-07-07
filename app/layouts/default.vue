<template>
  <div>
    <SiteHeader
      :is-scrolled="navigation.isScrolled.value"
      :is-article-route="navigation.isArticleRoute.value"
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

onMounted(() => {
  navigation.syncHeaderState()
  window.addEventListener('scroll', navigation.syncHeaderState, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', navigation.syncHeaderState)
})
</script>
