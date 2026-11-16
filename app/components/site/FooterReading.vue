<template>
  <section v-if="links.length" class="footer-reading">
    <h3><BookOpenIcon aria-hidden="true" />继续阅读</h3>
    <ul>
      <li v-for="{ label, post } in links" :key="post.id">
        <NuxtLink :to="postPath(post.slug)" class="footer-reading-link">
          <span class="footer-reading-label">{{ label }}</span>
          <span class="footer-reading-title">{{ post.title }}</span>
        </NuxtLink>
      </li>
    </ul>
    <button type="button" class="footer-reading-random" :aria-disabled="randomPending" @click="openRandomPost">
      <ShuffleIcon aria-hidden="true" />{{ randomPending ? '正在选文章…' : '随机读一篇' }}
    </button>
    <p v-if="randomError" class="footer-reading-note" role="status">{{ randomError }}</p>
  </section>
</template>

<script setup lang="ts">
import { BookOpen as BookOpenIcon, Shuffle as ShuffleIcon } from '@lucide/vue'
import type { ApiResult } from '~~/types/api'
import type { FooterReadingPayload, FooterReadingPost } from '~~/types/dto/post'
import { postPath } from '~/utils/post-path'

const route = useRoute()
const router = useRouter()
const { data } = useLazyFetch<ApiResult<FooterReadingPayload | null>>('/api/footer-reading', { key: 'footer-reading' })
const currentSlug = computed(() => route.name === 'slug' ? String(route.params.slug).replace(/\.html$/i, '') : '')
const links = computed(() => {
  const dataPosts = data.value?.data
  const items: Array<{ label: string, post: FooterReadingPost }> = []
  if (!dataPosts) return items
  const featured = dataPosts.featured
  if (featured && featured.slug !== currentSlug.value) items.push({ label: '精选', post: featured })
  const recent = dataPosts.recent.find(post => post.slug !== currentSlug.value && post.id !== featured?.id)
  if (recent) items.push({ label: '最近更新', post: recent })
  return items
})
const randomPending = ref(false)
const randomError = ref('')

async function openRandomPost() {
  if (randomPending.value) return
  const from = router.currentRoute.value
  randomPending.value = true
  randomError.value = ''
  try {
    const result = await $fetch<ApiResult<{ slug: string } | null>>('/api/footer-reading/random', { query: { exclude: currentSlug.value || undefined } })
    if (router.currentRoute.value !== from) return
    if (result.data) await router.push(postPath(result.data.slug))
    else randomError.value = '暂时没有其他文章可读。'
  } catch {
    if (router.currentRoute.value === from) randomError.value = '选取文章失败，请再试一次。'
  } finally {
    randomPending.value = false
  }
}
</script>

<style scoped>
.footer-reading {
  min-width: 0;
  padding: 14px 16px 10px;
  border: 1px solid var(--theme-border-soft);
  border-radius: 16px;
  background: color-mix(in srgb, var(--theme-info-soft) 24%, var(--theme-surface));
}

.footer-reading h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 5px;
  color: var(--theme-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.6;
}

.footer-reading svg {
  width: 15px;
  height: 15px;
  flex: none;
}

.footer-reading h3 svg {
  color: var(--theme-info);
}

.footer-reading ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.footer-reading li + li {
  border-top: 1px solid var(--theme-border-soft);
}

.footer-reading-link {
  display: block;
  min-height: 44px;
  padding: 7px 0;
  border-radius: 4px;
  color: var(--theme-text);
  text-decoration: none;
}

.footer-reading-label {
  display: block;
  color: var(--theme-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

.footer-reading-title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.55;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.footer-reading-random {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  padding: 0;
  color: var(--theme-text-soft);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.footer-reading-random[aria-disabled="true"] {
  cursor: wait;
}

.footer-reading-link:hover .footer-reading-title,
.footer-reading-random:hover {
  color: var(--theme-info);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.footer-reading-link:focus-visible,
.footer-reading-random:focus-visible {
  outline: 2px solid var(--theme-info);
  outline-offset: 3px;
}

.footer-reading-note {
  margin: 0 0 4px;
  color: var(--theme-text-soft);
  font-size: 12px;
}
</style>
