<template>
  <main class="min-h-screen bg-[#f7f8fa] px-4 text-slate-950">
    <section class="mx-auto flex min-h-screen w-full max-w-[460px] flex-col justify-center pb-16">
      <NuxtLink to="/lab" class="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        返回 Lab
      </NuxtLink>

      <div class="mb-10">
        <h1 class="text-3xl font-semibold tracking-tight">登录账号</h1>
        <p class="mt-3 text-sm leading-6 text-slate-500">登录后可以使用 Lab 里的 AI 功能。</p>
      </div>

      <form class="space-y-5" @submit.prevent="login">
        <input
          v-model="form.username"
          autocomplete="username"
          type="text"
          placeholder="用户名或邮箱"
          class="h-[54px] w-full rounded-full border border-slate-200 bg-white px-7 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-3 focus:ring-slate-200/60"
        />

        <div class="relative">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="密码"
            class="h-[54px] w-full rounded-full border border-slate-200 bg-white px-7 pr-12 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-3 focus:ring-slate-200/60"
          />
          <button
            type="button"
            class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            aria-label="切换密码显示"
            @click="showPassword = !showPassword"
          >
            <UIcon :name="showPassword ? 'i-lucide-eye' : 'i-lucide-eye-off'" class="size-5" />
          </button>
        </div>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :description="errorMessage"
        />

        <button
          type="submit"
          :disabled="pending"
          class="flex h-[54px] w-full items-center justify-center rounded-full bg-[#111] text-[16px] font-semibold tracking-[0.18em] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          {{ pending ? '登录中...' : '登录' }}
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-slate-500">
        还没有账号？
        <NuxtLink to="/register" class="font-semibold text-slate-950 hover:underline">注册</NuxtLink>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: false
})

const route = useRoute()
const { data: sessionData } = await useFetch('/api/auth/me')

if (sessionData.value?.data.user) {
  await navigateTo(String(route.query.redirect || '/lab'), { replace: true })
}

const form = reactive({
  username: '',
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
    await navigateTo(String(route.query.redirect || '/lab'), { replace: true })
  } catch (error: any) {
    errorMessage.value = getApiErrorMessage(error, { fallback: '登录失败' })
  } finally {
    pending.value = false
  }
}
</script>
