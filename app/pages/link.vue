<template>
  <div class="link-page">
    <section class="link-shell">
      <div class="link-heading">
        <h1>友链</h1>
        <p>这里可以放朋友、项目和常去的网站。</p>
      </div>

      <div class="link-grid">
        <a
          v-for="link in links"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="link-card"
        >
          <span class="link-avatar">{{ link.name.slice(0, 1) }}</span>
          <span>
            <strong>{{ link.name }}</strong>
            <small>{{ link.description }}</small>
          </span>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const links = [
  {
    name: 'Nuxt',
    description: 'The intuitive Vue framework',
    url: 'https://nuxt.com'
  },
  {
    name: 'Prisma',
    description: 'TypeScript ORM for modern apps',
    url: 'https://www.prisma.io'
  }
]

useSeoMeta({
  title: '友链'
})
</script>

<style scoped>
.link-page {
  min-height: 60vh;
  padding: 44px 0;
}

.link-shell {
  width: min(100% - 32px, 1290px);
  margin: 0 auto;
}

.link-heading {
  margin-bottom: 24px;
}

.link-heading h1 {
  margin: 0;
  color: #25272d;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 0;
}

.link-heading p {
  margin: 10px 0 0;
  color: #687080;
  font-weight: 700;
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.link-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 92px;
  border: 1px solid #e5ebf4;
  border-radius: 8px;
  background: rgb(255 255 255 / 88%);
  padding: 18px;
  box-shadow: 0 10px 24px rgb(31 43 68 / 6%);
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.link-card:hover {
  border-color: #4f67f5;
  box-shadow: 0 14px 28px rgb(79 103 245 / 14%);
  transform: translateY(-2px);
}

.link-avatar {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: #4f67f5;
  color: #fff;
  font-weight: 900;
}

.link-card strong,
.link-card small {
  display: block;
}

.link-card strong {
  color: #25272d;
  font-size: 17px;
  line-height: 1.2;
}

.link-card small {
  margin-top: 6px;
  color: #687080;
  font-size: 13px;
  line-height: 1.4;
}
</style>
