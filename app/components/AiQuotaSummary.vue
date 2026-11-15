<template>
  <dl class="account-meta">
    <div>
      <dt>实验室</dt>
      <dd>{{ quotaLabel(usage.lab) }}</dd>
    </div>
    <div>
      <dt>文章问答</dt>
      <dd>{{ quotaLabel(usage.article) }}</dd>
    </div>
    <div>
      <dt>下次重置</dt>
      <dd><NuxtTime :datetime="usage.article.resetsAt" locale="zh-CN" month="numeric" day="numeric" hour="2-digit" minute="2-digit" hour-cycle="h23" /></dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { AccountUsage, AiQuota } from '~~/types/dto/user'

defineProps<{ usage: AccountUsage }>()

function quotaLabel(quota: AiQuota) {
  return quota.limit === null ? '无每日上限' : `剩余 ${quota.remaining} / ${quota.limit} 次`
}
</script>
