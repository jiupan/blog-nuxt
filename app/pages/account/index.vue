<template>
  <section class="account-shell">
    <header class="account-heading" data-page-enter="0">
      <h1>账户设置</h1>
      <p>管理个人资料、登录和安全设置。</p>
    </header>
    <UAlert v-if="error" color="error" variant="soft" title="账户信息暂时无法加载" data-page-enter="1">
      <template #actions><UButton size="sm" color="neutral" @click="refresh()">重试</UButton></template>
    </UAlert>
    <div v-else-if="account" class="account-grid" data-page-enter="1">
      <div class="account-column">
        <AccountProfileEditor :account="account" @saved="profileSaved" />
        <section class="account-card" aria-labelledby="account-email-heading">
          <h2 id="account-email-heading">邮箱</h2>
          <div class="account-actions">
            <strong class="account-address">{{ account.email || '尚未绑定邮箱' }}</strong>
            <UBadge :color="account.emailVerifiedAt ? 'success' : 'warning'" variant="soft">
              {{ account.emailVerifiedAt ? '已验证' : '待验证' }}
            </UBadge>
          </div>
          <p v-if="account.pendingEmail" class="account-description account-address">等待验证 {{ account.pendingEmail }}</p>
          <p v-if="!emailAvailable" class="account-description">邮件服务暂不可用，仍可使用用户名登录。</p>
          <template v-else>
            <div class="account-actions">
              <UButton v-if="account.pendingEmail || (account.email && !account.emailVerifiedAt)" :loading="busy === 'email'" size="sm" @click="sendEmail(false)">发送验证邮件</UButton>
              <UButton color="neutral" variant="outline" size="sm" @click="editingEmail = !editingEmail">
                {{ editingEmail ? '取消修改' : '修改邮箱' }}
              </UButton>
            </div>
            <form v-if="editingEmail" class="account-form" @submit.prevent="sendEmail(true)">
              <label class="account-field">新邮箱 <UInput v-model="email" type="email" autocomplete="email" required maxlength="254" /></label>
              <label class="account-field">当前密码 <UInput v-model="emailPassword" type="password" autocomplete="current-password" required /></label>
              <div><UButton type="submit" :loading="busy === 'email'">向新邮箱发送验证邮件</UButton></div>
            </form>
          </template>
        </section>
        <section class="account-card" aria-labelledby="account-password-heading">
          <h2 id="account-password-heading">修改密码</h2>
          <p class="account-description">保存新密码后，所有设备都需要重新登录。</p>
          <form class="account-form" @submit.prevent="changePassword">
            <label class="account-field">当前密码 <UInput v-model="currentPassword" type="password" autocomplete="current-password" required /></label>
            <label class="account-field">新密码 <UInput v-model="newPassword" type="password" autocomplete="new-password" required minlength="12" maxlength="128" placeholder="至少 12 位" /></label>
            <label class="account-field">确认新密码 <UInput v-model="confirmPassword" type="password" autocomplete="new-password" required minlength="12" maxlength="128" /></label>
            <div><UButton type="submit" :loading="busy === 'password'">保存新密码</UButton></div>
          </form>
        </section>
      </div>
      <div class="account-column">
        <section class="account-card" aria-labelledby="account-usage-heading">
          <h2 id="account-usage-heading">今日 AI 额度</h2>
          <AiQuotaSummary v-if="usage?.data" :usage="usage.data" />
          <UButton v-else-if="usageStatus === 'error'" color="neutral" variant="outline" size="sm" @click="refreshUsage()">重新加载额度</UButton>
          <p v-else class="account-description" role="status">正在加载额度…</p>
        </section>
        <section class="account-card" aria-labelledby="account-session-heading">
          <h2 id="account-session-heading">登录设备</h2>
          <p class="account-description">在共享设备上使用后，可退出此设备。如果怀疑账号被他人使用，请退出所有设备。</p>
          <div class="account-actions">
            <UButton color="neutral" variant="outline" :loading="busy === 'logout'" @click="signOut(false)">退出此设备</UButton>
            <UButton color="error" variant="soft" @click="confirmSignOut = true">退出所有设备</UButton>
          </div>
        </section>
        <section class="account-card">
          <h2>继续使用</h2>
          <div class="account-actions">
            <UButton to="/lab" color="neutral" variant="outline" icon="i-lucide-flask-conical">实验室</UButton>
            <UButton to="/tools/resume" color="neutral" variant="outline" icon="i-lucide-file-text">简历工坊</UButton>
            <UButton v-if="account.role === 'ADMIN'" to="/admin" color="neutral" variant="outline">管理后台</UButton>
          </div>
        </section>
      </div>
    </div>
    <UModal v-model:open="confirmSignOut" title="退出所有设备？" description="此操作会结束此账号在所有浏览器和设备上的登录。">
      <template #footer>
        <div class="account-actions">
          <UButton color="neutral" variant="outline" @click="confirmSignOut = false">取消</UButton>
          <UButton color="error" :loading="busy === 'logout-all'" @click="signOut(true)">确认退出</UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>

