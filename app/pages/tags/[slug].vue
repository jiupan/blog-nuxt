<template>
  <PostCollection kind="tag" :slug="String(route.params.slug)" />
</template>

<script setup lang="ts">
const route = useRoute()
</script>
