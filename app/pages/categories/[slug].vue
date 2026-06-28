<template>
  <PostCollection title="分类文章" :query="{ category: String(route.params.slug) }" />
</template>

<script setup lang="ts">
const route = useRoute()
</script>