<script setup lang="ts">
import '~/assets/css/account.css'
import type { AccountSnapshot, AccountUsage, UserPublicProfile } from '~~/types/dto/user'
import { getApiErrorMessage } from '~/utils/api-error'

const { data, error, refresh } = await useFetch<{ data: AccountSnapshot }>('/api/auth/me')
if (!error.value && !data.value?.data.user) {
  await navigateTo({ path: '/login', query: { redirect: '/account' } }, { replace: true })
}
useHead({ title: '账户设置', meta: [{ name: 'robots', content: 'noindex' }] })
const account = computed(() => data.value?.data.user)
const emailAvailable = computed(() => data.value?.data.emailAvailable)
const { data: usage, status: usageStatus, refresh: refreshUsage } = useFetch<{ data: AccountUsage }>('/api/auth/usage', {
  key: 'account-usage', server: false, lazy: true
})
const toast = useToast()
const editingEmail = ref(false)
const email = ref('')
const emailPassword = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const confirmSignOut = ref(false)
const busy = ref('')

function profileSaved(profile: UserPublicProfile) {
  const snapshot = data.value?.data
  if (snapshot?.user) data.value = { data: { ...snapshot, user: { ...snapshot.user, ...profile } } }
  void refreshNuxtData('site-account')
}

async function execute(action: string, work: () => Promise<unknown>, fallback: string) {
  if (busy.value) return
  busy.value = action
  try {
    await work()
  } catch (cause) {
    toast.add({ title: getApiErrorMessage(cause, { fallback }), color: 'error' })
  } finally {
    busy.value = ''
  }
}

function sendEmail(change: boolean) {
  return execute('email', async () => {
    await $fetch('/api/auth/email', { method: 'POST', body: change ? { email: email.value, password: emailPassword.value } : {} })
    editingEmail.value = false
    emailPassword.value = ''
    toast.add({ title: '已发送验证邮件', color: 'success' })
    await refresh()
  }, '发送失败，请重试')
}

function changePassword() {
  if (newPassword.value !== confirmPassword.value) {
    toast.add({ title: '两次输入的新密码不一致', color: 'error' })
    return
  }
  return execute('password', async () => {
    await $fetch('/api/auth/password', { method: 'PUT', body: { currentPassword: currentPassword.value, password: newPassword.value } })
    toast.add({ title: '密码已更新，请重新登录', color: 'success' })
    await returnToLogin()
  }, '修改密码失败')
}

function signOut(all: boolean) {
  return execute(all ? 'logout-all' : 'logout', async () => {
    await $fetch(all ? '/api/auth/logout-all' : '/api/auth/logout', { method: 'POST' })
    await returnToLogin()
  }, '退出失败，请重试')
}

async function returnToLogin() {
  clearNuxtData('account-usage')
  await refreshNuxtData('site-account')
  await navigateTo({ path: '/login', query: { redirect: '/account' } }, { replace: true })
}
</script>
