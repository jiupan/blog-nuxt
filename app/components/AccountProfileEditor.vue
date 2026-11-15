<template>
  <section id="profile" class="account-card profile-card" aria-labelledby="profile-heading">
    <h2 id="profile-heading">个人资料</h2>
    <p class="account-description">头像和昵称将在评论区公开显示。</p>

    <form class="account-form profile-form" @submit.prevent="save">
      <div class="profile-avatar-row">
        <AccountAvatar :src="avatarPreview" :seed="name.trim() || account.username" :size="72" />
        <div>
          <div class="account-actions profile-avatar-actions">
            <input ref="avatarInput" type="file" :accept="accountAvatarMimeTypes.join(',')" hidden @change="chooseImage">
            <UButton type="button" color="neutral" variant="outline" size="sm" icon="i-lucide-image-plus" :disabled="saving" @click="avatarInput?.click()">
              {{ avatarPreview ? '更换头像' : '上传头像' }}
            </UButton>
            <UButton v-if="avatarPreview" type="button" color="neutral" variant="ghost" size="sm" :disabled="saving" @click="clearAvatar">
              移除
            </UButton>
          </div>
          <p class="account-description profile-image-help">JPG、PNG 或 WebP，最多 3 MB，居中裁成圆形。</p>
        </div>
      </div>

      <label class="account-field">
        公开昵称
        <UInput v-model="name" autocomplete="nickname" :placeholder="account.username" aria-describedby="profile-name-help" :disabled="saving" />
      </label>
      <p id="profile-name-help" class="account-description profile-name-help">最多 {{ accountNameLimit }} 个字符。留空时显示用户名 {{ account.username }}。</p>
      <div class="account-actions">
        <UButton type="submit" :disabled="!dirty || previewLoading" :loading="saving">保存资料</UButton>
        <UButton v-if="dirty" type="button" color="neutral" variant="ghost" :disabled="saving" @click="reset">取消更改</UButton>
      </div>
      <p v-if="error" class="profile-error" role="alert">{{ error }}</p>
      <p v-if="saved" class="account-description profile-saved" role="status">
        <UIcon name="i-lucide-check" aria-hidden="true" /> 个人资料已保存。
      </p>
    </form>
  </section>
</template>

<script setup lang="ts">
import { accountAvatarMaxBytes, accountAvatarMimeTypes, accountNameLimit } from '~~/shared/account-profile'
import type { SiteAccount, UserPublicProfile } from '~~/types/dto/user'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{ account: SiteAccount }>()
const emit = defineEmits<{ saved: [profile: UserPublicProfile] }>()
const avatarInput = ref<HTMLInputElement>()
const file = shallowRef<File>()
const preview = ref<string>()
const previewLoading = ref(false)
const removeAvatar = ref(false)
const name = ref(props.account.displayName ?? '')
const saving = ref(false)
const saved = ref(false)
const error = ref('')
const avatarPreview = computed(() => preview.value || (!removeAvatar.value ? props.account.avatarUrl : null))
const dirty = computed(() => name.value !== (props.account.displayName ?? '') || Boolean(file.value) || removeAvatar.value)

watch(() => props.account.id, reset)
watch(name, () => { saved.value = false }, { flush: 'sync' })

function chooseImage(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files?.[0]
  input.value = ''
  if (!selected) return

  error.value = ''
  saved.value = false
  if (!accountAvatarMimeTypes.includes(selected.type) || selected.size > accountAvatarMaxBytes) {
    error.value = '请选择 3 MB 以内的 JPG、PNG 或 WebP 图片。'
    return
  }

  file.value = selected
  preview.value = undefined
  previewLoading.value = true
  const reader = new FileReader()
  reader.onload = () => {
    if (file.value !== selected) return
    preview.value = String(reader.result)
    previewLoading.value = false
  }
  reader.onerror = () => {
    if (file.value !== selected) return
    file.value = undefined
    previewLoading.value = false
    error.value = '无法预览此图片，请重新选择。'
  }
  reader.readAsDataURL(selected)
}

function clearAvatar() {
  file.value = undefined
  preview.value = undefined
  previewLoading.value = false
  removeAvatar.value = Boolean(props.account.avatarUrl)
  saved.value = false
  error.value = ''
}

function reset() {
  clearAvatar()
  removeAvatar.value = false
  name.value = props.account.displayName ?? ''
}

async function save() {
  saved.value = false
  error.value = ''
  if (Array.from(name.value.trim()).length > accountNameLimit) {
    error.value = `昵称最多 ${accountNameLimit} 个字符。`
    return
  }

  const body = new FormData()
  body.set('displayName', name.value)
  if (file.value) body.set('avatar', file.value)
  else if (removeAvatar.value) body.set('removeAvatar', 'true')

  saving.value = true
  try {
    const { data } = await $fetch<{ data: UserPublicProfile }>('/api/auth/profile', { method: 'PUT', body })
    emit('saved', data)
    clearAvatar()
    removeAvatar.value = false
    name.value = data.displayName ?? ''
    saved.value = true
  } catch (cause) {
    error.value = getApiErrorMessage(cause, { fallback: '资料保存失败，请重试。' })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-card { scroll-margin-top: 92px; }
.profile-form { gap: 13px; }
.profile-avatar-row { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 16px; }
.profile-avatar-actions { margin-top: 0; gap: 4px; }
.profile-image-help, .profile-error, .profile-saved { margin: 6px 0 0; font-size: 13px; }
.profile-name-help { margin-block: -8px 0; overflow-wrap: anywhere; }
.profile-error { color: color-mix(in srgb, var(--ui-error) 65%, var(--theme-text)); }
.profile-saved { display: flex; align-items: center; gap: 6px; }
.profile-saved .iconify { color: var(--ui-success); }
</style>
