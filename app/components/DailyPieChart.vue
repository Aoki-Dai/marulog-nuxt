<script setup lang="ts">
import { computed } from 'vue'
import type { ActivityLog } from '~/types'
import { CATEGORIES } from '~/types'

const props = defineProps<{
  logs: ActivityLog[]
}>()

const width = 300
const height = 300
const radius = 140
const center = { x: width / 2, y: height / 2 }

const todayStart = computed(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
})

const todayEnd = computed(() => todayStart.value + 86400000)

// 時間を角度に変換するヘルパー関数 (00:00 は上部, -90度)
// 0 から 24時間 -> 0 から 360度
const timeToAngle = (time: number) => {
  const relativeTime = Math.max(0, Math.min(86400000, time - todayStart.value))
  const ratio = relativeTime / 86400000
  return ratio * 360
}

const getCoordinatesForAngle = (angle: number) => {
  const rad = (angle - 90) * (Math.PI / 180)
  return {
    x: center.x + radius * Math.cos(rad),
    y: center.y + radius * Math.sin(rad)
  }
}

const segments = computed(() => {
  return props.logs.map(log => {
    const category = CATEGORIES.find(c => c.id === log.categoryId)
    if (!category) return null

    // 今日の範囲にクリップする
    const start = Math.max(log.startTime, todayStart.value)
    const end = log.endTime ? Math.min(log.endTime, todayEnd.value) : Math.min(Date.now(), todayEnd.value)
    
    if (start >= end) return null

    const startAngle = timeToAngle(start)
    const endAngle = timeToAngle(end)
    
    // 円弧のSVGパス
    // 完全な円(24時間)の場合、別途処理が必要だが通常ログはより小さい
    const startPos = getCoordinatesForAngle(startAngle)
    const endPos = getCoordinatesForAngle(endAngle)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
    
    const path = `
      M ${center.x} ${center.y}
      L ${startPos.x} ${startPos.y}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPos.x} ${endPos.y}
      Z
    `
    
    // 塗りつぶしの色を抽出
    // TailwindのクラスはSVGで扱うのが難しいため、マップされた16進数コードかユーティリティクラスの置換を使用する方が良い
    // しかし、有効なCSSクラスを設定すればクラスバインディングが使える
    // CATEGORIESには "text-indigo-500 bg-indigo-500" がある
    // 塗りつぶしの色が欲しい。パスに "text-indigo-500" クラスを使用して fill="currentColor" にするか？
    // または色名を抽出してマップする
    // 標準の Nuxt UI / Tailwind カラーに依存することにする
    // しかし、class="text-indigo-500" は stroke/fill が currentColor の実装に依存する？
    // 通常は fill を設定する必要がある。Tailwind では 'fill-indigo-500' が機能する
    const colorClass = category.color.replace('bg-', 'fill-').split(' ')[1] // e.g. bg-indigo-500 -> fill-indigo-500

    return {
      id: log.id,
      path,
      colorClass,
      category,
      label: category.label,
      duration: end - start
    }
  }).filter(s => s !== null)
})

const activeSegment = ref<string | null>(null)
</script>

<template>
  <div class="relative flex items-center justify-center">
    <svg :width="width" :height="height" viewBox="0 0 300 300" class="transform transition-transform">
      <!-- 背景の円（未記録） -->
      <circle :cx="center.x" :cy="center.y" :r="radius" class="fill-gray-200 dark:fill-gray-800" />
      
      <!-- 時間マーカー -->
      <line v-for="h in 24" :key="h"
        :x1="center.x + (radius - 5) * Math.cos(((h * 15 - 90) * Math.PI) / 180)"
        :y1="center.y + (radius - 5) * Math.sin(((h * 15 - 90) * Math.PI) / 180)"
        :x2="center.x + radius * Math.cos(((h * 15 - 90) * Math.PI) / 180)"
        :y2="center.y + radius * Math.sin(((h * 15 - 90) * Math.PI) / 180)"
        stroke="currentColor"
        class="text-white dark:text-gray-900"
        stroke-width="2"
      />

      <!-- セグメント -->
      <path
        v-for="segment in segments"
        :key="segment.id"
        :d="segment.path"
        :class="[segment.colorClass, activeSegment === segment.id ? 'opacity-100' : 'opacity-90']"
        class="transition-opacity cursor-pointer hover:opacity-100"
        @click="activeSegment = activeSegment === segment.id ? null : segment.id" 
      />
      
      <!-- 中央の穴（ドーナツスタイルはオプションだが、仕様では円グラフとなっている。見た目のためにパイまたは小さな穴にしておく） -->
      <!-- 見た目を良くし、中心の収束アーティファクトを隠すために小さな中央の円を追加 -->
      <circle :cx="center.x" :cy="center.y" r="40" class="fill-white dark:fill-gray-950" />
      
      <!-- 時計インジケーター（アイコン） -->
      <foreignObject :x="center.x - 12" :y="center.y - 12" width="24" height="24">
        <div class="flex items-center justify-center h-full text-gray-400">
           <UIcon name="i-lucide-clock" class="w-6 h-6" />
        </div>
      </foreignObject>
    </svg>
    
    <!-- 詳細オーバーレイ / ツールチップのロジックはここに入れることもできるが、チャートの下に表示する方が簡単 -->
  </div>
  
  <div v-if="activeSegment" class="mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center animate-in fade-in slide-in-from-bottom-2">
    <div class="text-sm text-gray-500">選択中の記録</div>
    <div class="font-bold text-lg" :class="CATEGORIES.find(c => c.label === segments.find(s => s.id === activeSegment)?.label)?.color.split(' ')[0]">
      {{ segments.find(s => s.id === activeSegment)?.label }}
    </div>
    <div class="text-xl font-mono mt-1">
      {{ 
        new Date(segments.find(s => s.id === activeSegment)?.duration || 0).toISOString().substr(11, 8)
      }}
    </div>
  </div>
</template>
