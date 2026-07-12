<template>
  <section class="lab-hero">
    <div class="lab-hud" aria-hidden="true">
      <div class="typewriter">SYS.INIT // 2026.x</div>
      <div class="hud-status">STATUS: ONLINE</div>
      <div class="hud-bars">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <div class="lab-badge">
      <SparklesIcon aria-hidden="true" />
      <span>欢迎来到下一代博客核心驱动引擎</span>
    </div>

    <h1>
      探索博客的
      <span data-text="智能边界">智能边界</span>
    </h1>

    <p>
      这里是站点的 AI 实验室。通过
      <strong>自然语言处理</strong>
      与
      <strong>大模型技术</strong>
      ，赋予博客全方位的创作、分析与重组能力。点击各项机能，开启
      <em>自动化体验</em>。
    </p>

    <div class="lab-auth-actions">
      <template v-if="user">
        <span>
          <UserRoundIcon aria-hidden="true" />
          {{ user.username || '已登录用户' }}
        </span>
      </template>
      <template v-else>
        <NuxtLink to="/login?redirect=/lab">登录</NuxtLink>
        <NuxtLink to="/register">注册</NuxtLink>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  Sparkles as SparklesIcon,
  UserRound as UserRoundIcon
} from '@lucide/vue'

defineProps<{
  user?: {
    username?: string
  } | null
}>()
</script>
