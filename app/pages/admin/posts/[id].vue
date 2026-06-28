<template>
  <AdminPostForm mode="edit" :post-id="Number(route.params.id)" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth'
})

const route = useRoute()
</script>
