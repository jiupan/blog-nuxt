<template>
  <NuxtLoadingIndicator color="#4964f4" :height="3" />
  <UApp :scroll-body="{ padding: 0, margin: 0 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
