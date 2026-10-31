<template>
  <div class="workspace-page">
    <div class="workspace-notice">
      <UIcon name="i-lucide-message-circle" />
      <span>集中查看、审核和回复读者留言。进入管理面板后，使用评论服务的管理员密码登录。</span>
    </div>
    <AdminTwikooManager />
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
</script>
