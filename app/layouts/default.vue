<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: '今日', icon: 'i-lucide-pie-chart', to: '/' },
  { label: '記録', icon: 'i-lucide-timer', to: '/record' },
]
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col pb-20">
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 px-4 py-3">
      <h1 class="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">marulog</h1>
    </header>
    
    <main class="flex-1 p-4 max-w-md mx-auto w-full">
      <slot />
    </main>

    <nav class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-2 pb-safe-area-inset-bottom z-50">
      <div class="flex justify-around items-center max-w-md mx-auto">
        <NuxtLink 
          v-for="item in navItems" 
          :key="item.to" 
          :to="item.to"
          class="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors duration-200"
          :class="[route.path === item.to ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300']"
        >
          <UIcon :name="item.icon" class="w-6 h-6" />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.pb-safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}
</style>
