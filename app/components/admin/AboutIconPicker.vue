<template>
  <UPopover v-model:open="open" :content="{ align: 'start', collisionPadding: 12 }">
    <UButton
      type="button"
      size="sm"
      color="neutral"
      variant="outline"
      class="icon-trigger"
      :icon="icon || 'i-lucide-image-plus'"
      :aria-label="selected ? `更换图标，当前为 ${selected.label}` : '选择技术图标'"
      :title="selected?.label || '选择图标'"
      :disabled="disabled"
    />
    <template #content>
      <div class="icon-palette">
        <UInput
          v-model="query"
          autofocus
          class="w-full"
          icon="i-lucide-search"
          aria-label="搜索技术图标"
          placeholder="搜索 Java、Python、人工智能"
          @keydown.enter.prevent
        />
        <div class="icon-tools">
          <span aria-live="polite">{{ options.length }} 个图标</span>
          <UButton type="button" size="xs" color="neutral" variant="ghost" icon="i-lucide-ban" @click="select('')">
            无图标
          </UButton>
        </div>
        <div v-if="options.length" class="icon-grid" role="group" aria-label="可选图标">
          <button
            v-for="option in options"
            :key="option.name"
            type="button"
            :title="option.label"
            :aria-pressed="icon === option.name"
            @click="select(option.name)"
          >
            <UIcon :name="option.name" aria-hidden="true" />
            <span>{{ option.label }}</span>
          </button>
        </div>
        <p v-else class="icon-empty">未找到图标，可以使用纯文字标签。</p>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import { aboutIcons, searchAboutIcons } from '~~/shared/about-icons'

defineProps<{ disabled?: boolean }>()
const icon = defineModel<string>({ required: true })
const open = ref(false)
const query = ref('')
const options = computed(() => searchAboutIcons(query.value))
const selected = computed(() => aboutIcons.find(option => option.name === icon.value))

watch(open, value => {
  if (!value) query.value = ''
})

function select(name: string) {
  icon.value = name
  open.value = false
}
</script>

<style scoped>
.icon-trigger {
  min-width: 36px;
  min-height: 36px;
  justify-content: center;
  color: var(--admin-accent);
}

.icon-palette {
  width: min(324px, calc(100vw - 32px));
  padding: 12px;
}

.icon-tools {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: space-between;
  color: var(--admin-muted);
  font-size: 12px;
}

.icon-grid {
  display: grid;
  max-height: min(248px, 42dvh);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  overflow: auto;
  padding: 2px;
}

.icon-grid button {
  display: grid;
  min-width: 0;
  min-height: 62px;
  align-content: center;
  justify-items: center;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--admin-ink);
  cursor: pointer;
}

.icon-grid button:hover,
.icon-grid button[aria-pressed='true'] {
  border-color: var(--admin-accent-soft);
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
}

.icon-grid button > :first-child { font-size: 19px; }
.icon-grid button > span:last-child {
  width: 100%;
  overflow: hidden;
  padding-inline: 2px;
  font-size: 10px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-empty {
  padding: 16px 4px;
  color: var(--admin-muted);
  font-size: 13px;
}
</style>
