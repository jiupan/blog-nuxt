<template>
  <NuxtLayout name="default" force-standard-header compact-footer viewport-fit header-gradient>
    <div class="about-stage">
      <div class="about-backdrop" aria-hidden="true">
        <canvas ref="canvasRef" class="particle-canvas" />
        <div class="about-glow glow-one" />
        <div class="about-glow glow-two" />
      </div>

      <section class="about-card" aria-labelledby="about-title">
        <div class="portrait-shell">
          <div class="portrait-glow" aria-hidden="true" />
          <video v-if="authorAvatarIsVideo" :src="authorAvatar" autoplay muted loop playsinline preload="metadata" :aria-label="`${authorName} 的头像视频`" />
          <img v-else-if="authorAvatar" :src="authorAvatar" :alt="authorName">
          <span v-else>{{ authorInitial }}</span>
          <i aria-hidden="true" />
        </div>

        <div class="about-intro">
          <p class="about-eyebrow">HELLO, NICE TO MEET YOU</p>
          <h1 id="about-title">
            你好，我是
            <span>{{ siteName }}</span>
          </h1>
          <h2>{{ siteSubtitle }}</h2>
          <p class="about-description">{{ siteDescription }}</p>
        </div>

        <section class="stack-section" aria-labelledby="stack-title">
          <p id="stack-title" class="section-label">技术栈</p>
          <div class="stack-list">
            <span v-for="tech in techStack" :key="tech.name" class="stack-chip">
              <Icon :name="tech.icon" :class="tech.tone" aria-hidden="true" />
              {{ tech.name }}
            </span>
          </div>
        </section>

        <div class="about-actions">
          <nav class="social-links" aria-label="关于页快捷入口">
            <NuxtLink to="/archive" aria-label="文章归档" data-tooltip="文章归档">
              <Icon name="i-lucide-archive" aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/link" aria-label="友情链接" data-tooltip="友情链接">
              <Icon name="i-lucide-link" aria-hidden="true" />
            </NuxtLink>
            <NuxtLink to="/admin" aria-label="管理后台" data-tooltip="管理后台">
              <Icon name="i-lucide-settings" aria-hidden="true" />
            </NuxtLink>
          </nav>

          <NuxtLink to="/posts" class="posts-link">
            浏览文章
            <Icon name="i-lucide-external-link" aria-hidden="true" />
          </NuxtLink>
        </div>
      </section>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  targetAlpha: number
}

const config = useRuntimeConfig()
const colorMode = useColorMode()
const siteSettings = useSiteSettings()
const canvasRef = ref<HTMLCanvasElement | null>(null)

const siteName = computed(() => siteSettings.value.site_title || config.public.siteName || 'Jiupan')
const siteSubtitle = computed(() => siteSettings.value.site_subtitle || '全栈开发工程师 / 创作者 / 设计爱好者')
const siteDescription = computed(() => siteSettings.value.seo_description || '热爱构建优雅的数字产品，专注于前端体验与工程实践，用代码记录思考，也把灵感一点点变成现实。')
const authorName = computed(() => siteSettings.value.sidebar_author_name.trim() || siteName.value)
const authorAvatar = computed(() => siteSettings.value.sidebar_author_avatar)
const authorAvatarIsVideo = computed(() => /\.(?:mp4|webm)(?:$|[?#])/i.test(authorAvatar.value))
const authorInitial = computed(() => authorName.value.slice(0, 1).toUpperCase())

const techStack = [
  { name: 'Nuxt', icon: 'i-simple-icons-nuxtdotjs', tone: 'is-green' },
  { name: 'Vue.js', icon: 'i-simple-icons-vuedotjs', tone: 'is-emerald' },
  { name: 'TypeScript', icon: 'i-simple-icons-typescript', tone: 'is-blue' },
  { name: 'Node.js', icon: 'i-simple-icons-nodedotjs', tone: 'is-lime' },
  { name: 'PostgreSQL', icon: 'i-simple-icons-postgresql', tone: 'is-indigo' },
  { name: 'Prisma', icon: 'i-simple-icons-prisma', tone: 'is-violet' }
]

let animationFrame = 0
let removeResizeListener: (() => void) | undefined

function startParticles() {
  const canvas = canvasRef.value
  if (!canvas) return

  cancelAnimationFrame(animationFrame)
  removeResizeListener?.()

  const context = canvas.getContext('2d')
  if (!context) return

  let width = 0
  let height = 0
  let particles: Particle[] = []
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const resetParticle = (particle: Particle, initial = false) => {
    particle.x = Math.random() * width
    particle.y = initial ? Math.random() * height : height + Math.random() * 80
    particle.vx = (Math.random() - 0.5) * 0.35
    particle.vy = -(Math.random() * 0.35 + 0.12)
    particle.radius = Math.random() * 1.7 + 0.45
    particle.alpha = initial ? Math.random() * 0.42 + 0.08 : 0
    particle.targetAlpha = Math.random() * 0.44 + 0.12
  }

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    width = canvas.clientWidth
    height = canvas.clientHeight
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    particles = Array.from({ length: Math.min(Math.floor(width / 9), 160) }, () => {
      const particle = {} as Particle
      resetParticle(particle, true)
      return particle
    })
  }

  const draw = () => {
    context.clearRect(0, 0, width, height)
    const dark = colorMode.value === 'dark'
    const rgb = dark ? '103, 232, 249' : '100, 116, 139'

    for (const particle of particles) {
      if (!reducedMotion) {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.alpha += particle.alpha < particle.targetAlpha ? 0.003 : -0.0012
        if (particle.y < -5 || particle.alpha <= 0) resetParticle(particle)
      }

      context.beginPath()
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      context.fillStyle = `rgba(${rgb}, ${Math.max(0, particle.alpha)})`
      context.shadowBlur = dark ? 7 : 0
      context.shadowColor = `rgba(${rgb}, ${particle.alpha * 0.45})`
      context.fill()
    }

    context.shadowBlur = 0
    if (!reducedMotion) animationFrame = requestAnimationFrame(draw)
  }

  resize()
  draw()
  window.addEventListener('resize', resize, { passive: true })
  removeResizeListener = () => window.removeEventListener('resize', resize)
}

onMounted(startParticles)

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  removeResizeListener?.()
})

