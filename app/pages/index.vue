<script setup lang="ts">
import { useActivities } from '~/composables/useActivities'
import { CATEGORIES } from '~/types'

const { todayLogs, currentActivity, deleteLog } = useActivities()

// サマリーリストの計算
const categorySummaries = computed(() => {
  const summaries = new Map<string, number>()
  
  // 0で初期化
  CATEGORIES.forEach(c => summaries.set(c.id, 0))
  
  const now = Date.now()
  const todayStart = new Date().setHours(0,0,0,0)
  const todayEnd = todayStart + 86400000

  // 現在進行中のものも含めてすべてのアクティビティの時間を計算する（現時点まで）
  todayLogs.value.forEach(log => {
    const start = Math.max(log.startTime, todayStart)
    const end = log.endTime ? Math.min(log.endTime, todayEnd) : Math.min(now, todayEnd)
    
    if (start < end) {
      const duration = end - start
      const current = summaries.get(log.categoryId) || 0
      summaries.set(log.categoryId, current + duration)
    }
  })
  
  return CATEGORIES.map(c => ({
    ...c,
    duration: summaries.get(c.id) || 0
  })).sort((a, b) => b.duration - a.duration)
})

const formatDuration = (ms: number) => {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

const totalDuration = computed(() => {
  return categorySummaries.value.reduce((acc, curr) => acc + curr.duration, 0)
})

const unrecordedDuration = computed(() => {
  const now = new Date()
  // 過去の日付を表示する場合、24時間になるはずだが、MVPでは「今日」のみ。
  // そのため、「未記録」は現在から深夜までの時間か？それとも過去のギャップか？
  // 「未記録」は通常、過去のギャップを意味する。
  // ギャップ = (現在 - 今日の開始) - 合計記録時間 (重複がない場合)。
  const todayStart = new Date().setHours(0,0,0,0)
  const elapsedToday = Math.max(0, Date.now() - todayStart)
  return Math.max(0, elapsedToday - totalDuration.value)
})
</script>

<template>
  <div class="flex flex-col gap-6 py-4">
    <!-- Date Header -->
    <div class="flex justify-between items-end px-2">
      <div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-white">Today</h2>
        <p class="text-gray-500 dark:text-gray-400 text-sm">
          {{ new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) }}
        </p>
      </div>
      <div v-if="currentActivity" class="flex items-center gap-2 text-primary-500 font-medium animate-pulse">
        <div class="w-2 h-2 rounded-full bg-primary-500" />
        Recording
      </div>
    </div>

    <!-- Chart -->
    <div class="flex justify-center py-4">
      <DailyPieChart :logs="todayLogs" />
    </div>

    <!-- Summary List -->
    <div class="space-y-4">
      <h3 class="text-lg font-bold px-2 text-gray-800 dark:text-gray-200">内訳</h3>
      
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        <div 
          v-for="cat in categorySummaries" 
          :key="cat.id"
          class="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center text-white"
              :class="cat.color.replace('text-', '').split(' ')[1]" 
            > 
            <!-- メモ: 背景色のクラスを抽出するためのヘルパー。例: text-indigo-500 bg-indigo-500 -> bg-indigo-500 -->
               <UIcon :name="cat.icon" class="w-5 h-5" />
            </div>
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100">{{ cat.label }}</div>
              <div class="text-xs text-gray-400">
                 {{ Math.round((cat.duration / (totalDuration + unrecordedDuration || 1)) * 100) }}%
              </div>
            </div>
          </div>
          <div class="font-mono font-medium text-gray-700 dark:text-gray-300">
            {{ formatDuration(cat.duration) }}
          </div>
        </div>
        
        <!-- Unrecorded Row -->
        <div class="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/50">
          <div class="flex items-center gap-3">
             <div class="w-10 h-10 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-gray-500">
               <UIcon name="i-lucide-help-circle" class="w-5 h-5" />
             </div>
             <div class="font-medium text-gray-600 dark:text-gray-400">未記録</div>
          </div>
          <div class="font-mono font-medium text-gray-500 dark:text-gray-500">
            {{ formatDuration(unrecordedDuration) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
