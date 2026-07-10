<template><div class="knowledge-empty"><UIcon name="i-lucide-inbox" class="size-8" /><span>{{ text }}</span></div></template>
<script setup lang="ts">defineProps<{ text: string }>()</script>
<style scoped>.knowledge-empty{display:grid;min-height:9rem;place-items:center;align-content:center;gap:.45rem;color:#94a3b8;font-size:.78rem}</style>
