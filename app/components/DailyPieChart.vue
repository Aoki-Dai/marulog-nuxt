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

// Helper to convert time to angle (00:00 is top, -90deg)
// 0 to 24h -> 0 to 360deg
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

    // Clip to today boundaries
    const start = Math.max(log.startTime, todayStart.value)
    const end = log.endTime ? Math.min(log.endTime, todayEnd.value) : Math.min(Date.now(), todayEnd.value)
    
    if (start >= end) return null

    const startAngle = timeToAngle(start)
    const endAngle = timeToAngle(end)
    
    // SVG path for arc
    // If full circle (24h), handle separately but usually logs are smaller
    const startPos = getCoordinatesForAngle(startAngle)
    const endPos = getCoordinatesForAngle(endAngle)
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
    
    const path = `
      M ${center.x} ${center.y}
      L ${startPos.x} ${startPos.y}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPos.x} ${endPos.y}
      Z
    `
    
    // Extract color for fill
    // Tailwind classes are tricky in SVG, better use mapped hexcodes or utility class replacement
    // But we can use class binding if we set valid CSS classes.
    // CATEGORIES has "text-indigo-500 bg-indigo-500".
    // We want the fill color. We can use "text-indigo-500" class on the path and fill="currentColor"?
    // Or just extract the color name and maps it.
    // Let's rely on standard Nuxt UI / Tailwind colors.
    // However, class="text-indigo-500" makes the stroke/fill dependent on currentColor implementation?
    // Usually fill should be set. 'fill-indigo-500' works in Tailwind.
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
      <!-- Background Circle (Unrecorded) -->
      <circle :cx="center.x" :cy="center.y" :r="radius" class="fill-gray-200 dark:fill-gray-800" />
      
      <!-- Hour markers -->
      <line v-for="h in 24" :key="h"
        :x1="center.x + (radius - 5) * Math.cos(((h * 15 - 90) * Math.PI) / 180)"
        :y1="center.y + (radius - 5) * Math.sin(((h * 15 - 90) * Math.PI) / 180)"
        :x2="center.x + radius * Math.cos(((h * 15 - 90) * Math.PI) / 180)"
        :y2="center.y + radius * Math.sin(((h * 15 - 90) * Math.PI) / 180)"
        stroke="currentColor"
        class="text-white dark:text-gray-900"
        stroke-width="2"
      />

      <!-- Segments -->
      <path
        v-for="segment in segments"
        :key="segment.id"
        :d="segment.path"
        :class="[segment.colorClass, activeSegment === segment.id ? 'opacity-100' : 'opacity-90']"
        class="transition-opacity cursor-pointer hover:opacity-100"
        @click="activeSegment = activeSegment === segment.id ? null : segment.id" 
      />
      
      <!-- Center Hole (Donut style optionally, but spec says pie chart. Let's keep it pie or small hole for aesthetic) -->
      <!-- Let's add a small center circle for aesthetics and to hide center convergence artifacts -->
      <circle :cx="center.x" :cy="center.y" r="40" class="fill-white dark:fill-gray-950" />
      
      <!-- Clock Indicator (Icon) -->
      <foreignObject :x="center.x - 12" :y="center.y - 12" width="24" height="24">
        <div class="flex items-center justify-center h-full text-gray-400">
           <UIcon name="i-lucide-clock" class="w-6 h-6" />
        </div>
      </foreignObject>
    </svg>
    
    <!-- Detail Overlay / Tooltip logic could be here, but simpler to show below chart -->
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
