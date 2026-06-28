<template>
  <PostCollection title="标签文章" :query="{ tag: String(route.params.slug) }" />
</template>

<script setup lang="ts">
const route = useRoute()
</script>
