<script setup lang="ts">
import { useActivities } from '~/composables/useActivities'
import type { ActivityCategoryId } from '~/types'

const { currentActivity, startActivity, stopActivity } = useActivities()
const selectedCategory = ref<ActivityCategoryId | null>(null)

// アクティビティが既に実行中の場合、選択されたカテゴリを初期化する
watch(currentActivity, (newVal) => {
  if (newVal) {
    selectedCategory.value = newVal.categoryId
  }
}, { immediate: true })

// タイマーロジック
const elapsedTime = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

const updateTimer = () => {
  if (currentActivity.value) {
    elapsedTime.value = Math.floor((Date.now() - currentActivity.value.startTime) / 1000)
  } else {
    elapsedTime.value = 0
  }
}

watch(currentActivity, (isActive) => {
  if (isActive) {
    if (!timerInterval) {
      updateTimer() // 即座に更新
      timerInterval = setInterval(updateTimer, 1000)
    }
  } else {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    elapsedTime.value = 0
  }
}, { immediate: true })

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const formattedTime = computed(() => {
  const h = Math.floor(elapsedTime.value / 3600).toString().padStart(2, '0')
  const m = Math.floor((elapsedTime.value % 3600) / 60).toString().padStart(2, '0')
  const s = (elapsedTime.value % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
})

const handleStart = () => {
  if (selectedCategory.value) {
    startActivity(selectedCategory.value)
  }
}
</script>

<template>
  <div class="flex flex-col gap-8 py-6">
    <!-- Timer Display -->
    <div class="flex flex-col items-center justify-center py-10 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
      <!-- 計測中は背景にパルスアニメーションを表示 -->
      <div v-if="currentActivity" class="absolute inset-0 bg-primary-500/5 animate-pulse" />
      
      <span class="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">
        {{ currentActivity ? '計測中' : 'スタンバイ' }}
      </span>
      <div class="text-6xl font-bold font-mono tracking-wider tabular-nums text-gray-900 dark:text-gray-100 relative z-10">
        {{ formattedTime }}
      </div>
    </div>

    <!-- Category Selection -->
    <div class="space-y-3">
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 px-1">カテゴリを選択</h2>
      <CategorySelector 
        v-model="selectedCategory" 
        :disabled="!!currentActivity && currentActivity.categoryId === selectedCategory"
      />
    </div>

    <!-- Actions -->
    <div class="mt-4">
      <template v-if="currentActivity">
        <button
          @click="stopActivity"
          class="w-full py-4 px-6 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 bg-red-500 hover:bg-red-600 shadow-red-500/30"
        >
          停止する
        </button>
      </template>
      <template v-else>
        <button
          @click="handleStart"
          :disabled="!selectedCategory"
          class="w-full py-4 px-6 rounded-xl font-bold text-white shadow-md transition-all active:scale-95"
          :class="[
            selectedCategory 
              ? 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/30' 
              : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
          ]"
        >
          開始する
        </button>
      </template>
    </div>
  </div>
</template>
