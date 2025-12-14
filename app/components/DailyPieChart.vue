<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { ActivityLog } from '~/types'
import { CATEGORIES } from '~/types'

const props = defineProps<{
  logs: ActivityLog[]
}>()

const width = 380
const height = 380
const radius = 140
const center = { x: width / 2, y: height / 2 }

const todayStart = computed(() => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
})

const todayEnd = computed(() => todayStart.value + 86400000)

// 現在時刻の管理
const currentTime = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = Date.now()
  }, 60000) // 1分ごとに更新
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 時間を角度に変換するヘルパー関数 (00:00 は上部, -90度)
// 0 から 24時間 -> 0 から 360度
const timeToAngle = (time: number) => {
  const relativeTime = Math.max(0, Math.min(86400000, time - todayStart.value))
  const ratio = relativeTime / 86400000
  return ratio * 360
}

const getCoordinatesForAngle = (angle: number, r: number = radius) => {
  const rad = (angle - 90) * (Math.PI / 180)
  return {
    x: center.x + r * Math.cos(rad),
    y: center.y + r * Math.sin(rad)
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
    const startPos = getCoordinatesForAngle(startAngle)
    const endPos = getCoordinatesForAngle(endAngle)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
    
    const path = `
      M ${center.x} ${center.y}
      L ${startPos.x} ${startPos.y}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPos.x} ${endPos.y}
      Z
    `
    
    const colorClass = category.color.replace('bg-', 'fill-').split(' ')[1]

    // ラベル表示位置の計算（セグメントの中央、少し内側）
    const midAngle = (startAngle + endAngle) / 2
    const labelPos = getCoordinatesForAngle(midAngle, radius * 0.7)
    
    // 経過時間のフォーマット (H:MM)
    const durationMs = end - start
    const hours = Math.floor(durationMs / 3600000)
    const minutes = Math.floor((durationMs % 3600000) / 60000)
    const timeLabel = `${hours}:${minutes.toString().padStart(2, '0')}`
    
    // 表示するかどうかの判定（角度が小さすぎる場合は非表示）
    const isVisible = (endAngle - startAngle) > 15 // 15度（1時間）以上なら表示

    return {
      id: log.id,
      path,
      colorClass,
      category,
      label: category.label,
      timeLabel,
      duration: end - start,
      labelPos,
      isVisible,
      rawDuration: end - start
    }
  }).filter(s => s !== null)
})

const activeSegment = ref<string | null>(null)

// 時計の数字 (0 - 23)
const clockNumbers = Array.from({ length: 24 }, (_, i) => i).map(h => {
  const angle = h * 15 // 1時間 = 15度
  const pos = getCoordinatesForAngle(angle, radius + 20) // 外側に配置
  return { h, x: pos.x, y: pos.y }
})

const currentTimeAngle = computed(() => timeToAngle(currentTime.value))
const currentTimePos = computed(() => getCoordinatesForAngle(currentTimeAngle.value, radius))

</script>

<template>
  <div class="relative flex items-center justify-center">
    <svg :width="width" :height="height" viewBox="0 0 380 380" class="transform transition-transform select-none">
      <!-- 背景の円 -->
      <circle :cx="center.x" :cy="center.y" :r="radius" class="fill-gray-200 dark:fill-gray-800" />
      
      <!-- セグメント -->
      <g v-for="segment in segments" :key="segment.id">
        <path
          :d="segment.path"
          :class="[segment.colorClass, activeSegment === segment.id ? 'opacity-100' : 'opacity-90']"
          class="transition-opacity cursor-pointer hover:opacity-100 stroke-white dark:stroke-gray-900 stroke-1"
          @click="activeSegment = activeSegment === segment.id ? null : segment.id" 
        />
        <!-- セグメント内のラベル -->
        <g v-if="segment.isVisible" class="pointer-events-none">
          <text 
            :x="segment.labelPos.x" 
            :y="segment.labelPos.y" 
            text-anchor="middle" 
            dominant-baseline="middle" 
            class="text-[10px] font-bold fill-white drop-shadow-md"
          >
            <tspan :x="segment.labelPos.x" dy="-0.6em">{{ segment.label }}</tspan>
            <tspan :x="segment.labelPos.x" dy="1.2em" class="text-[8px]">{{ segment.timeLabel }}</tspan>
          </text>
        </g>
      </g>
      
      <!-- 時間目盛りの線 -->
      <line v-for="h in 24" :key="`tick-${h}`"
        :x1="center.x + (radius - 5) * Math.cos(((h * 15 - 90) * Math.PI) / 180)"
        :y1="center.y + (radius - 5) * Math.sin(((h * 15 - 90) * Math.PI) / 180)"
        :x2="center.x + radius * Math.cos(((h * 15 - 90) * Math.PI) / 180)"
        :y2="center.y + radius * Math.sin(((h * 15 - 90) * Math.PI) / 180)"
        stroke="currentColor"
        class="text-white dark:text-gray-900 opacity-50"
        stroke-width="1"
      />

      <!-- 時計の数字 -->
      <text v-for="num in clockNumbers" :key="`num-${num.h}`"
        :x="num.x" :y="num.y"
        text-anchor="middle"
        dominant-baseline="middle"
        class="text-xs font-bold fill-gray-500 dark:fill-gray-400 pointer-events-none"
      >
        {{ num.h }}
      </text>

      <!-- 現在時刻の線 -->
      <line
        :x1="center.x"
        :y1="center.y"
        :x2="currentTimePos.x"
        :y2="currentTimePos.y"
        class="stroke-red-500 dark:stroke-red-400 stroke-2"
        stroke-dasharray="4 2"
      />
      <!-- 現在時刻の先端の丸 -->
      <circle :cx="currentTimePos.x" :cy="currentTimePos.y" r="4" class="fill-red-500 dark:fill-red-400" />
      
      <!-- 中央の穴 -->
      <circle :cx="center.x" :cy="center.y" r="40" class="fill-white dark:fill-gray-950" />
      
      <!-- アイコン -->
      <foreignObject :x="center.x - 12" :y="center.y - 12" width="24" height="24">
        <div class="flex items-center justify-center h-full text-gray-400">
           <UIcon name="i-lucide-clock" class="w-6 h-6" />
        </div>
      </foreignObject>
    </svg>
  </div>
  
  <div v-if="activeSegment" class="mt-4 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-center animate-in fade-in slide-in-from-bottom-2">
    <div class="text-sm text-gray-500">選択中の記録</div>
    <div class="font-bold text-lg" :class="CATEGORIES.find(c => c.label === segments.find(s => s.id === activeSegment)?.label)?.color.split(' ')[0]">
      {{ segments.find(s => s.id === activeSegment)?.label }}
    </div>
    <div class="text-xl font-mono mt-1">
      {{ 
        new Date(segments.find(s => s.id === activeSegment)?.rawDuration || 0).toISOString().substr(11, 8)
      }}
    </div>
    <div class="text-xs text-gray-400 mt-1">
      {{ segments.find(s => s.id === activeSegment)?.timeLabel }}
    </div>
  </div>
</template>
