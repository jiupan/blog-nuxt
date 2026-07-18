<template>
  <div class="comments-admin-page">
    <header class="comments-admin-header">
      <div class="comments-admin-title">
        <span><UIcon name="i-lucide-message-square-more" class="size-6" /></span>
        <div>
          <p>Comment Management</p>
          <h1>评论管理</h1>
        </div>
      </div>
      <div class="comments-security-note">
        <UIcon name="i-lucide-shield-check" class="size-4" />
        博客管理员认证 + Twikoo 管理密码
      </div>
    </header>

    <section class="comments-admin-intro">
      <div>
        <strong>管理操作仅在后台开放</strong>
        <p>文章页已隐藏管理入口；审核、删除、置顶和评论配置统一从这里进入。</p>
      </div>
      <UIcon name="i-lucide-lock-keyhole" class="size-5" />
    </section>

    <AdminTwikooManager />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
</script>

<style scoped>
.comments-admin-page{display:grid;gap:20px}.comments-admin-header{display:flex;align-items:center;justify-content:space-between;gap:20px}.comments-admin-title{display:flex;align-items:center;gap:14px}.comments-admin-title>span{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:#eef2ff;color:#4f46e5}.comments-admin-title p{margin:0 0 3px;color:#94a3b8;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.comments-admin-title h1{margin:0;color:#0f172a;font-size:28px;font-weight:850;letter-spacing:-.03em}.comments-security-note{display:flex;align-items:center;gap:7px;border:1px solid #bbf7d0;border-radius:999px;background:#f0fdf4;padding:8px 13px;color:#047857;font-size:12px;font-weight:750}.comments-admin-intro{display:flex;align-items:center;justify-content:space-between;gap:20px;border:1px solid #dbeafe;border-radius:16px;background:#eff6ff;padding:17px 20px;color:#1d4ed8}.comments-admin-intro strong{font-size:14px}.comments-admin-intro p{margin:4px 0 0;color:#475569;font-size:12px}.comments-admin-intro>svg{flex:none}@media(max-width:700px){.comments-admin-header{align-items:flex-start;flex-direction:column}.comments-security-note{border-radius:12px}.comments-admin-intro{align-items:flex-start}.comments-admin-title h1{font-size:24px}}
</style>
