<script setup lang="ts">
import { useActivities } from '~/composables/useActivities'
import type { ActivityCategoryId } from '~/types'

const { currentActivity, startActivity, stopActivity, addActivityLog } = useActivities()
const selectedCategory = ref<ActivityCategoryId | null>(null)

// Recording Mode
const recordMode = ref<'timer' | 'manual'>('timer')
const manualDate = ref(new Date().toISOString().split('T')[0])
const manualStartTime = ref('10:00')
const manualEndTime = ref('11:00')

const titleDate = computed(() => {
  const d = new Date(manualDate.value)
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })
})

// アクティビティが既に実行中の場合、選択されたカテゴリを初期化する
watch(currentActivity, (newVal) => {
  if (newVal) {
    selectedCategory.value = newVal.categoryId
    // タイマーモードに強制切り替え
    recordMode.value = 'timer'
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

const handleManualRecord = () => {
  if (!selectedCategory.value) return

  const startDateTime = new Date(`${manualDate.value}T${manualStartTime.value}`)
  const endDateTime = new Date(`${manualDate.value}T${manualEndTime.value}`)

  if (startDateTime >= endDateTime) {
    alert('終了時間は開始時間より後である必要があります')
    return
  }

  addActivityLog(
    selectedCategory.value,
    startDateTime.getTime(),
    endDateTime.getTime()
  )
  
  // 完了フィードバック（必要であれば）
  alert('記録しました')
}
</script>

<template>
  <div class="flex flex-col gap-6 py-4">
    <!-- Mode Switcher -->
    <div class="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl relative">
      <button
        v-for="mode in ['timer', 'manual'] as const"
        :key="mode"
        @click="recordMode = mode"
        class="flex-1 py-2 text-sm font-bold rounded-lg relative z-10 transition-colors duration-200 capitalize"
        :class="recordMode === mode ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
      >
        {{ mode === 'timer' ? 'タイマー' : '手動入力' }}
      </button>
      <div 
        class="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        :class="recordMode === 'timer' ? 'left-1' : 'left-[calc(50%+2px)]'"
      />
    </div>

    <!-- Timer Display -->
    <div v-if="recordMode === 'timer'" class="flex flex-col items-center justify-center py-10 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-all">
      <!-- 計測中は背景にパルスアニメーションを表示 -->
      <div v-if="currentActivity" class="absolute inset-0 bg-primary-500/5 animate-pulse" />
      
      <span class="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 uppercase tracking-wider">
        {{ currentActivity ? '計測中' : 'スタンバイ' }}
      </span>
      <div class="text-6xl font-bold font-mono tracking-wider tabular-nums text-gray-900 dark:text-gray-100 relative z-10">
        {{ formattedTime }}
      </div>
    </div>

    <!-- Manual Form -->
    <div v-else class="flex flex-col gap-4 p-6 rounded-2xl bg-white dark:bg-gray-900 shadow-sm border border-gray-100 dark:border-gray-800">
      <h3 class="font-bold text-gray-900 dark:text-white">{{ titleDate }} の記録</h3>
      
      <div class="grid grid-cols-1 gap-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-bold text-gray-500 uppercase">日付</span>
          <input 
            v-model="manualDate" 
            type="date"
            class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-shadow"
          >
        </label>
        
        <div class="grid grid-cols-2 gap-4">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-500 uppercase">開始</span>
            <input 
              v-model="manualStartTime" 
              type="time" 
              class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-shadow"
            >
          </label>
          
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-bold text-gray-500 uppercase">終了</span>
            <input 
              v-model="manualEndTime" 
              type="time" 
              class="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-lg font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-shadow"
            >
          </label>
        </div>
      </div>
    </div>

    <!-- Category Selection -->
    <div class="space-y-3">
      <h2 class="text-lg font-bold text-gray-800 dark:text-gray-200 px-1">カテゴリを選択</h2>
      <CategorySelector 
        v-model="selectedCategory" 
        :disabled="recordMode === 'timer' && !!currentActivity && currentActivity.categoryId === selectedCategory"
      />
    </div>

    <!-- Actions -->
    <div class="mt-4">
      <template v-if="recordMode === 'timer'">
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
      </template>
      <template v-else>
        <!-- Manual Action -->
        <button
          @click="handleManualRecord"
          :disabled="!selectedCategory"
          class="w-full py-4 px-6 rounded-xl font-bold text-white shadow-md transition-all active:scale-95"
          :class="[
            selectedCategory 
              ? 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/30' 
              : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500'
          ]"
        >
          記録する
        </button>
      </template>
    </div>
  </div>
</template>
