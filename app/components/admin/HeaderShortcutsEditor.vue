<template>
  <div class="shortcut-editor">
    <section class="shortcut-preview" aria-label="顶部快捷入口预览">
      <div class="shortcut-toolbar">
        <h3>前台预览</h3>
        <div class="shortcut-preview-controls">
          <div class="shortcut-segments" role="group" aria-label="预览设备">
            <button type="button" :aria-pressed="!mobile" @click="mobile = false">桌面</button>
            <button type="button" :aria-pressed="mobile" @click="mobile = true">手机</button>
          </div>
          <div class="shortcut-segments" role="group" aria-label="预览主题">
            <button type="button" :aria-pressed="!dark" @click="dark = false">日间</button>
            <button type="button" :aria-pressed="dark" @click="dark = true">夜间</button>
          </div>
        </div>
      </div>
      <div class="shortcut-mock-header" :class="{ 'is-mobile': mobile, 'is-night': dark }">
        <strong>{{ brand || '博客' }}</strong>
        <div class="shortcut-mock-tools">
          <span
            v-for="item in visibleItems"
            :key="item.id"
            class="shortcut-mock-icon"
            role="img"
            :aria-label="previewLabel(item)"
            :title="previewLabel(item)"
          >
            <AccountAvatar
              v-if="item.id === 'account' && item.followAvatar && account"
              :src="account.avatarUrl"
              :seed="account.displayName || account.username"
              :size="25"
              :fallback-icon="item.icon"
            />
            <UIcon v-else :name="item.id === 'theme' && dark ? item.darkIcon : item.icon" />
          </span>
          <span v-if="mobile" class="shortcut-mock-icon" role="img" aria-label="侧栏菜单" title="侧栏菜单">
            <UIcon name="i-lucide-menu" />
          </span>
          <span v-else-if="!visibleItems.length" class="shortcut-mock-empty">快捷入口已全部隐藏</span>
        </div>
      </div>
      <p v-if="mobile" class="shortcut-device-note">工具仅在桌面顶栏显示。手机侧栏提供账户入口。</p>
    </section>

    <section aria-label="快捷入口编辑">
      <div class="shortcut-toolbar shortcut-list-heading">
        <h3>显示与顺序</h3>
        <UButton
          type="button"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-rotate-ccw"
          :disabled="disabled || isDefault"
          @click="restoreDefaults"
        >
          恢复默认
        </UButton>
      </div>
      <AdminSortableList :items="items" :disabled="disabled" class="shortcut-list" @reorder="items = $event">
        <article v-for="(item, index) in items" :key="item.id" class="shortcut-row admin-sortable-item">
          <div class="shortcut-row-bar">
            <AdminDragHandle :label="headerShortcutNames[item.id]" :disabled="disabled" />
            <button
              type="button"
              class="shortcut-row-trigger"
              :aria-expanded="expanded === item.id"
              :aria-controls="`shortcut-fields-${item.id}`"
              @click="expanded = expanded === item.id ? null : item.id"
            >
              <span class="shortcut-row-icon"><UIcon :name="item.icon" class="size-4" /></span>
              <strong>{{ headerShortcutNames[item.id] }}</strong>
              <UIcon name="i-lucide-chevron-down" class="shortcut-row-chevron size-4" />
            </button>
            <USwitch
              v-model="item.enabled"
              size="sm"
              :disabled="disabled"
              :aria-label="`在顶栏显示${headerShortcutNames[item.id]}`"
            />
            <div class="admin-order-buttons">
              <button type="button" :disabled="disabled || index === 0" :aria-label="`上移${headerShortcutNames[item.id]}`" @click="items = moveArrayItem(items, index, index - 1)">
                <UIcon name="i-lucide-chevron-up" />
              </button>
              <button type="button" :disabled="disabled || index === items.length - 1" :aria-label="`下移${headerShortcutNames[item.id]}`" @click="items = moveArrayItem(items, index, index + 1)">
                <UIcon name="i-lucide-chevron-down" />
              </button>
            </div>
          </div>
          <div v-show="expanded === item.id" :id="`shortcut-fields-${item.id}`" class="shortcut-fields">
            <div class="shortcut-field-pair">
              <label class="shortcut-field">
                <span>{{ item.id === 'theme' ? '日间模式提示' : '提示文字' }}</span>
                <UInput v-model="item.label" maxlength="32" :disabled="disabled" class="w-full" />
              </label>
              <div class="shortcut-field">
                <span>{{ item.id === 'theme' ? '日间模式图标' : item.id === 'account' && item.followAvatar ? '默认账户图标' : '图标' }}</span>
                <AdminHeaderShortcutIconPicker v-model="item.icon" :label="`选择${headerShortcutNames[item.id]}${item.id === 'theme' ? '日间模式' : ''}图标`" :disabled="disabled" />
              </div>
            </div>
            <div v-if="item.id === 'theme'" class="shortcut-field-pair">
              <label class="shortcut-field">
                <span>夜间模式提示</span>
                <UInput v-model="item.darkLabel" maxlength="32" :disabled="disabled" class="w-full" />
              </label>
              <div class="shortcut-field">
                <span>夜间模式图标</span>
                <AdminHeaderShortcutIconPicker v-model="item.darkIcon" label="选择夜间模式图标" :disabled="disabled" />
              </div>
            </div>
            <div v-if="item.id === 'account'" class="shortcut-account-mode">
              <USwitch v-model="item.followAvatar" label="跟随用户头像" size="sm" :disabled="disabled" />
              <small>启用后，访客和未上传头像的用户使用默认账户图标。</small>
            </div>
          </div>
        </article>
      </AdminSortableList>
    </section>
  </div>
