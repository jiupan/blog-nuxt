<template>
  <main class="account-shell account-auth-shell">
    <NuxtLink to="/login" class="auth-back">返回登录</NuxtLink>
    <section class="account-card" data-page-enter="0">
      <h1>{{ title }}</h1>
      <template v-if="done">
        <UAlert color="success" variant="soft" :title="successMessage" />
        <UButton :to="purpose === 'VERIFY' ? '/account' : '/login'">
          {{ purpose === 'VERIFY' ? '打开账户设置' : '前往登录' }}
        </UButton>
      </template>
      <form v-else class="account-form" @submit.prevent="submit">
        <template v-if="action === 'forgot'">
          <p class="account-description">输入已验证的邮箱，我们会向它发送密码重置链接。</p>
          <UAlert v-if="emailAvailable === false" color="warning" variant="soft" title="邮件服务暂不可用，请稍后重试。" />
          <label class="account-field">邮箱 <UInput v-model="email" type="email" autocomplete="email" maxlength="254" required /></label>
        </template>
        <p v-else-if="!token" class="account-description">{{ ready ? '请从邮件中的链接打开此页面。链接过期后，可重新申请。' : '正在读取邮件链接…' }}</p>
        <p v-else-if="purpose === 'VERIFY'" class="account-description">确认后，这个邮箱可用于登录和找回密码。</p>
        <template v-else>
          <p class="account-description">设置新密码后，请使用新密码登录。</p>
          <label class="account-field">新密码 <UInput v-model="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required /></label>
          <label class="account-field">确认新密码 <UInput v-model="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required /></label>
        </template>
        <UAlert v-if="errorMessage" role="alert" color="error" variant="soft" :title="errorMessage" />
        <div class="account-actions">
          <UButton v-if="action === 'forgot' || token" type="submit" :loading="pending" :disabled="action === 'forgot' && emailAvailable === false">{{ submitLabel }}</UButton>
          <UButton v-if="action === 'reset' && (errorMessage || !token)" to="/account/forgot" color="neutral" variant="outline">重新申请链接</UButton>
          <UButton v-if="action === 'verify' && (errorMessage || !token)" to="/account" color="neutral" variant="outline">打开账户设置</UButton>
          <p v-if="action === 'invite' && (errorMessage || !token)" class="account-description">请联系管理员重新发送邀请。</p>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import '~/assets/css/account.css'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({
  layout: 'standalone',
  validate: route => ['forgot', 'verify', 'reset', 'invite'].includes(String(route.params.action))
})
const route = useRoute()
const action = computed(() => String(route.params.action))
const titles = { forgot: '找回密码', verify: '验证邮箱', reset: '重置密码', invite: '设置账号密码' }
const purposes = { forgot: null, verify: 'VERIFY', reset: 'RESET', invite: 'INVITE' } as const
const accountAction = computed(() => action.value as keyof typeof titles)
const purpose = computed(() => purposes[accountAction.value])
const title = computed(() => titles[accountAction.value])
const submitLabel = computed(() => action.value === 'forgot' ? '发送重置链接' : purpose.value === 'VERIFY' ? '确认验证' : '保存新密码')
const successMessage = computed(() => action.value === 'forgot'
  ? '如果该邮箱已验证并绑定账号，会收到一封重置邮件。'
  : purpose.value === 'VERIFY' ? '邮箱已验证' : '密码已设置，请重新登录')
useHead({ title, meta: [{ name: 'robots', content: 'noindex' }, { name: 'referrer', content: 'no-referrer' }] })

const token = ref('')
const ready = ref(false)
const { data: accountData } = useSiteAccount()
const emailAvailable = computed(() => accountData.value?.data.emailAvailable)
onMounted(() => {
  token.value = new URLSearchParams(route.hash.slice(1)).get('token') || ''
  ready.value = true
})
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const pending = ref(false)
const done = ref(false)

async function submit() {
  if (pending.value || (action.value !== 'forgot' && (!token.value || !purpose.value))) return
  errorMessage.value = ''
  if (action.value !== 'forgot' && purpose.value !== 'VERIFY' && password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }
  pending.value = true
  try {
    if (action.value === 'forgot') {
      await $fetch('/api/auth/forgot', { method: 'POST', body: { email: email.value } })
    } else {
      await $fetch('/api/auth/email-token', {
        method: 'POST',
        body: { token: token.value, purpose: purpose.value, ...(purpose.value === 'VERIFY' ? {} : { password: password.value }) }
      })
      password.value = ''
      confirmPassword.value = ''
      history.replaceState(history.state, '', route.path)
      token.value = ''
      await refreshNuxtData('site-account')
    }
    done.value = true
  } catch (cause) {
    errorMessage.value = getApiErrorMessage(cause, { fallback: '操作失败，请重试' })
  } finally {
    pending.value = false
  }
}
</script>
