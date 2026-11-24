<template>
  <div class="about-stage about-scene">
    <div class="about-backdrop" aria-hidden="true">
      <canvas ref="canvasRef" class="particle-canvas" />
      <div class="about-glow glow-one" />
      <div class="about-glow glow-two" />
    </div>

    <SiteAboutCard :profile="profile" :author-avatar="authorAvatar" data-page-enter="0" />
  </div>
</template>

<script setup lang="ts">
import type { ApiResult } from '~~/types/api'
import { emptyAboutProfile, type AboutProfile } from '~~/shared/about-profile'

definePageMeta({ layout: 'default' })

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  targetAlpha: number
}

const colorMode = useColorMode()
const siteSettings = useSiteSettings()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const aboutLayoutActive = useState<boolean>('about-layout-active', () => false)

const { data } = await useFetch<ApiResult<AboutProfile>>('/api/about')
const profile = computed(() => data.value?.data ?? emptyAboutProfile)
const authorAvatar = computed(() => siteSettings.value.sidebar_author_avatar)

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

onMounted(() => {
  aboutLayoutActive.value = true
  startParticles()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  removeResizeListener?.()
})

onUnmounted(() => {
  aboutLayoutActive.value = false
})

useSeoMeta({
  title: () => profile.value.name ? `关于 - ${profile.value.name}` : '关于作者',
  description: () => profile.value.description.replace(/\s+/g, ' ').slice(0, 160) || '了解博客作者。'
})
</script>

<style scoped>
.about-stage {
  --about-padding-top: clamp(20px, 3.5vw, 34px);
  position: relative;
  display: grid;
  width: 100%;
  min-height: 100%;
  margin-top: calc(-1 * var(--site-header-height));
  place-items: center;
  overflow-x: clip;
  overflow-y: visible;
  padding-block: calc(var(--about-padding-top) + var(--site-header-height)) var(--about-padding-top);
  padding-inline: 12px;
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

@media (max-width: 640px) {
  .about-stage {
    --about-padding-top: 20px;
    padding-bottom: 24px;
    padding-inline: 20px;
  }
}

@media (max-width: 380px) {
  .about-stage {
    padding-inline: 16px;
  }
}
</style>
