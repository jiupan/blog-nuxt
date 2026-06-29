<template>
  <div class="min-h-screen bg-[#f7f8fa] px-4 text-slate-950">
    <main class="mx-auto flex min-h-screen w-full max-w-[460px] flex-col items-center justify-center pb-18">
      <form class="mt-[60px] w-full" @submit.prevent="login">
        <!-- Logo -->
        <div class="mb-14 flex items-center justify-center gap-4">
          <div class="grid size-10.5 place-items-center overflow-hidden rounded-full bg-cyan-400 shadow-sm">
            <div class="grid size-9 place-items-center rounded-full bg-cyan-300">
              <UIcon name="i-lucide-user-round" class="size-5 text-slate-900" />
            </div>
          </div>
          <h1 class="text-[24px] font-medium tracking-wide text-slate-950">
            {{ siteName }}
          </h1>
        </div>

        <!-- 输入框 -->
        <div class="space-y-6">
          <div class="relative">
            <input
              v-model="form.username"
              autocomplete="username"
              type="text"
              placeholder="请输入用户名"
              class="h-[54px] w-full rounded-full border border-slate-200 bg-white px-8 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-3 focus:ring-slate-200/60"
            />
          </div>

          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
              class="h-[54px] w-full rounded-full border border-slate-200 bg-white px-8 pr-12 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-3 focus:ring-slate-200/60"
            />
            <button
              type="button"
              class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              @click="showPassword = !showPassword"
            >
              <UIcon
                :name="showPassword ? 'i-lucide-eye' : 'i-lucide-eye-off'"
                class="size-5"
              />
            </button>
          </div>
        </div>

        <!-- 错误提示 -->
        <UAlert
          v-if="errorMessage"
          class="mt-5"
          color="error"
          variant="soft"
          :description="errorMessage"
        />

        <!-- 登录按钮 -->
        <button
          type="submit"
          :disabled="pending"
          class="mt-6 flex h-[54px] w-full items-center justify-center rounded-full bg-[#111] text-[16px] font-semibold tracking-[0.2em] text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span v-if="!pending">登录</span>
          <span v-else>登录中...</span>
        </button>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const config = useRuntimeConfig()
const siteName = config.public.siteName
const { data: sessionData } = await useFetch('/api/auth/me')

if (sessionData.value?.data.user) {
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

    await navigateTo('/admin')
  } catch (error: any) {
    errorMessage.value = error?.statusMessage || '登录失败'
  } finally {
    pending.value = false
  }
}
</script>
