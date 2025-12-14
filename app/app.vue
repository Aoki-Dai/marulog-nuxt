<script setup lang="ts">
useHead({
  title: 'marulog - Daily Activity Tracker',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }
  ],
  htmlAttrs: {
    lang: 'ja'
  }
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
