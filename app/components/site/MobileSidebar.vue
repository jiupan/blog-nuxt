<template>
  <Teleport to="body">
    <Transition name="mobile-panel" @after-leave="finishClose">
      <div v-if="open" ref="overlay" class="mobile-sidebar-overlay" @click.self="close">
        <aside class="mobile-sidebar-panel" aria-label="侧边信息">
          <SiteAccountMenu mobile @navigate="close" />
          <section class="mobile-stats-card">
            <NuxtLink to="/archive" @click="close">
              <span>文章</span>
              <strong>{{ totalPosts }}</strong>
            </NuxtLink>
            <NuxtLink to="/tags" @click="close">
              <span>标签</span>
              <strong>{{ tags.length }}</strong>
            </NuxtLink>
            <NuxtLink to="/categories" @click="close">
              <span>分类</span>
              <strong>{{ categories.length }}</strong>
            </NuxtLink>
          </section>

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
                @click="close"
              >
                <Icon v-if="item.icon" :name="item.icon" class="mobile-row-icon" aria-hidden="true" />
                <component v-else :is="footerActionIcon(item.fallbackIcon)" class="mobile-row-icon" aria-hidden="true" />
                <span>{{ item.to === '/about' && item.title === '我的' ? '关于作者' : item.title }}</span>
              </NuxtLink>
            </div>
          </div>

          <div v-if="cloudTags.length" class="mobile-panel-group">
            <h3>热门标签</h3>
            <div class="mobile-tag-grid">
              <NuxtLink v-for="tag in cloudTags" :key="tag.name" :to="`/tags/${tag.slug}`" @click="close">
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
import SiteAccountMenu from './SiteAccountMenu.vue'
import type { MobileMenuItem, TaxonomyItem } from '~/composables/useSiteNavigation'

const props = defineProps<{
  open: boolean
  totalPosts: number
  tags: TaxonomyItem[]
  categories: TaxonomyItem[]
  mobileMenuItems: MobileMenuItem[]
  cloudTags: TaxonomyItem[]
  footerActionIcon: (icon?: string) => Component
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const overlay = useTemplateRef<HTMLElement>('overlay')
let closing: Promise<void> | undefined
let resolveClose: (() => void) | undefined
let removeGuard: (() => void) | undefined

function close() {
  if (!props.open || closing) return
  if (overlay.value) closing = new Promise<void>((resolve) => { resolveClose = resolve })
  emit('close')
}

function finishClose() {
  resolveClose?.()
  resolveClose = undefined
  closing = undefined
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) close()
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
  removeGuard = router.beforeResolve(async (to, from) => {
    if (to.path === from.path) return
    close()
    await closing
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  removeGuard?.()
  finishClose()
})
</script>
