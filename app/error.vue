<template>
  <NuxtLayout name="default" force-standard-header compact-footer viewport-fit>
    <div class="error-page" @pointermove="handlePointerMove" @pointerleave="resetTilt">
      <div class="error-aurora" aria-hidden="true">
        <span class="error-orb orb-purple" />
        <span class="error-orb orb-blue" />
        <span class="error-orb orb-rose" />
        <span class="error-grid" />
      </div>

      <main class="error-stage">
        <section class="error-card" :style="cardStyle" aria-labelledby="error-title">
          <span class="card-highlight" aria-hidden="true" />

          <div class="error-code" aria-hidden="true">{{ statusCode }}</div>
          <span class="error-divider" aria-hidden="true" />

          <p class="error-kicker">PAGE NOT FOUND</p>
          <h1 id="error-title">走进了一片未知区域</h1>
          <p class="error-description">
            {{ errorDescription }}
          </p>

          <div class="error-actions">
            <button type="button" class="primary-action" @click="goHome">
              <UIcon name="i-lucide-arrow-left" class="size-4" />
              返回首页
            </button>
            <button type="button" class="secondary-action" @click="goTo('/posts')">
              阅读最新文章
              <UIcon name="i-lucide-arrow-right" class="size-4" />
            </button>
          </div>

          <nav class="error-links" aria-label="404 快速导航">
            <a href="/about">关于作者</a>
            <i aria-hidden="true" />
            <a href="/archive">文章归档</a>
            <i aria-hidden="true" />
            <a href="/lab">实验室</a>
          </nav>
        </section>
      </main>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const tiltX = ref(0)
const tiltY = ref(0)
const statusCode = computed(() => props.error?.statusCode || 404)
const errorDescription = computed(() => statusCode.value === 404
  ? '你正在寻找的页面可能已经随风而去，或被移动到了另一个角落。不过没关系，每一次迷路都可能遇见新的内容。'
  : '页面暂时无法访问，请稍后再试，或者先回到首页继续浏览。')
const cardStyle = computed(() => ({
  transform: `perspective(1100px) rotateX(${tiltX.value}deg) rotateY(${tiltY.value}deg)`
}))

useHead({
  title: () => `${statusCode.value} - 页面未找到`
})

function handlePointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  tiltX.value = -((event.clientY / window.innerHeight) - 0.5) * 5
  tiltY.value = ((event.clientX / window.innerWidth) - 0.5) * 5
}

function resetTilt() {
  tiltX.value = 0
  tiltY.value = 0
}

function goHome() {
  clearError({ redirect: '/' })
}

function goTo(path: string) {
  clearError({ redirect: path })
}
</script>

<style scoped>
.error-page {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 100%;
  place-items: center;
  overflow: hidden;
  background: #f8fafc;
  color: #334155;
  isolation: isolate;
}

.error-aurora,
.error-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.error-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(82px);
  opacity: 0.72;
  will-change: transform;
}

.orb-purple {
  top: -18%;
  left: -10%;
  width: min(34rem, 58vw);
  aspect-ratio: 1;
  background: rgb(196 181 253 / 62%);
  animation: float-one 15s ease-in-out infinite;
}

.orb-blue {
  right: -12%;
  bottom: -30%;
  width: min(48rem, 70vw);
  aspect-ratio: 1;
  background: rgb(147 197 253 / 52%);
  animation: float-two 20s ease-in-out infinite;
}

.orb-rose {
  top: 38%;
  left: 58%;
  width: min(27rem, 48vw);
  aspect-ratio: 1;
  background: rgb(253 164 175 / 46%);
  animation: float-three 18s ease-in-out infinite;
}

