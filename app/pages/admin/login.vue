<template>
  <div class="grid min-h-screen place-items-center bg-gray-50 px-4">
    <form class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6" @submit.prevent="login">
      <h1 class="text-2xl font-semibold">后台登录</h1>
      <div class="mt-6 grid gap-4">
        <UFormField label="用户名">
          <UInput v-model="form.username" autocomplete="username" />
        </UFormField>
        <UFormField label="密码">
          <UInput v-model="form.password" type="password" autocomplete="current-password" />
        </UFormField>
        <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
        <UButton type="submit" block :loading="pending">登录</UButton>
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
