<template>
  <div class="post-page">
    <section class="post-hero">
      <div class="post-hero-inner">
        <div class="post-kicker">
          <NuxtLink v-if="post.category" :to="`/categories/${post.category.slug}`">{{ post.category.name }}</NuxtLink>
          <NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`"># {{ tag.name }}</NuxtLink>
        </div>

        <div class="post-hero-grid">
          <div class="post-hero-copy">
            <h1>{{ post.title }}</h1>
            <div class="post-meta">
              <span>{{ formatDate(post.publishedAt) }}</span>
              <span>{{ post.rendered.readingTime }} 分钟阅读</span>
              <span>{{ post.rendered.wordCount }} 字</span>
              <span>{{ post.viewCount }} 阅读</span>
            </div>
          </div>

          <div class="post-cover-card">
            <NuxtImg v-if="post.cover" :src="post.cover" :alt="post.title" />
            <div v-else class="cover-fallback">
              <span>{{ coverWord }}</span>
              <strong>{{ post.category?.name || '文章' }}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="post-shell">
      <main class="post-main">
        <section v-if="post.summary" class="summary-card">
          <div class="summary-heading">
            <span>文章摘要</span>
            <small>{{ siteName }}</small>
          </div>
          <div class="summary-body">
            <div class="summary-thumb">
              <NuxtImg v-if="post.cover" :src="post.cover" :alt="post.title" />
              <span v-else>{{ coverWord }}</span>
            </div>
            <p>{{ post.summary }}</p>
          </div>
        </section>

        <div class="content-card">
          <div class="prose-blog" v-html="post.rendered.html" />
        </div>

        <nav v-if="post.previous || post.next" class="post-pager">
          <NuxtLink v-if="post.previous" :to="`/posts/${post.previous.slug}`">
            <span>上一篇</span>
            <strong>{{ post.previous.title }}</strong>
          </NuxtLink>
          <NuxtLink v-if="post.next" :to="`/posts/${post.next.slug}`">
            <span>下一篇</span>
            <strong>{{ post.next.title }}</strong>
          </NuxtLink>
        </nav>
      </main>

      <aside class="post-sidebar">
        <section class="author-card">
          <div class="author-avatar">
            <span>{{ authorInitial }}</span>
          </div>
          <h2>{{ siteName }}</h2>
          <p>个人博客</p>
          <div class="author-actions">
            <NuxtLink to="/archive">归档</NuxtLink>
            <NuxtLink to="/about">关于</NuxtLink>
          </div>
        </section>

        <section class="toc-card">
          <h2>文章目录</h2>
          <div v-if="post.rendered.toc.length" class="toc-list">
            <a
              v-for="item in post.rendered.toc"
              :key="item.id"
              :href="`#${item.id}`"
              :class="{ 'is-child': item.level === 3 }"
            >
              {{ item.text }}
            </a>
          </div>
          <p v-else>暂无目录</p>
        </section>

        <section class="info-card">
          <h2>文章信息</h2>
          <p><span>发布于</span><strong>{{ formatDate(post.publishedAt) }}</strong></p>
          <p><span>阅读量</span><strong>{{ post.viewCount }}</strong></p>
          <p><span>分类</span><strong>{{ post.category?.name || '未分类' }}</strong></p>
        </section>

        <NuxtLink to="/posts" class="return-card">返回文章列表</NuxtLink>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const { data, error } = await useFetch(`/api/posts/${route.params.slug}`)

if (error.value || !data.value?.data) {
  throw createError({ statusCode: 404, statusMessage: '文章不存在' })
}

const post = computed(() => data.value!.data)
const siteName = computed(() => config.public.siteName || 'Jiupan Blog')
const layoutScrollTitle = useState<string>('layoutScrollTitle', () => '')
const coverWord = computed(() => {
  return post.value.category?.name || post.value.title.slice(0, 4)
})
const authorInitial = computed(() => siteName.value.slice(0, 1).toUpperCase())

layoutScrollTitle.value = post.value.title

onBeforeUnmount(() => {
  layoutScrollTitle.value = ''
})

useSeoMeta({
  title: () => post.value.seoTitle || post.value.title,
  description: () => post.value.seoDescription || post.value.summary || '',
  ogTitle: () => post.value.title,
  ogDescription: () => post.value.summary || '',
  ogImage: () => post.value.cover || ''
})

function formatDate(value?: string | Date | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : ''
}
</script>

<style scoped>
.post-page {
  min-height: 100vh;
  background: #f3f6fc;
  color: #303137;
}

.post-hero {
  min-height: 400px;
  margin-top: -70px;
  padding: 108px 0 58px;
  background:
    radial-gradient(circle at 79% 22%, rgb(255 255 255 / 18%), transparent 25%),
    linear-gradient(135deg, #a71878 0%, #c63a98 50%, #a21d72 100%);
  color: white;
}

.post-hero-inner {
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
}

.post-kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 30px;
  color: rgb(255 255 255 / 86%);
  font-size: 15px;
  font-weight: 800;
}

