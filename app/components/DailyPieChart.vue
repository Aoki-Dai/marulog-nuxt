<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import type { ActivityLog } from '~/types'
import { CATEGORIES } from '~/types'
import { useActivities } from '~/composables/useActivities'

const { deleteLog, updateActivityLog } = useActivities()

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

// 編集機能
const isEditing = ref(false)
const editForm = ref({
  categoryId: '',
  startTime: '',
  endTime: ''
})

const startEdit = () => {
  const segment = segments.value.find(s => s.id === activeSegment.value)
  if (!segment) return

  const startDate = new Date(segment.rawDuration ? todayStart.value + (segment.duration > 0 ? segment.duration : 0) : 0) // This logic seems wrong. segment.duration is duration, not start time.
  // segment definition:
  // start = Math.max(log.startTime, todayStart.value)
  // end = ...
  // duration = end - start
  // But we need the original log's start and end times to edit properly, or at least the start time relative to day.
  
  // Actually, I should find the original log from props.logs using activeSegment (which is log.id)
  const log = props.logs.find(l => l.id === activeSegment.value)
  if (!log) return

  const start = new Date(log.startTime)
  const end = log.endTime ? new Date(log.endTime) : new Date()

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }

  editForm.value = {
    categoryId: log.categoryId,
    startTime: formatTime(start),
    endTime: log.endTime ? formatTime(end) : ''
  }
  isEditing.value = true
}

const saveEdit = () => {
  const log = props.logs.find(l => l.id === activeSegment.value)
  if (!log) return

  const parseTime = (timeStr: string) => {
    if (!timeStr) return null
    const [h, m] = timeStr.split(':').map(Number)
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime()
  }

  const newStart = parseTime(editForm.value.startTime)
  const newEnd = parseTime(editForm.value.endTime)

  if (newStart) {
    updateActivityLog({
      ...log,
      categoryId: editForm.value.categoryId as any, // casting for now, validation usually needed
      startTime: newStart,
      endTime: newEnd
    })
  }

  isEditing.value = false
  activeSegment.value = null
}

const handleDelete = () => {
  if (activeSegment.value) {
    if (confirm('この記録を削除してもよろしいですか？')) {
      deleteLog(activeSegment.value)
      activeSegment.value = null
    }
  }
}

// アクティブセグメントが変わったら編集モードをリセット
watch(() => activeSegment.value, () => {
  isEditing.value = false
})

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
  
  <div v-if="activeSegment" class="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/5 dark:bg-black/20 backdrop-blur-[1px]" @click.self="activeSegment = null">
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-5 w-full max-w-[280px] animate-in fade-in zoom-in-95 duration-200" @click.stop>
      
      <!-- Viewing Mode -->
      <div v-if="!isEditing">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-medium text-gray-500">詳細</div>
          <button @click="activeSegment = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div 
            class="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-sm"
            :class="segments.find(s => s.id === activeSegment)?.category.color.replace('bg-', 'bg-')"
          >
            <UIcon :name="segments.find(s => s.id === activeSegment)?.category.icon || ''" class="w-6 h-6" />
          </div>
          <div>
            <div class="font-bold text-lg text-gray-900 dark:text-gray-100">
              {{ segments.find(s => s.id === activeSegment)?.label }}
            </div>
            <div class="text-sm text-gray-500 font-mono">
              {{ segments.find(s => s.id === activeSegment)?.timeLabel }}
            </div>
          </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4 flex justify-between items-center">
            <div class="text-xs text-gray-500">時間</div>
            <div class="font-mono font-medium text-gray-700 dark:text-gray-300">
              {{ new Date(segments.find(s => s.id === activeSegment)?.rawDuration || 0).toISOString().substr(11, 8) }}
            </div>
        </div>

        <div class="flex gap-2">
          <button 
            @click="startEdit"
            class="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <UIcon name="i-lucide-edit-2" class="w-4 h-4" />
            編集
          </button>
          <button 
            @click="handleDelete"
            class="flex items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <UIcon name="i-lucide-trash-2" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Editing Mode -->
      <div v-else>
        <div class="flex items-center justify-between mb-4">
          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">編集</div>
        </div>

        <div class="space-y-4 mb-5">
           <!-- Category Select -->
           <div>
             <label class="block text-xs text-gray-500 mb-1">アクティビティ</label>
             <select 
               v-model="editForm.categoryId"
               class="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
             >
               <option v-for="cat in CATEGORIES" :key="cat.id" :value="cat.id">
                 {{ cat.label }}
               </option>
             </select>
           </div>

           <!-- Time Input -->
           <div class="grid grid-cols-2 gap-2">
             <div>
               <label class="block text-xs text-gray-500 mb-1">開始</label>
               <input 
                 type="time" 
                 v-model="editForm.startTime"
                 class="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
               >
             </div>
             <div>
               <label class="block text-xs text-gray-500 mb-1">終了</label>
               <input 
                 type="time" 
                 v-model="editForm.endTime"
                 class="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
               >
             </div>
           </div>
        </div>

        <div class="flex gap-2">
          <button 
            @click="isEditing = false"
            class="flex-1 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            キャンセル
          </button>
          <button 
            @click="saveEdit"
            class="flex-1 py-2 px-3 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 shadow-sm shadow-primary-500/20"
          >
            保存
          </button>
        </div>
      </div>

    </div>
  </div>
</div>
</template>
