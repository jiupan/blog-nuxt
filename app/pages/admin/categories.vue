<template>
  <AdminTaxonomyManager
    title="分类"
    endpoint="/api/admin/categories"
  />
</template>
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
</script>
