<template>
  <main class="min-h-screen bg-[#f7f8fa] px-4 text-slate-950">
    <section class="mx-auto flex min-h-screen w-full max-w-[460px] flex-col justify-center pb-16">
      <NuxtLink to="/lab" class="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        返回 Lab
      </NuxtLink>

      <div class="mb-10">
        <h1 class="text-3xl font-semibold tracking-tight">注册账号</h1>
        <p class="mt-3 text-sm leading-6 text-slate-500">注册后默认是普通用户，只能使用 Lab AI 功能，不能进入后台。</p>
      </div>

      <form class="space-y-5" @submit.prevent="register">
        <input
          v-model="form.username"
          autocomplete="username"
          type="text"
          placeholder="用户名，3-32 位字母数字"
          class="h-[54px] w-full rounded-full border border-slate-200 bg-white px-7 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-3 focus:ring-slate-200/60"
        />

        <input
          v-model="form.email"
          autocomplete="email"
          type="email"
          placeholder="邮箱"
          class="h-[54px] w-full rounded-full border border-slate-200 bg-white px-7 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-3 focus:ring-slate-200/60"
        />

        <div class="relative">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="密码，至少 12 位"
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
          {{ pending ? '注册中...' : '注册并登录' }}
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-slate-500">
        已经有账号？
        <NuxtLink to="/login" class="font-semibold text-slate-950 hover:underline">登录</NuxtLink>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: false
})

const { data: sessionData } = await useFetch('/api/auth/me')

if (sessionData.value?.data.user) {
  await navigateTo('/lab', { replace: true })
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
    await navigateTo('/lab', { replace: true })
  } catch (error: any) {
    errorMessage.value = getApiErrorMessage(error, { fallback: '注册失败' })
  } finally {
    pending.value = false
  }
}
</script>
