import { ref, computed, onMounted, watch } from 'vue'
import type { ActivityLog, ActivityCategoryId } from '~/types'

export const useActivities = () => {
  const logs = useState<ActivityLog[]>('marulog-activities', () => [])
  
  // Load from local storage on client side mount
  onMounted(() => {
    if (import.meta.client) {
      const stored = localStorage.getItem('marulog-activities')
      if (stored) {
        try {
          // Parse and maybe migrate if needed
          logs.value = JSON.parse(stored)
        } catch (e) {
          console.error('Failed to parse logs', e)
        }
      }
    }
  })

  // Watch for changes to save to local storage
  watch(logs, (newLogs) => {
    if (import.meta.client) {
      localStorage.setItem('marulog-activities', JSON.stringify(newLogs))
    }
  }, { deep: true })

  const currentActivity = computed(() => {
    return logs.value.find(log => log.endTime === null) || null
  })

  const todayLogs = computed(() => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const endOfDay = startOfDay + 86400000

    return logs.value.filter(log => {
      // Activity started today OR ended today OR is still active and started before today (spanning)
      // For MVP, simplistic view: just show what overlaps with today.
      
      // Filter logic:
      // log start < today end AND (log end > today start OR log is active)
      const logEnd = log.endTime ?? Date.now()
      return log.startTime < endOfDay && logEnd > startOfDay
    }).sort((a, b) => a.startTime - b.startTime)
  })

  const startActivity = (categoryId: ActivityCategoryId) => {
    // Stop current if exists
    if (currentActivity.value) {
      stopActivity()
    }

    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      categoryId,
      startTime: Date.now(),
      endTime: null
    }
    logs.value.push(newLog)
  }

  const stopActivity = () => {
    if (currentActivity.value) {
      // Direct mutation of the object inside the array is reactive with useState?
      // useState returns a Ref, so logs.value is the array.
      // We need to find the index to update to be sure, or update the reference.
      const idx = logs.value.findIndex(l => l.id === currentActivity.value?.id)
      if (idx !== -1) {
        const updatedLog = { ...logs.value[idx], endTime: Date.now() }
        logs.value[idx] = updatedLog
      }
    }
  }

  const deleteLog = (id: string) => {
    logs.value = logs.value.filter(l => l.id !== id)
  }

  return {
    logs,
    currentActivity,
    todayLogs,
    startActivity,
    stopActivity,
    deleteLog
  }
}
