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
            <UIcon name="i-lucide-pen-line" />
          </span>
          <h2>从一个账号开始，保存你的提问和创作节奏。</h2>
          <p>注册后默认是普通用户，可使用 Lab AI 功能，不能进入后台。</p>
        </div>
      </div>

      <div class="auth-panel">
        <NuxtLink :to="redirectTarget" class="auth-back">
          <UIcon name="i-lucide-arrow-left" />
          {{ hasRedirect ? '返回原页面' : '返回 Lab' }}
        </NuxtLink>

        <div class="auth-heading">
          <NuxtLink to="/" class="auth-brand">Dyu<span>.</span></NuxtLink>
          <h1>创建账号</h1>
          <p>注册后即可继续使用 Lab AI 功能。</p>
        </div>

        <form class="auth-form" @submit.prevent="register">
          <label class="auth-field">
            <span>用户名</span>
            <input
              v-model="form.username"
              autocomplete="username"
              type="text"
              placeholder="3-32 位字母数字"
            >
          </label>

          <label class="auth-field">
            <span>邮箱</span>
            <input
              v-model="form.email"
              autocomplete="email"
              type="email"
              placeholder="name@domain.com"
            >
          </label>

          <label class="auth-field">
            <span>密码</span>
            <div class="auth-password">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="至少 12 位"
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
            <span>{{ pending ? '注册中...' : '注册并登录' }}</span>
            <UIcon v-if="!pending" name="i-lucide-arrow-right" />
            <UIcon v-else name="i-lucide-loader-2" class="auth-spin" />
          </button>
        </form>

        <p class="auth-switch">
          已经有账号？
          <NuxtLink :to="loginLink">登录</NuxtLink>
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import '~/assets/css/auth-page.css'
import { getApiErrorMessage } from '~/utils/api-error'
import { resolveAuthRedirect } from '~/utils/auth-redirect'

definePageMeta({
  layout: false
})

const route = useRoute()
const hasRedirect = computed(() => typeof route.query.redirect === 'string')
const redirectTarget = computed(() => resolveAuthRedirect(route.query.redirect))
const loginLink = computed(() => hasRedirect.value
  ? { path: '/login', query: { redirect: redirectTarget.value } }
  : { path: '/login' })
const { data: sessionData } = await useFetch('/api/auth/me')

if (sessionData.value?.data.user) {
  await navigateTo(redirectTarget.value, { replace: true })
}

const form = reactive({
  username: '',
  email: '',
  password: ''
})

const pending = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

async function register() {
  pending.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: form
    })
    await navigateTo(redirectTarget.value, { replace: true })
  } catch (error: any) {
    errorMessage.value = getApiErrorMessage(error, { fallback: '注册失败' })
  } finally {
    pending.value = false
  }
}
</script>
