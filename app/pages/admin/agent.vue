<template>
  <div class="workspace-page agent-page">
    <AdminPageActions>
      <UButton icon="i-lucide-key-round" size="sm" @click="openCreate">创建密钥</UButton>
    </AdminPageActions>
    <section class="workspace-panel">
      <nav class="workspace-tabs" aria-label="Agent 接入管理">
        <button
          v-for="item in tabs"
          :key="item.value"
          type="button"
          :class="{ 'is-active': tab === item.value }"
          :aria-pressed="tab === item.value"
          @click="tab = item.value"
        >
          <UIcon :name="item.icon" class="size-4" />{{ item.label }}
        </button>
      </nav>

      <template v-if="tab === 'keys'">
        <header class="workspace-panel-heading">
          <div>
            <h2>发布密钥</h2>
            <p>让本地 Agent 上传图片、读取分类标签、创建草稿或直接发布文章。</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            size="sm"
            :loading="keysPending"
            aria-label="刷新密钥"
            @click="refreshKeys()"
          />
        </header>
        <div v-if="keysError" class="workspace-empty" role="alert">
          <UIcon name="i-lucide-wifi-off" />
          <h3>密钥加载失败</h3>
          <p>请稍后重试；首次部署时请确认数据库迁移已完成。</p>
          <UButton color="neutral" variant="outline" @click="refreshKeys()">重新加载</UButton>
        </div>
        <div
          v-else-if="keysPending"
          class="workspace-loading"
          role="status"
          aria-label="正在加载密钥"
        >
          <span v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="!keys.length" class="workspace-empty">
          <UIcon name="i-lucide-plug-zap" />
          <h3>连接你的第一个 Agent</h3>
          <p>为每个 Agent 创建单独的密钥，便于查看使用情况和随时停用。</p>
          <UButton variant="soft" icon="i-lucide-plus" @click="openCreate">创建发布密钥</UButton>
        </div>
        <div v-else class="agent-keys">
          <article v-for="key in keys" :key="key.id" class="agent-key-row">
            <span class="agent-key-icon"><UIcon name="i-lucide-key-round" class="size-4" /></span>
            <div class="agent-key-copy">
              <div class="agent-key-title">
                <strong>{{ key.name }}</strong
                ><span class="agent-status" :class="key.revokedAt ? 'is-muted' : 'is-success'">{{
                  key.revokedAt ? '已停用' : '使用中'
                }}</span>
              </div>
              <code>{{ key.prefix }}••••••••</code>
              <p>
                创建于 {{ formatDate(key.createdAt)
                }}<span
                  >最近调用：{{ key.lastUsedAt ? formatDate(key.lastUsedAt) : '尚未使用' }}</span
                >
              </p>
              <p v-if="!key.revokedAt && !key.canCopy">
                旧版密钥再次通过 Agent 正常调用后可复制；若原文已丢失，请创建新密钥。
              </p>
            </div>
            <div v-if="!key.revokedAt" class="agent-key-actions">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-copy"
                size="sm"
                :disabled="!key.canCopy || copyingKeyId !== null"
                :loading="copyingKeyId === key.id"
                :aria-label="`复制${key.name}密钥`"
                @click="copyStoredKey(key)"
                >复制密钥</UButton
              >
              <UButton
                v-if="!key.revokedAt"
                color="neutral"
                variant="outline"
                size="sm"
                :aria-label="`停用${key.name}`"
                @click="revokeTarget = key"
                >停用</UButton
              >
            </div>
          </article>
        </div>
        <footer class="agent-note">
          <UIcon name="i-lucide-shield-check" class="size-4" /><span
            >允许读取分类标签、上传图片和创建文章。密钥不能访问后台、修改或删除已有文章；创建者停用或失去管理员权限后，密钥同时失效。</span
          >
        </footer>
      </template>

      <template v-else-if="tab === 'records'">
        <header class="workspace-panel-heading">
          <div>
            <h2>发布记录</h2>
            <p>查看请求结果、资料来源和创建的文章。相同编号重试不会重复发文。</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-refresh-cw"
            size="sm"
            :loading="recordsPending"
            aria-label="刷新发布记录"
            @click="refreshRecords()"
          />
        </header>
        <div v-if="recordsError" class="workspace-empty" role="alert">
          <UIcon name="i-lucide-wifi-off" />
          <h3>发布记录加载失败</h3>
          <UButton color="neutral" variant="outline" @click="refreshRecords()">重新加载</UButton>
        </div>
        <div
          v-else-if="recordsPending"
          class="workspace-loading"
          role="status"
          aria-label="正在加载发布记录"
        >
          <span v-for="i in 3" :key="i" />
        </div>
        <div v-else-if="!records.length" class="workspace-empty">
          <UIcon name="i-lucide-file-clock" />
          <h3>还没有发布记录</h3>
          <p>Agent 创建文章后，可以在这里查看执行结果。</p>
          <UButton color="neutral" variant="outline" @click="tab = 'guide'">查看接入说明</UButton>
        </div>
        <article
          v-for="record in recordsError || recordsPending ? [] : records"
          :key="record.id"
          class="agent-record"
        >
          <span
            class="agent-status"
            :class="
              record.status === 'FAILED'
                ? 'is-error'
                : record.status === 'SUCCESS'
                  ? 'is-success'
                  : 'is-muted'
            "
            >{{ recordLabel(record) }}</span
          >
          <div class="agent-record-copy">
            <strong>{{ record.title }}</strong>
            <p>{{ record.key.name }} · {{ formatDate(record.updatedAt) }}</p>
            <code>{{ record.requestId }}</code>
            <p v-if="record.error" class="workspace-inline-error">{{ record.error }}</p>
            <small v-if="record.status === 'SUCCESS' && !record.post"
              >文章已删除，发布记录仍保留。</small
            >
            <details v-if="record.sources.length" class="agent-sources">
              <summary>资料来源（{{ record.sources.length }}）</summary>
              <a
                v-for="source in record.sources"
                :key="source.url + source.title"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ source.title }}<UIcon name="i-lucide-arrow-up-right" class="size-3"
              /></a>
            </details>
          </div>
          <div v-if="record.post" class="agent-record-actions">
            <UButton
              v-if="record.post.status === 'PUBLISHED'"
              :to="postPath(record.post.slug)"
              target="_blank"
              color="neutral"
              variant="ghost"
              size="sm"
              >查看文章</UButton
            ><UButton
              :to="`/admin/posts/${record.post.id}`"
              color="neutral"
              variant="outline"
              size="sm"
              >编辑</UButton
            >
          </div>
        </article>
        <footer v-if="!recordsError && total > 0" class="workspace-pagination">
          <span>共 {{ total }} 条记录</span>
          <div>
            <UButton
              icon="i-lucide-chevron-left"
              aria-label="上一页"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="page <= 1 || recordsPending"
              @click="page--"
            /><span>{{ page }} / {{ totalPages }}</span
            ><UButton
              icon="i-lucide-chevron-right"
              aria-label="下一页"
              color="neutral"
              variant="ghost"
              size="xs"
              :disabled="page >= totalPages || recordsPending"
              @click="page++"
            />
          </div>
        </footer>
      </template>

      <div v-else class="agent-guide">
        <div>
          <h2>把文章交给博客发布</h2>
          <p>
            本地 Agent
            负责选题、阅读和写作，完成后通过以下接口提交。服务器不会主动搜索、采编或定时发文。
          </p>
        </div>
        <div class="agent-endpoint">
          <span>接口地址</span><code>{{ apiBase }}</code
          ><UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="复制接口地址"
            @click="copyText(apiBase)"
          />
        </div>
        <ol>
          <li>创建密钥，保存到本地 Agent 的环境变量 <code>BLOG_AGENT_TOKEN</code>。</li>
          <li>使用 <code>Authorization: Bearer &lt;密钥&gt;</code> 请求以下接口。</li>
          <li>
            先获取分类标签，再提交 Markdown 文章；使用 <code>DRAFT</code> 存草稿，或
            <code>PUBLISHED</code> 直接发布。
          </li>
        </ol>
        <div class="agent-api-description">
          <code>GET /api/agent/taxonomies</code>
          <p>返回已有分类和标签的 ID、名称、访问路径，顺序与后台一致。</p>
        </div>
        <div class="agent-api-description">
          <code>POST /api/agent/posts</code>
          <p>提交标题、正文和唯一请求编号。成功返回文章 ID、状态、访问地址和后台编辑地址。</p>
        </div>
        <div class="agent-example-heading">
          <h3>发布示例</h3>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-copy"
            size="sm"
            @click="copyText(example)"
            >复制示例</UButton
          >
        </div>
        <pre class="agent-example"><code>{{ example }}</code></pre>
        <div class="agent-guide-notes">
          <p>
            <strong>配图：</strong>使用
            <code>POST /api/agent/images?purpose=image</code> 上传正文配图，或用
            <code>purpose=cover</code> 上传封面。以 multipart/form-data 的
            <code>file</code> 字段提交一张 JPG、PNG 或 WebP，最大 50MB。返回站内地址可用于正文
            <code>![图片说明](图片地址)</code> 或
            <code>cover</code>；图片会出现在图库，保留可搜索的原文件名，并自动压缩为 WebP。
          </p>
          <p>
            <strong>重试：</strong>相同
            <code>requestId</code> 和内容可安全重试；内容改变时需使用新编号。同一密钥每分钟最多 60
            次请求。
          </p>
          <p>
            <strong>来源：</strong><code>sources</code>
            保存到发布记录；想让读者看到的参考链接，请同时写入正文。没有指定封面时沿用图库随机封面。
          </p>
          <p>
            <strong>响应：</strong>新建成功为 HTTP 201；重复请求返回 HTTP 200，且
            <code>replayed: true</code>。草稿的公开地址为
            <code>null</code>，可用编辑地址进入后台查看。
          </p>
        </div>
      </div>
    </section>

    <UModal
      v-model:open="createOpen"
      :title="issuedToken ? '保存你的发布密钥' : '创建发布密钥'"
      :description="
        issuedToken
          ? '已加密保存，关闭后仍可在密钥列表再次复制。'
          : '为每个本地 Agent 使用不同的名称，便于管理。'
      "
      :dismissible="!creating"
      :close="!creating"
    >
      <template #body>
        <div v-if="issuedToken" class="workspace-form">
          <UTextarea
            :model-value="issuedToken"
            readonly
            :rows="3"
            class="w-full agent-token"
            aria-label="新建的发布密钥"
          />
          <p class="workspace-field-hint">请保存到本地环境变量，不要写入文章或提交到 Git。</p>
          <div class="workspace-form-actions">
            <UButton color="neutral" variant="outline" @click="createOpen = false">关闭</UButton
            ><UButton icon="i-lucide-copy" @click="copyText(issuedToken)">复制密钥</UButton>
          </div>
        </div>
        <form v-else class="workspace-form" @submit.prevent="createKey">
          <UFormField label="密钥名称" required
            ><UInput
              v-model="keyName"
              class="w-full"
              placeholder="例如：笔记本上的写作 Agent"
              :maxlength="80"
              autofocus
              required
          /></UFormField>
          <p v-if="createError" class="workspace-inline-error" role="alert">{{ createError }}</p>
          <div class="workspace-form-actions">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="creating"
              @click="createOpen = false"
              >取消</UButton
            ><UButton
              type="submit"
              icon="i-lucide-plus"
              :loading="creating"
              :disabled="!keyName.trim()"
              >创建密钥</UButton
            >
          </div>
        </form>
      </template>
    </UModal>
    <UModal
      :open="Boolean(revokeTarget)"
      title="停用发布密钥"
      :description="`停用“${revokeTarget?.name || ''}”后，使用它的 Agent 将无法继续调用接口。已有文章不受影响。`"
      :dismissible="!revoking"
      @update:open="handleRevokeOpen"
    >
      <template #body
        ><div class="workspace-form">
          <p v-if="revokeError" class="workspace-inline-error" role="alert">{{ revokeError }}</p>
          <div class="workspace-form-actions">
            <UButton
              color="neutral"
              variant="outline"
              :disabled="revoking"
              @click="revokeTarget = null"
              >取消</UButton
            ><UButton color="error" :loading="revoking" @click="revokeKey">停用密钥</UButton>
          </div>
        </div></template
      >
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { ApiResult, PaginationPayload } from '~~/types/api'
import type { AgentKeySummary, AgentPublicationItem } from '~~/types/dto/agent'
import { getApiErrorMessage } from '~/utils/api-error'
import { postPath } from '~/utils/post-path'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const toast = useToast()
const tab = ref<'keys' | 'records' | 'guide'>('keys')
const tabs = [
  { value: 'keys' as const, label: '发布密钥', icon: 'i-lucide-key-round' },
  { value: 'records' as const, label: '发布记录', icon: 'i-lucide-history' },
  { value: 'guide' as const, label: '接入说明', icon: 'i-lucide-terminal' }
]
const {
  data: keysData,
  pending: keysPending,
  error: keysError,
  refresh: refreshKeys
} = await useFetch<ApiResult<AgentKeySummary[]>>('/api/admin/agent/keys')
const keys = computed(() => keysData.value?.data || [])
const page = ref(1)
const query = computed(() => ({ page: page.value, pageSize: 20 }))
const {
  data: recordsData,
  pending: recordsPending,
  error: recordsError,
  refresh: refreshRecords
} = await useFetch<ApiResult<PaginationPayload<AgentPublicationItem>>>(
  '/api/admin/agent/publications',
  { query }
)
const records = computed(() => recordsData.value?.data.items || [])
const total = computed(() => recordsData.value?.data.total || 0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 20)))
const apiBase = `${useRequestURL().origin}/api/agent`
const example = `curl "${apiBase}/posts" \\
  -H "Authorization: Bearer $BLOG_AGENT_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data-binary @article.json

# article.json
${JSON.stringify({ requestId: 'ai-article-001', title: '一篇 AI 技术解读', content: '## 发生了什么\n\n文章正文。\n\n## 参考资料\n\n[原始资料](https://example.com/article)', status: 'DRAFT', sources: [{ title: '原始资料', url: 'https://example.com/article' }] }, null, 2)}`
const createOpen = ref(false)
const creating = ref(false)
const keyName = ref('')
const issuedToken = ref('')
const copyingKeyId = ref<number | null>(null)
const createError = ref('')
watch(createOpen, (open) => {
  if (!open) issuedToken.value = ''
})
function openCreate() {
  keyName.value = ''
  createError.value = ''
  issuedToken.value = ''
  createOpen.value = true
}
async function createKey() {
  if (creating.value || !keyName.value.trim()) return
  creating.value = true
  createError.value = ''
  try {
    const result = await $fetch<ApiResult<{ key: AgentKeySummary; token: string }>>(
      '/api/admin/agent/keys',
      { method: 'POST', body: { name: keyName.value.trim() } }
    )
    issuedToken.value = result.data.token
    await refreshKeys()
  } catch (error) {
    createError.value = getApiErrorMessage(error)
  } finally {
    creating.value = false
  }
}
const revokeTarget = ref<AgentKeySummary | null>(null)
const revoking = ref(false)
const revokeError = ref('')
watch(revokeTarget, () => {
  revokeError.value = ''
})
function handleRevokeOpen(open: boolean) {
  if (!open && !revoking.value) revokeTarget.value = null
}
async function revokeKey() {
  if (!revokeTarget.value || revoking.value) return
  revoking.value = true
  revokeError.value = ''
  try {
    await $fetch(`/api/admin/agent/keys/${revokeTarget.value.id}/revoke`, { method: 'POST' })
    revokeTarget.value = null
    await refreshKeys()
    toast.add({ title: '密钥已停用', color: 'success' })
  } catch (error) {
    revokeError.value = getApiErrorMessage(error)
  } finally {
    revoking.value = false
  }
}
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: '已复制', color: 'success' })
  } catch {
    toast.add({ title: '复制失败，请手动选择文本复制', color: 'error' })
  }
}
async function copyStoredKey(key: AgentKeySummary) {
  if (!key.canCopy || copyingKeyId.value !== null) return
  copyingKeyId.value = key.id
  try {
    const result = await $fetch<ApiResult<{ token: string }>>(
      `/api/admin/agent/keys/${key.id}/copy`,
      { method: 'POST' }
    )
    try {
      await navigator.clipboard.writeText(result.data.token)
      toast.add({ title: '密钥已复制', color: 'success' })
    } catch {
      issuedToken.value = result.data.token
      createOpen.value = true
      toast.add({ title: '自动复制失败，请在弹窗中手动复制', color: 'error' })
    }
  } catch (error) {
    toast.add({ title: '复制密钥失败', description: getApiErrorMessage(error), color: 'error' })
  } finally {
    copyingKeyId.value = null
  }
}
function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
function recordLabel(record: AgentPublicationItem) {
  if (record.status === 'FAILED') return '失败'
  if (record.status === 'PENDING') return '处理中'
  if (!record.post) return '已创建'
  return record.post.status === 'PUBLISHED'
    ? '已发布'
    : record.post.status === 'DRAFT'
      ? '草稿'
      : '已归档'
}
</script>