</template>

<script setup lang="ts">
import { defaultHeaderShortcuts, headerShortcutNames, isMobileHeaderShortcut, readHeaderShortcuts, type HeaderShortcut } from '~~/shared/header-shortcuts'
import { moveArrayItem } from '~/utils/reorder'

defineProps<{ brand?: string; disabled?: boolean }>()
const items = defineModel<HeaderShortcut[]>({ required: true })
const expanded = ref<HeaderShortcut['id'] | null>(null)
const mobile = ref(false)
const dark = ref(false)
const { data } = useSiteAccount()
const account = computed(() => data.value?.data.user)
const visibleItems = computed(() => items.value.filter(item => item.enabled && (!mobile.value || isMobileHeaderShortcut(item.id))))
const isDefault = computed(() => JSON.stringify(items.value) === defaultHeaderShortcuts)

function previewLabel(item: HeaderShortcut) {
  const label = item.id === 'theme' && dark.value ? item.darkLabel : item.label
  return label.trim() || headerShortcutNames[item.id]
}

function restoreDefaults() {
  items.value = readHeaderShortcuts()
}
</script>

<style scoped>
.shortcut-editor { display: grid; gap: 24px; }
.shortcut-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.shortcut-toolbar h3 { color: var(--admin-ink); font-size: 14px; font-weight: 650; }
.shortcut-preview {
  display: grid;
  gap: 14px;
  padding: clamp(12px, 3vw, 20px);
  border: 1px solid var(--admin-line);
  border-radius: 12px;
  background: #f7f8fb;
}
.shortcut-preview-controls { display: flex; flex-wrap: wrap; gap: 6px; }
.shortcut-segments { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--admin-line); border-radius: 8px; background: #eef0f5; }
.shortcut-segments button { min-height: 26px; padding: 2px 9px; border-radius: 6px; color: var(--admin-muted); font-size: 12px; }
.shortcut-segments button[aria-pressed='true'] { background: #fff; color: var(--admin-ink); box-shadow: 0 1px 3px #171b2920; }
.shortcut-mock-header {
  display: flex;
  width: 100%;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 13px;
  border: 1px solid #e0e5ed;
  border-radius: 10px;
  color: #222935;
  background: #fff;
}
.shortcut-mock-header.is-mobile { max-width: 380px; margin-inline: auto; }
.shortcut-mock-header.is-night { border-color: #303848; background: #191f2b; color: #e8ecf4; }
.shortcut-mock-header strong {
  min-width: 0;
  overflow: hidden;
  font-size: clamp(14px, 2.5vw, 20px);
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shortcut-mock-tools { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.shortcut-mock-icon {
  --avatar-icon-size: 20px;
  display: grid;
  width: clamp(24px, 5.5vw, 33px);
  height: 32px;
  place-items: center;
  border-radius: 50%;
}
.shortcut-mock-icon > .iconify { width: var(--avatar-icon-size); height: var(--avatar-icon-size); }
.shortcut-mock-empty, .shortcut-device-note { font-size: 12px; color: var(--admin-muted); }
.is-night .shortcut-mock-empty { color: #aeb8c9; }
.shortcut-list-heading { margin-bottom: 8px; }
.shortcut-list { display: grid; gap: 7px; }
.shortcut-row { border: 1px solid var(--admin-line); border-radius: 10px; background: #fff; }
.shortcut-row-bar { display: flex; align-items: center; gap: 8px; padding: 8px 11px; }
.shortcut-row-trigger { display: flex; flex: 1 1 auto; align-items: center; gap: 8px; min-width: 0; color: var(--admin-ink); text-align: left; }
.shortcut-row-trigger strong { font-size: 13px; font-weight: 650; }
.shortcut-row-icon { display: grid; width: 30px; height: 30px; flex: 0 0 auto; place-items: center; border-radius: 7px; background: var(--admin-accent-soft); color: var(--admin-accent); }
.shortcut-row-chevron { flex: 0 0 auto; color: var(--admin-muted); }
.shortcut-row-trigger[aria-expanded='true'] .shortcut-row-chevron { transform: rotate(180deg); }
.shortcut-fields {
  display: grid;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid var(--admin-line);
  border-radius: 0 0 10px 10px;
  background: #fafbfc;
}
.shortcut-field-pair { display: grid; grid-template-columns: minmax(0, 1fr) minmax(112px, 0.48fr); align-items: start; column-gap: 12px; row-gap: 8px; }
.shortcut-field { display: grid; justify-items: start; gap: 5px; min-width: 0; color: var(--admin-ink); font-size: 12px; font-weight: 600; }
.shortcut-account-mode { display: grid; gap: 6px; }
.shortcut-account-mode small { color: var(--admin-muted); font-size: 12px; }
</style>
