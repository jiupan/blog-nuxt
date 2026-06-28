<template>
  <div class="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
    <form class="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm" @submit.prevent="login">
      <div class="flex items-center gap-3">
        <span class="grid size-11 place-items-center rounded-lg bg-slate-950 text-white">
          <UIcon name="i-lucide-feather" class="size-5" />
        </span>
        <div>
          <h1 class="text-xl font-semibold text-slate-950">后台登录</h1>
          <p class="mt-1 text-sm text-slate-500">进入博客内容管理台</p>
        </div>
      </div>
      <div class="mt-6 grid gap-4">
        <UFormField label="用户名">
          <UInput v-model="form.username" icon="i-lucide-user" autocomplete="username" />
        </UFormField>
        <UFormField label="密码">
          <UInput v-model="form.password" icon="i-lucide-lock-keyhole" type="password" autocomplete="current-password" />
        </UFormField>
        <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
        <UButton type="submit" block icon="i-lucide-log-in" :loading="pending">登录</UButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const form = reactive({
  username: 'admin',
  password: ''
})
const pending = ref(false)
const errorMessage = ref('')

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