useSeoMeta({
  title: () => `关于 - ${siteName.value}`,
  description: () => siteDescription.value
})
</script>

<style scoped>
.about-stage {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 100%;
  place-items: center;
  overflow-x: clip;
  overflow-y: visible;
  background:
    radial-gradient(circle at 18% 18%, rgb(96 165 250 / 13%), transparent 30%),
    radial-gradient(circle at 83% 78%, rgb(129 140 248 / 13%), transparent 32%),
    linear-gradient(145deg, #f8fafc, #f2f5fb 48%, #f8fafc);
  padding: clamp(20px, 3.5vw, 34px) 12px;
  isolation: isolate;
}

.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.about-backdrop {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.about-glow {
  position: absolute;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  filter: blur(70px);
  opacity: .2;
  pointer-events: none;
}

.glow-one {
  top: -160px;
  right: 8%;
  background: #60a5fa;
}

.glow-two {
  bottom: -190px;
  left: 6%;
  background: #a78bfa;
}

.about-card {
  display: flex;
  width: min(100%, 530px);
  align-items: center;
  flex-direction: column;
  border: 1px solid rgb(255 255 255 / 88%);
  border-radius: 27px;
  background: rgb(255 255 255 / 62%);
  box-shadow: 0 20px 54px rgb(30 41 59 / 12%);
  padding: clamp(26px, 4vw, 39px);
  text-align: center;
  backdrop-filter: blur(24px);
  animation: card-arrive .8s cubic-bezier(.2, .78, .2, 1) both;
}

.portrait-shell {
  position: relative;
  width: clamp(94px, 11vw, 104px);
  height: clamp(94px, 11vw, 104px);
}

.portrait-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa, #818cf8, #c084fc);
  filter: blur(5px);
  opacity: .42;
  transition: opacity .3s ease;
}

.portrait-shell:hover .portrait-glow {
  opacity: .8;
}

.portrait-shell img,
.portrait-shell video,
.portrait-shell > span {
  position: relative;
  width: 100%;
  height: 100%;
  border: 3px solid rgb(255 255 255 / 94%);
  border-radius: 50%;
  background: #f1f5f9;
  object-fit: cover;
  transition: transform .35s ease;
}

.portrait-shell > span {
  display: grid;
  place-items: center;
  color: var(--theme-text);
  font-family: Georgia, "Noto Serif SC", serif;
  font-size: 28px;
  font-weight: 700;
}

.portrait-shell > i {
  position: absolute;
  right: 5px;
  bottom: 4px;
  z-index: 2;
  width: 12px;
  height: 12px;
  border: 2px solid var(--theme-surface);
  border-radius: 50%;
  background: #4ade80;
}

.portrait-shell:hover img,
.portrait-shell:hover video {
  transform: scale(1.035);
}

.about-intro {
  margin-top: 14px;
}

.about-eyebrow,
.section-label {
  margin: 0;
  color: var(--theme-text-faint);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .18em;
}

.about-intro h1 {
  margin: 8px 0 0;
  color: var(--theme-text);
  font-size: clamp(27px, 4vw, 34px);
  font-weight: 900;
  letter-spacing: -.045em;
  line-height: 1.15;
}

.about-intro h1 span {
  background: linear-gradient(100deg, #2563eb, #6366f1 55%, #8b5cf6);
  background-clip: text;
  color: transparent;
}

.about-intro h2 {
  margin: 7px 0 0;
  color: var(--theme-text-soft);
  font-size: clamp(13px, 1.7vw, 14px);
  font-weight: 650;
}

.about-description {
  max-width: 390px;
  margin: 7px auto 0;
  color: var(--theme-text-muted);
  font-size: 11px;
  line-height: 1.65;
}

.stack-section {
  width: 100%;
  margin-top: 17px;
  padding-top: 14px;
  border-top: 1px solid rgb(148 163 184 / 18%);
}

.stack-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px;
  margin-top: 8px;
}

.stack-chip {
  display: inline-flex;
  min-height: 27px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgb(148 163 184 / 20%);
  border-radius: 999px;
  background: rgb(255 255 255 / 68%);
  box-shadow: 0 6px 16px rgb(30 41 59 / 5%);
  color: var(--theme-text-soft);
  padding: 0 10px;
  font-size: 10px;
  font-weight: 750;
  transition: background .2s ease, transform .2s ease;
}

.stack-chip:hover {
  background: rgb(255 255 255 / 94%);
  transform: translateY(-2px);
}

.stack-chip svg {
  width: 12px;
  height: 12px;
}

.is-green,
.is-emerald,
.is-lime { color: #16a34a; }
.is-blue { color: #2563eb; }
.is-indigo { color: #4f46e5; }
.is-violet { color: #7c3aed; }

.about-actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-top: 16px;
}

.social-links {
  display: flex;
  gap: 7px;
}

.social-links a {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 10px;
  background: rgb(255 255 255 / 72%);
  box-shadow: 0 7px 18px rgb(30 41 59 / 6%);
  color: var(--theme-text-muted);
  transition: color .2s ease, transform .2s ease, box-shadow .2s ease;
}

.social-links a:hover {
  color: #4f46e5;
  box-shadow: 0 12px 24px rgb(79 70 229 / 13%);
  transform: translateY(-2px);
}

.social-links svg,
.posts-link svg {
  width: 14px;
  height: 14px;
}

.posts-link {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  background: #172033;
  box-shadow: 0 12px 26px rgb(15 23 42 / 20%);
  color: #fff;
  padding: 0 14px;
  font-size: 10px;
  font-weight: 800;
  transition: background .2s ease, transform .2s ease, box-shadow .2s ease;
}

.posts-link:hover {
  background: #26344d;
  box-shadow: 0 16px 30px rgb(15 23 42 / 25%);
  transform: translateY(-2px);
}

:global(.dark .about-stage) {
  background:
    radial-gradient(circle at 18% 18%, rgb(34 211 238 / 12%), transparent 30%),
    radial-gradient(circle at 83% 78%, rgb(99 102 241 / 15%), transparent 32%),
    linear-gradient(145deg, #020617, #070d1d 48%, #020617);
}

:global(.dark .about-card) {
  border-color: rgb(255 255 255 / 10%);
  background: rgb(15 23 42 / 40%);
  box-shadow: 0 30px 90px rgb(0 0 0 / 35%);
}

:global(.dark .portrait-shell img),
:global(.dark .portrait-shell video),
:global(.dark .portrait-shell > span) {
  border-color: #1e293b;
  background: #0f172a;
}

:global(.dark .about-eyebrow),
:global(.dark .section-label) {
  color: #64748b;
}

:global(.dark .about-intro h1) {
  color: #f8fafc;
}

:global(.dark .about-intro h1 span) {
  background-image: linear-gradient(100deg, #22d3ee, #60a5fa 55%, #818cf8);
}

:global(.dark .about-intro h2) {
  color: #cbd5e1;
}

:global(.dark .about-description) {
  color: #94a3b8;
}

:global(.dark .stack-section) {
  border-color: rgb(51 65 85 / 62%);
}

:global(.dark .stack-chip) {
  border-color: rgb(51 65 85 / 72%);
  background: rgb(30 41 59 / 52%);
  box-shadow: none;
  color: #f1f5f9;
}

:global(.dark .social-links a) {
  border-color: rgb(51 65 85 / 68%);
  background: rgb(30 41 59 / 80%);
  box-shadow: none;
  color: #cbd5e1;
}

:global(.dark .stack-chip:hover),
:global(.dark .social-links a:hover) {
  background: #334155;
}

:global(.dark .social-links a:hover) {
  color: #22d3ee;
}

:global(.dark .posts-link) {
  background: #06b6d4;
  box-shadow: 0 0 28px rgb(6 182 212 / 28%);
  color: #020617;
}

:global(.dark .posts-link:hover) {
  background: #22d3ee;
}

@keyframes card-arrive {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .about-stage {
    padding: 20px 20px 24px;
  }

  .about-card {
    border-radius: 24px;
    padding: 26px 18px;
  }

  .about-intro {
    margin-top: 13px;
  }

  .about-description {
    font-size: 11px;
  }

  .stack-section {
    margin-top: 16px;
    padding-top: 13px;
  }

  .stack-chip {
    min-height: 27px;
    padding: 0 10px;
    font-size: 10px;
  }

  .about-actions {
    gap: 12px;
    margin-top: 16px;
  }

  .social-links {
    justify-content: center;
  }

}

@media (max-width: 380px) {
  .about-stage {
    padding-right: 16px;
    padding-left: 16px;
  }

  .about-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .posts-link { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .about-card {
    animation: none;
  }

  .portrait-shell img,
  .portrait-shell video,
  .stack-chip,
  .social-links a,
  .posts-link {
    transition: none;
  }
}
</style>
