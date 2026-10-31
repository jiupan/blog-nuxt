<template>
  <AdminTaxonomyManager
    title="标签"
    endpoint="/api/admin/tags"
  />
</template>
<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
</script>