<style scoped>
.agent-key-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid #eef0f3;
}
.agent-key-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  place-items: center;
  background: #f3f1f8;
  color: var(--admin-accent);
  border-radius: 8px;
}
.agent-key-copy {
  min-width: 0;
  flex: 1;
}
.agent-key-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.agent-key-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 7px;
}
.agent-key-title strong,
.agent-record-copy > strong {
  font-size: 13px;
  font-weight: 500;
  overflow-wrap: anywhere;
}
.agent-key-copy code,
.agent-record-copy > code {
  color: #697386;
  font-size: 11px;
  overflow-wrap: anywhere;
}
.agent-key-copy p,
.agent-record-copy > p {
  color: #697386;
  font-size: 11px;
  margin: 8px 0 0;
  line-height: 1.8;
}
.agent-key-copy p span {
  display: inline-block;
  margin-left: 18px;
}
.agent-status {
  display: inline-flex;
  width: max-content;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 11px;
  line-height: 1.6;
  white-space: nowrap;
}
.is-success {
  color: #327750;
  background: #edf6f0;
}
.is-muted {
  color: #697386;
  background: #f3f4f6;
}
.is-error {
  color: #a14545;
  background: #fbefef;
}
.agent-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 18px 24px;
  font-size: 11px;
  color: #697386;
  line-height: 1.9;
}
.agent-note > .iconify {
  flex-shrink: 0;
  margin-top: 3px;
}
.agent-record {
  display: grid;
  grid-template-columns: 65px minmax(0, 1fr) auto;
  align-items: baseline;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid #eef0f3;
}
.agent-record-copy {
  min-width: 0;
}
.agent-record-copy > code {
  display: block;
  margin-top: 4px;
}
.agent-record-copy small {
  display: block;
  margin-top: 8px;
  color: #697386;
  font-size: 11px;
}
.agent-record-copy > .workspace-inline-error {
  color: #a14545;
}
.agent-record-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.agent-sources {
  margin-top: 10px;
  font-size: 11px;
  color: #697386;
}
.agent-sources summary {
  cursor: pointer;
}
.agent-sources a {
  display: flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  margin-top: 8px;
  color: var(--admin-accent);
  overflow-wrap: anywhere;
}
.agent-guide {
  display: grid;
  gap: 24px;
  max-width: 900px;
  padding: 28px 24px;
}
.agent-guide h2 {
  font-size: 16px;
  font-weight: 600;
}
.agent-guide h3 {
  font-size: 13px;
  font-weight: 550;
}
.agent-guide p,
.agent-guide li {
  color: #697386;
  font-size: 12px;
  line-height: 1.9;
}
.agent-guide p {
  margin-top: 8px;
}
.agent-guide ol {
  display: grid;
  gap: 9px;
  padding-left: 20px;
  list-style: decimal;
}
.agent-guide code {
  font-size: 11px;
  overflow-wrap: anywhere;
}
.agent-endpoint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #fafbfc;
}
.agent-endpoint > span {
  color: #697386;
  font-size: 11px;
}
.agent-endpoint > code {
  flex: 1;
}
.agent-endpoint > button {
  margin-left: auto;
}
.agent-api-description > code {
  color: var(--admin-accent);
}
.agent-example-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: -12px;
}
.agent-example {
  max-width: 100%;
  min-width: 0;
  padding: 18px;
  background: #f5f6f8;
  border: 1px solid #e4e7ec;
  border-radius: 7px;
  overflow-x: auto;
  line-height: 1.8;
  color: #344054;
}
.agent-guide-notes {
  padding-top: 12px;
  border-top: 1px solid #e4e7ec;
}
.agent-guide-notes strong {
  font-weight: 550;
  color: #344054;
}
.agent-token {
  font-family: monospace;
}
@media (max-width: 700px) {
  .agent-key-actions {
    flex-direction: column;
    align-items: stretch;
    flex-shrink: 0;
  }
  .agent-key-row {
    padding: 18px 16px;
    gap: 10px;
  }
  .agent-key-icon {
    display: none;
  }
  .agent-key-copy p span {
    display: block;
    margin-left: 0;
  }
  .agent-record {
    grid-template-columns: 58px minmax(0, 1fr);
    padding: 18px 16px;
    gap: 12px;
  }
  .agent-record-actions {
    grid-column: 2;
  }
  .agent-note {
    padding: 16px;
  }
  .agent-guide {
    padding: 22px 16px;
  }
}
</style>
