<template>
  <PostCollection kind="category" :slug="String(route.params.slug)" />
</template>

<script setup lang="ts">
const route = useRoute()
</script>
