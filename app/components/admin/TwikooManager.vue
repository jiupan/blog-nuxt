<template>
  <section class="twikoo-manager-card">
    <div v-if="!envId" class="manager-state is-error">
      <UIcon name="i-lucide-message-square-warning" class="size-6" />
      <strong>评论服务尚未配置</strong>
      <p>请设置 NUXT_PUBLIC_TWIKOO_ENV_ID 后重启应用。</p>
    </div>

    <div v-else-if="loading" class="manager-state">
      <UIcon name="i-lucide-loader-circle" class="manager-spinner size-6" />
      <strong>正在连接 Twikoo</strong>
      <p>管理面板加载完成后会自动打开。</p>
    </div>

    <div v-else-if="loadError" class="manager-state is-error">
      <UIcon name="i-lucide-circle-alert" class="size-6" />
      <strong>Twikoo 管理面板加载失败</strong>
      <p>{{ errorMessage }}</p>
      <UButton icon="i-lucide-refresh-cw" @click="initialize">重新加载</UButton>
    </div>

    <div v-else class="manager-state is-ready">
      <UIcon name="i-lucide-shield-check" class="size-6" />
      <strong>Twikoo 评论管理已就绪</strong>
      <p>管理面板关闭后，可通过下方按钮再次打开。</p>
      <UButton icon="i-lucide-panel-top-open" @click="openAdminPanel">打开评论管理面板</UButton>
    </div>

    <div id="twikoo-admin-host" ref="container" class="twikoo-admin-host" />
  </section>
</template>

<script setup lang="ts">
import 'twikoo/dist/twikoo.css'

const config = useRuntimeConfig()
const envId = computed(() => String(config.public.twikooEnvId || '').trim())
const region = computed(() => String(config.public.twikooRegion || '').trim())
const container = ref<HTMLElement | null>(null)
const loading = ref(Boolean(envId.value))
const loadError = ref(false)
const errorMessage = ref('请检查评论服务地址和网络连接。')
let generation = 0

onMounted(() => initialize())

async function initialize() {
  if (!envId.value || !container.value) return
  const currentGeneration = ++generation
  loading.value = true
  loadError.value = false
  container.value.replaceChildren()
  const mountPoint = document.createElement('div')
  mountPoint.id = 'twikoo-admin-mount'
  container.value.append(mountPoint)

  try {
    const module = await import('twikoo/dist/twikoo.min.js')
    const init = resolveTwikooInit(module)
    await init({
      envId: envId.value,
      el: '#twikoo-admin-mount',
      path: '/',
      lang: 'zh-CN',
      ...(region.value ? { region: region.value } : {})
    })
    if (currentGeneration !== generation) return
    loading.value = false
    await nextTick()
    await openAdminPanel()
  } catch (error) {
    console.error('[twikoo-admin] initialization failed', error)
    if (currentGeneration !== generation) return
    loadError.value = true
    errorMessage.value = error instanceof Error ? error.message : '请检查评论服务地址和网络连接。'
  } finally {
    if (currentGeneration === generation) loading.value = false
  }
}

async function openAdminPanel() {
  if (!container.value) return
  const controller = await waitForAdminController()
  if (controller) {
    controller.showAdmin = true
    loadError.value = false
    return
  }

  const adminEntry = await waitForAdminEntry()
  if (!adminEntry) {
    loadError.value = true
    errorMessage.value = '无法打开 Twikoo 管理面板，请重新加载评论服务。'
    return
  }
  adminEntry.click()
}

type TwikooAdminController = { showAdmin: boolean }
type TwikooRootElement = HTMLElement & { __vue__?: TwikooAdminController }

function waitForAdminController(): Promise<TwikooAdminController | null> {
  const findController = () => container.value?.querySelector<TwikooRootElement>('.twikoo')?.__vue__ || null
  const existing = findController()
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    if (!container.value) return resolve(null)
    const observer = new MutationObserver(() => {
      const controller = findController()
      if (!controller) return
      clearTimeout(timeout)
      observer.disconnect()
      resolve(controller)
    })
    const timeout = window.setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, 3_000)
    observer.observe(container.value, { childList: true, subtree: true })
  })
}

function waitForAdminEntry(): Promise<HTMLElement | null> {
  const findEntry = () => {
    if (!container.value) return null
    const toolbarIcons = container.value.querySelectorAll<HTMLElement>('.tk-icon.__comments')
    // While comments are loading, Twikoo renders the admin gear as the only
    // toolbar icon. It remains the final icon after the refresh action appears.
    return toolbarIcons.length ? toolbarIcons.item(toolbarIcons.length - 1) : null
  }
  const existing = findEntry()
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    if (!container.value) return resolve(null)
    const observer = new MutationObserver(() => {
      const entry = findEntry()
      if (!entry) return
      clearTimeout(timeout)
      observer.disconnect()
      resolve(entry)
    })
    const timeout = window.setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, 10_000)
    observer.observe(container.value, { childList: true, subtree: true })
  })
}

function resolveTwikooInit(module: unknown): (options: TwikooInitOptions) => Promise<void> {
  const imported = module as { default?: unknown }
  const candidate = imported.default as { default?: unknown, init?: unknown } | ((options: TwikooInitOptions) => Promise<void>) | undefined
  const init = typeof candidate === 'function'
    ? candidate
    : typeof candidate?.default === 'function'
      ? candidate.default
      : candidate?.init
  if (typeof init !== 'function') throw new Error('Twikoo 初始化函数不可用')
  return init as (options: TwikooInitOptions) => Promise<void>
}

type TwikooInitOptions = {
  envId: string
  el: string
  path: string
  lang: string
  region?: string
}
</script>

<style scoped>
.twikoo-manager-card{position:relative;height:max(560px,calc(100vh - 220px));overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:white;box-shadow:0 12px 32px rgb(15 23 42 / 6%)}
.manager-state{display:grid;height:100%;min-height:560px;place-items:center;align-content:center;gap:10px;padding:32px;color:#64748b;text-align:center}
.manager-state>svg{color:#4f46e5}.manager-state strong{color:#0f172a;font-size:18px}.manager-state p{max-width:480px;margin:0;font-size:13px;line-height:1.7}.manager-state.is-error>svg{color:#dc2626}.manager-state.is-ready>svg{color:#059669}.manager-spinner{animation:manager-spin 1s linear infinite}
.twikoo-admin-host{position:absolute;inset:0;z-index:5;pointer-events:none}
.twikoo-admin-host :deep(.twikoo){position:relative;width:100%;height:100%}
.twikoo-admin-host :deep(.tk-comments),.twikoo-admin-host :deep(.tk-footer){display:none}
.twikoo-admin-host :deep(.tk-admin-container){height:100%}
@keyframes manager-spin{to{transform:rotate(360deg)}}
</style>
