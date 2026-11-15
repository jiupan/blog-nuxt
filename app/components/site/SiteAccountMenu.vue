<template>
  <div v-if="mobile" class="mobile-account">
    <template v-if="user">
      <NuxtLink to="/account" class="mobile-account-link" @click="emit('navigate')">
        <AccountAvatar :src="user.avatarUrl" :seed="user.displayName || user.username" :size="31" />
        <span>{{ user.displayName || user.username }}<small>账户设置</small></span>
      </NuxtLink>
      <UButton size="sm" color="neutral" variant="ghost" :loading="signingOut" @click="signOut">退出登录</UButton>
    </template>
    <template v-else>
      <UButton :to="loginTo" icon="i-lucide-log-in" size="sm" @click="emit('navigate')">登录</UButton>
      <UButton :to="registerTo" color="neutral" variant="ghost" size="sm" @click="emit('navigate')">注册</UButton>
    </template>
  </div>
  <UDropdownMenu v-else :items="items" :content="{ align: 'end' }">
    <button type="button" class="tool-button desktop-account-trigger" aria-label="账户" data-tooltip="账户">
      <AccountAvatar v-if="user" :src="user.avatarUrl" :seed="user.displayName || user.username" :size="25" />
      <UIcon v-else name="i-lucide-circle-user-round" aria-hidden="true" />
    </button>
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { getApiErrorMessage } from '~/utils/api-error'

defineProps<{ mobile?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { data, refresh } = useSiteAccount()
const user = computed(() => data.value?.data.user)
const toast = useToast()
const signingOut = ref(false)
const loginTo = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }))
const registerTo = computed(() => ({ path: '/register', query: { redirect: route.fullPath } }))
const items = computed<DropdownMenuItem[][]>(() => user.value ? [
  [{ label: user.value.displayName || user.value.username, type: 'label' }],
  [{ label: '账户设置', to: '/account', icon: 'i-lucide-settings' }],
  [{ label: '退出登录', icon: 'i-lucide-log-out', disabled: signingOut.value, onSelect: signOut }]
] : [[
  { label: '登录', to: loginTo.value, icon: 'i-lucide-log-in' },
  { label: '创建账号', to: registerTo.value, icon: 'i-lucide-user-plus' }
]])

async function signOut() {
  signingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    emit('navigate')
    await refresh()
    await navigateTo('/', { replace: true })
  } catch (error) {
    toast.add({ title: getApiErrorMessage(error, { fallback: '退出失败，请重试' }), color: 'error' })
  } finally {
    signingOut.value = false
  }
}
</script>

<style scoped>
.mobile-account {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  background: var(--theme-surface);
}
.mobile-account-link { display: flex; min-width: 0; flex: 1; align-items: center; gap: 9px; font-weight: 700; }
.mobile-account-link > span { overflow-wrap: anywhere; }
.mobile-account-link small { display: block; color: var(--theme-text-muted); font-size: 11px; font-weight: 500; }
@media (max-width: 760px) { .desktop-account-trigger { display: none; } }
</style>
