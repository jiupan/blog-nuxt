<template>
  <AdminTaxonomyManager title="分类管理" endpoint="/api/admin/categories" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})
</script>