.error-grid {
  background-image: linear-gradient(rgb(100 116 139 / 4%) 1px, transparent 1px), linear-gradient(90deg, rgb(100 116 139 / 4%) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at center, #000, transparent 72%);
}

.error-stage {
  position: relative;
  z-index: 1;
  width: min(100% - 32px, 620px);
  padding: 46px 0;
  perspective: 1100px;
}

.error-card {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: center;
  flex-direction: column;
  border: 1px solid rgb(255 255 255 / 86%);
  border-radius: 28px;
  background: linear-gradient(135deg, rgb(255 255 255 / 74%), rgb(240 240 255 / 46%));
  box-shadow: 0 30px 70px -24px rgb(51 65 85 / 18%), inset 0 0 0 1px rgb(255 255 255 / 25%);
  padding: 40px 42px 28px;
  text-align: center;
  backdrop-filter: blur(26px) saturate(120%);
  transform-style: preserve-3d;
  transition: transform 160ms ease-out;
}

.card-highlight {
  position: absolute;
  top: 0;
  left: 12%;
  width: 76%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #fff, transparent);
}

.error-code {
  background: linear-gradient(135deg, #6366f1, #a855f7 52%, #ec4899);
  background-clip: text;
  color: transparent;
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: clamp(6rem, 16vw, 8rem);
  font-weight: 700;
  letter-spacing: -0.09em;
  line-height: 0.78;
  padding-right: 0.08em;
  text-shadow: 0 18px 42px rgb(99 102 241 / 16%);
  user-select: none;
}

.error-divider {
  width: 64px;
  height: 2px;
  margin: 25px 0 16px;
  border-radius: 999px;
  background: #c7d2fe;
}

.error-kicker {
  margin: 0 0 8px;
  color: #8b92a3;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.24em;
}

.error-card h1 {
  margin: 0;
  color: #273444;
  font-family: Georgia, "Times New Roman", "Noto Serif SC", serif;
  font-size: clamp(1.55rem, 3.5vw, 1.85rem);
  font-weight: 500;
  line-height: 1.25;
}

.error-description {
  max-width: 590px;
  margin: 12px 0 0;
  color: #64748b;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.9;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 23px;
}

.error-actions button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 999px;
  padding: 0 20px;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
  transition: border-color 200ms ease, background 200ms ease, box-shadow 200ms ease, color 200ms ease, transform 200ms ease;
}

.error-actions button:hover {
  transform: translateY(-2px);
}

.primary-action {
  border: 1px solid rgb(203 213 225 / 88%);
  background: rgb(255 255 255 / 88%);
  color: #334155;
  box-shadow: 0 8px 20px -10px rgb(99 102 241 / 35%);
}

.primary-action:hover {
  border-color: #fff;
  background: #fff;
  box-shadow: 0 12px 28px -10px rgb(99 102 241 / 30%);
}

.secondary-action {
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
}

.secondary-action:hover {
  background: rgb(255 255 255 / 55%);
  color: #334155;
}

.error-links {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 32px;
  border-top: 1px solid rgb(203 213 225 / 58%);
  padding-top: 18px;
}

.error-links a {
  color: #7c8796;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.14em;
  transition: color 160ms ease;
}

.error-links a:hover { color: #475569; }
.error-links i { width: 3px; height: 3px; border-radius: 50%; background: #94a3b8; opacity: 0.45; }

@keyframes float-one { 0%, 100% { transform: translate(0) scale(1); } 35% { transform: translate(30px, -42px) scale(1.08); } 68% { transform: translate(-18px, 22px) scale(.94); } }
@keyframes float-two { 0%, 100% { transform: translate(0) scale(1); } 35% { transform: translate(-45px, -28px) scale(.93); } 68% { transform: translate(22px, 38px) scale(1.06); } }
@keyframes float-three { 0%, 100% { transform: translate(0) scale(1); } 35% { transform: translate(36px, 34px) scale(1.08); } 68% { transform: translate(-34px, -18px) scale(.92); } }

@media (max-width: 640px) {
  .error-stage { width: min(100% - 20px, 620px); padding: 28px 0; }
  .error-card { border-radius: 24px; padding: 38px 18px 24px; }
  .error-code { font-size: clamp(6rem, 34vw, 8rem); }
  .error-divider { margin: 24px 0 18px; }
  .error-description { font-size: 13px; }
  .error-actions { width: 100%; }
  .error-actions button { width: 100%; }
  .error-links { gap: 13px; margin-top: 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .error-orb { animation: none; }
  .error-card, .error-actions button { transition: none; }
}
</style>
