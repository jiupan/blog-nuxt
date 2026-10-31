<template>
  <main class="admin-login-page">
    <section class="admin-login-card">
      <NuxtLink
        to="/"
        class="admin-login-brand"
      >
        <span>
          <UIcon
            name="i-lucide-feather"
            class="size-5"
          />
        </span>
        {{ siteName || 'Jiupan Blog' }}
      </NuxtLink>
      <div class="admin-login-heading">
        <h1>登录工作台</h1>
        <p>管理内容、整理想法，让创作继续。</p>
      </div>
      <form
        class="admin-login-form"
        @submit.prevent="login"
      >
        <label for="admin-username">管理员账号</label>
        <input
          id="admin-username"
          v-model="form.username"
          autocomplete="username"
          type="text"
          placeholder="请输入账号"
          required
        >
        <label for="admin-password">密码</label>
        <div class="admin-login-password">
          <input
            id="admin-password"
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="请输入密码"
            required
          >
          <button
            type="button"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <UIcon
              :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              class="size-4"
            />
          </button>
        </div>
        <p
          v-if="errorMessage"
          class="admin-login-error"
          role="alert"
        >
          {{ errorMessage }}
        </p>
        <button
          type="submit"
          class="admin-login-submit"
          :disabled="pending"
        >
          <UIcon
            v-if="pending"
            name="i-lucide-loader-circle"
            class="size-4 animate-spin"
          />
          {{ pending ? '正在登录…' : '进入工作台' }}
          <UIcon
            v-if="!pending"
            name="i-lucide-arrow-right"
            class="size-4"
          />
        </button>
      </form>
      <div class="admin-login-footer">
        <NuxtLink to="/">
          <UIcon
            name="i-lucide-arrow-left"
            class="size-3.5"
          />
          返回博客
        </NuxtLink>
        <span>仅管理员可访问</span>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import '@fontsource-variable/noto-sans-sc'
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
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error, { fallback: '登录失败' })
  } finally {
    pending.value = false
  }
}
</script>
<style scoped>
.admin-login-page {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 32px 20px;
  background: #f5f6f8;
  color: #202633;
  font-family: 'Noto Sans SC Variable', 'Microsoft YaHei', sans-serif;
  color-scheme: light;
}
.admin-login-card {
  width: min(100%, 420px);
  padding: 36px;
  border: 1px solid #e4e7ec;
  border-radius: 12px;
  background: #fff;
}
.admin-login-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 550;
}
.admin-login-brand > span {
  display: grid;
  width: 32px;
  height: 36px;
  place-items: center;
  border-radius: 8px 8px 8px 3px;
  background: #6554c0;
  color: #fff;
}
.admin-login-heading {
  margin: 34px 0 28px;
}
.admin-login-heading h1 {
  margin: 0;
  font-size: 25px;
  font-weight: 600;
  letter-spacing: -0.7px;
}
.admin-login-heading p {
  margin-top: 10px;
  color: #667085;
  font-size: 12px;
}
.admin-login-form {
  display: grid;
  gap: 10px;
}
.admin-login-form label {
  color: #596273;
  font-size: 12px;
}
.admin-login-form > label:not(:first-child) {
  margin-top: 10px;
}
.admin-login-form input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1px solid #d8dce4;
  border-radius: 6px;
  background: #fff;
  color: #202633;
  font: inherit;
  font-size: 13px;
  outline: none;
}
.admin-login-form input:focus {
  border-color: #a393ca;
  box-shadow: 0 0 0 3px #6554c012;
}
.admin-login-password {
  position: relative;
}
.admin-login-password input {
  padding-right: 40px;
}
.admin-login-password button {
  position: absolute;
  inset: 0 5px 0 auto;
  display: grid;
  width: 32px;
  place-items: center;
  color: #697386;
  cursor: pointer;
}
.admin-login-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 42px;
  margin-top: 16px;
  border-radius: 6px;
  background: #6554c0;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.admin-login-submit:disabled {
  opacity: 0.65;
  cursor: wait;
}
.admin-login-error {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #fcf1f1;
  color: #a14545;
  font-size: 12px;
  line-height: 1.8;
}
.admin-login-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 28px;
  padding-top: 22px;
  border-top: 1px solid #e4e7ec;
  color: #697386;
  font-size: 11px;
}
.admin-login-footer a {
  display: flex;
  align-items: center;
  gap: 6px;
}
.admin-login-page :is(a, button):focus-visible {
  outline: 2px solid #6554c0;
  outline-offset: 3px;
}
@media (max-width: 480px) {
  .admin-login-card {
    padding: 28px 24px;
  }
}
</style>
