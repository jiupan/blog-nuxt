<template>
  <main class="auth-page">
    <section class="auth-card">
      <div class="auth-art" aria-hidden="true">
        <svg class="auth-blob" viewBox="0 0 200 200">
          <path
            fill="currentColor"
            d="M47.7,-57.2C59.9,-46.8,66.8,-30.3,71.2,-13.2C75.5,3.9,77.3,21.6,69.5,35.1C61.6,48.6,44.1,57.9,26.6,62.8C9.1,67.7,-8.4,68.2,-23.7,62.5C-39,56.8,-52.1,44.9,-61.8,29.8C-71.5,14.7,-77.8,-3.6,-74.2,-19.9C-70.6,-36.2,-57.1,-50.5,-42.2,-60.1C-27.3,-69.7,-11,-74.6,3.6,-78.9C18.2,-83.2,35.5,-67.6,47.7,-57.2Z"
            transform="translate(100 100)"
          />
        </svg>
        <div class="auth-art-content">
          <span class="auth-art-icon">
            <UIcon name="i-lucide-layout-dashboard" />
          </span>
          <h2>管理内容之前，先确认访问权限。</h2>
          <p>仅管理员账号可以进入后台，普通用户会被自动退出。</p>
        </div>
      </div>

      <div class="auth-panel">
        <NuxtLink to="/" class="auth-back">
          <UIcon name="i-lucide-arrow-left" />
          返回首页
        </NuxtLink>

        <div class="auth-heading">
          <NuxtLink to="/" class="auth-brand">{{ siteName || 'Dyu' }}<span>.</span></NuxtLink>
          <h1>后台登录</h1>
          <p>使用管理员账号进入内容管理台。</p>
        </div>

        <form class="auth-form" @submit.prevent="login">
          <label class="auth-field">
            <span>账号</span>
            <input
              v-model="form.username"
              autocomplete="username"
              type="text"
              placeholder="请输入用户名"
            >
          </label>

          <label class="auth-field">
            <span>密码</span>
            <div class="auth-password">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="请输入密码"
              >
              <button
                type="button"
                aria-label="切换密码显示"
                @click="showPassword = !showPassword"
              >
                <UIcon :name="showPassword ? 'i-lucide-eye' : 'i-lucide-eye-off'" />
              </button>
            </div>
          </label>

          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            :description="errorMessage"
          />

          <button type="submit" class="auth-submit" :disabled="pending">
            <span>{{ pending ? '登录中...' : '登录' }}</span>
            <UIcon v-if="!pending" name="i-lucide-arrow-right" />
            <UIcon v-else name="i-lucide-loader-2" class="auth-spin" />
          </button>
        </form>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import '~/assets/css/auth-page.css'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: false
})

const config = useRuntimeConfig()
const siteName = config.public.siteName
const { data: sessionData } = await useFetch<{ data: { user: { role?: string } | null } }>('/api/auth/me')

if (sessionData.value?.data.user?.role === 'ADMIN') {
  await navigateTo('/admin', { replace: true })
}

const form = reactive({
  username: 'admin',
  password: ''
})

const pending = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

async function login() {
  pending.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: form
    })

    const session = await $fetch<{ data: { user: { role?: string } | null } }>('/api/auth/me', {
      headers: {
        'cache-control': 'no-cache'
      }
    })
    if (session.data.user?.role !== 'ADMIN') {
      await $fetch('/api/auth/logout', { method: 'POST' })
      errorMessage.value = '该账号没有后台访问权限'
      return
    }
    await navigateTo('/admin', { replace: true })
  } catch (error: any) {
    errorMessage.value = getApiErrorMessage(error, { fallback: '登录失败' })
  } finally {
    pending.value = false
  }
}
</script>
