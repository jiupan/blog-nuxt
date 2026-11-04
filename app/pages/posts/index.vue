<script setup lang="ts">
definePageMeta({
  middleware: (to) => {
    const { keyword, page } = to.query
    return navigateTo({ path: '/archive', query: { keyword, page }, hash: to.hash }, { redirectCode: 301 })
  }
})
</script>

<template>
  <div />
</template>