.post-kicker a:first-child {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgb(255 255 255 / 18%);
  color: white;
}

.post-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 72px;
  align-items: center;
}

.post-hero-copy h1 {
  max-width: 900px;
  margin: 0;
  font-size: clamp(42px, 4.4vw, 64px);
  font-weight: 900;
  line-height: 1.2;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 36px;
  font-size: 15px;
  font-weight: 800;
}

.post-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgb(255 255 255 / 18%);
}

.post-cover-card {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: linear-gradient(135deg, #e875bf, #d94bab);
  box-shadow: 0 26px 56px rgb(91 11 65 / 22%);
}

.post-cover-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  display: grid;
  place-items: center;
  color: rgb(255 255 255 / 72%);
  text-align: center;
}

.cover-fallback span {
  font-size: 48px;
  font-weight: 900;
}

.cover-fallback strong {
  margin-top: 8px;
  color: white;
  font-size: 18px;
}

.post-shell {
  display: grid;
  width: min(100% - 32px, 1290px);
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 14px;
  align-items: start;
  margin: 24px auto 72px;
}

.post-main {
  min-width: 0;
}

.summary-card,
.content-card,
.toc-card,
.info-card,
.post-pager a {
  border: 1px solid #dfe6f2;
  border-radius: 10px;
  background: white;
}

.summary-card {
  padding: 18px;
}

.summary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #b32683;
  font-size: 13px;
  font-weight: 900;
}

.summary-heading small {
  color: #7e8591;
  font-weight: 700;
}

.summary-body {
  display: grid;
  grid-template-columns: 170px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  margin-top: 12px;
}

.summary-thumb {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #f8e7f4;
  color: #b32683;
  font-weight: 900;
}

.summary-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.summary-body p {
  margin: 0;
  color: #454b55;
  line-height: 1.7;
}

.content-card {
  margin-top: 14px;
  padding: 28px 34px;
}

.post-main > .content-card:first-child {
  margin-top: 0;
}

.post-pager {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.post-pager a {
  display: block;
  padding: 18px;
}

.post-pager span {
  color: #858b96;
  font-size: 12px;
  font-weight: 800;
}

.post-pager strong {
  display: block;
  margin-top: 6px;
  color: #303137;
}

.post-sidebar {
  position: sticky;
  top: 84px;
  display: grid;
  gap: 10px;
}

.author-card {
  display: grid;
  height: 154px;
  grid-template-columns: 72px minmax(0, 1fr);
  grid-template-rows: 1fr auto auto;
  column-gap: 14px;
  align-items: center;
  overflow: hidden;
  border-radius: 10px;
  background: linear-gradient(135deg, #c7439e, #a51f76);
  color: white;
  padding: 16px 18px;
  box-shadow: 0 18px 40px rgb(96 18 70 / 16%);
}

.author-avatar {
  display: grid;
  width: 72px;
  height: 72px;
  grid-row: 1 / 4;
  place-items: center;
  margin: 0;
  border: 4px solid rgb(255 255 255 / 72%);
  border-radius: 999px;
  background: #121318;
  box-shadow: 0 12px 26px rgb(74 10 54 / 18%);
  font-size: 32px;
  font-weight: 900;
}

.author-card h2 {
  margin: 0;
  align-self: end;
  font-size: 18px;
  font-weight: 900;
}

.author-card p {
  margin: 4px 0 12px;
  color: rgb(255 255 255 / 82%);
  font-size: 13px;
}

.author-actions {
  display: flex;
  gap: 8px;
  align-self: end;
}

.author-actions a {
  flex: 1;
  padding: 8px 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 18%);
  text-align: center;
  font-size: 13px;
  font-weight: 800;
}

.toc-card,
.info-card {
  padding: 16px;
}

.toc-card h2,
.info-card h2 {
  margin: 0 0 12px;
  color: #303137;
  font-size: 15px;
  font-weight: 900;
}

.toc-list {
  display: grid;
  gap: 10px;
}

.toc-list a,
.toc-card p {
  margin: 0;
  color: #747b87;
  font-size: 13px;
  font-weight: 700;
}

.toc-list a.is-child {
  padding-left: 14px;
}

.info-card p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0 0;
  color: #747b87;
  font-size: 13px;
}

.info-card strong {
  color: #303137;
}

.return-card {
  display: block;
  padding: 14px 16px;
  border-radius: 10px;
  background: #b32683;
  color: white;
  text-align: center;
  font-weight: 900;
}

@media (max-width: 900px) {
  .post-hero-grid,
  .post-shell {
    grid-template-columns: 1fr;
  }

  .post-cover-card {
    max-width: 320px;
  }

  .post-sidebar {
    position: static;
  }

  .author-card {
    height: auto;
    min-height: 154px;
  }
}

@media (max-width: 640px) {
  .post-hero {
    margin-top: -70px;
    padding-top: 104px;
    min-height: 360px;
  }

  .summary-body,
  .post-pager {
    grid-template-columns: 1fr;
  }

  .content-card {
    padding: 22px 18px;
  }
}
</style>
