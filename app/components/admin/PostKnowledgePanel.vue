<template>
  <details class="post-setting-tool">
    <summary class="post-setting-tool-summary">
      <span class="post-setting-tool-icon is-sky"><UIcon name="i-lucide-brain-circuit" class="size-4" /></span>
      <span class="post-setting-tool-copy"><strong>AI 知识库</strong><small>{{ statusText }}</small></span>
      <span v-if="document?.chunkCount" class="post-setting-tool-count">{{ document.chunkCount }}</span>
      <UIcon name="i-lucide-chevron-down" class="post-setting-tool-chevron size-4" />
    </summary>
    <div class="post-setting-tool-body post-knowledge-field">
      <label class="knowledge-toggle" :class="{ 'is-active': document?.enabled }">
        <span><strong>加入 AI 知识库</strong><small>文章内容变化后会自动标记为需要更新。</small></span>
        <input type="checkbox" :checked="Boolean(document?.enabled)" :disabled="pending" @change="$emit('setEnabled', ($event.target as HTMLInputElement).checked)">
      </label>
      <dl v-if="document?.enabled">
        <div><dt>同步状态</dt><dd>{{ statusLabel(document.status) }}</dd></div>
        <div><dt>知识分块</dt><dd>{{ document.chunkCount || 0 }}</dd></div>
        <div><dt>最后同步</dt><dd>{{ document.lastIndexedAt ? new Date(document.lastIndexedAt).toLocaleString('zh-CN') : '-' }}</dd></div>
      </dl>
      <p v-if="document?.lastError" class="knowledge-error">{{ document.lastError }}</p>
      <div v-if="document?.enabled" class="knowledge-panel-actions">
        <UButton size="sm" icon="i-lucide-refresh-cw" :loading="pending" @click="$emit('sync')">{{ document.status === 'SYNCED' ? '重新同步' : '开始同步' }}</UButton>
        <UButton size="sm" color="neutral" variant="outline" icon="i-lucide-list-tree" :to="`/admin/knowledge?tab=content`">查看分块</UButton>
        <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-search" :to="`/admin/knowledge?tab=retrieval`">检索测试</UButton>
      </div>
    </div>
  </details>
</template>
<script setup lang="ts">
import type { KnowledgeDocumentState } from '~~/types/dto/knowledge'
const props = defineProps<{ document?: KnowledgeDocumentState | null, pending: boolean }>()
defineEmits<{ setEnabled: [enabled: boolean], sync: [] }>()
const statusText = computed(() => props.document?.enabled ? statusLabel(props.document.status) : '尚未加入知识库')
function statusLabel(status?: string) { return ({ PENDING:'待同步',SYNCING:'同步中',SYNCED:'已同步',STALE:'需要更新',FAILED:'同步失败',DISABLED:'未启用' } as Record<string,string>)[status || ''] || '未启用' }
</script>
<style scoped>
.post-knowledge-field{display:grid;gap:.75rem}.knowledge-toggle{display:flex;align-items:center;justify-content:space-between;gap:.75rem;border:1px solid #e2e8f0;border-radius:.7rem;background:#f8fafc;padding:.7rem;cursor:pointer}.knowledge-toggle.is-active{border-color:#a5b4fc;background:#eef2ff}.knowledge-toggle strong,.knowledge-toggle small{display:block}.knowledge-toggle strong{font-size:.78rem}.knowledge-toggle small{margin-top:.18rem;color:#64748b;font-size:.68rem;line-height:1.4}.knowledge-toggle input{width:2.2rem;height:1.15rem;accent-color:#4f46e5}.post-knowledge-field dl{display:grid;gap:.4rem;margin:0}.post-knowledge-field dl div{display:flex;justify-content:space-between;font-size:.72rem}.post-knowledge-field dt{color:#64748b}.post-knowledge-field dd{margin:0;color:#172033;font-weight:800}.knowledge-error{margin:0;border-radius:.55rem;background:#fef2f2;color:#dc2626;padding:.55rem;font-size:.68rem;line-height:1.45}.knowledge-panel-actions{display:flex;flex-wrap:wrap;gap:.4rem}
</style>
