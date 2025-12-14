import { ref, computed, onMounted, watch } from 'vue'
import type { ActivityLog, ActivityCategoryId } from '~/types'

export const useActivities = () => {
  const logs = useState<ActivityLog[]>('marulog-activities', () => [])
  
  // クライアントサイドマウント時にローカルストレージから読み込む
  onMounted(() => {
    if (import.meta.client) {
      const stored = localStorage.getItem('marulog-activities')
      if (stored) {
        try {
          // パースして必要であればマイグレーションを行う
          logs.value = JSON.parse(stored)
        } catch (e) {
          console.error('Failed to parse logs', e)
        }
      }
    }
  })

  // 変更を監視してローカルストレージに保存する
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
      // 今日開始された活動、または今日終了した活動、または現在進行中で今日以前に開始された活動（日またぎ）
      // MVPでは単純化して、今日と重なるものを表示する
      
      // フィルタロジック:
      // ログ開始 < 今日の終わり AND (ログ終了 > 今日の始まり OR ログが計測中)
      const logEnd = log.endTime ?? Date.now()
      return log.startTime < endOfDay && logEnd > startOfDay
    }).sort((a, b) => a.startTime - b.startTime)
  })

  const startActivity = (categoryId: ActivityCategoryId) => {
    // 現在の活動があれば停止する
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
      // 配列内のオブジェクトを直接変更してもuseStateでリアクティブになるか？
      // useStateはRefを返すので、logs.valueが配列になる
      // 確実にするためにインデックスを見つけて更新するか、参照を更新する必要がある
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

  const addActivityLog = (categoryId: ActivityCategoryId, startTime: number, endTime: number) => {
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      categoryId,
      startTime,
      endTime
    }
    logs.value.push(newLog)
  }

  const updateActivityLog = (updatedLog: ActivityLog) => {
    const idx = logs.value.findIndex(l => l.id === updatedLog.id)
    if (idx !== -1) {
      logs.value[idx] = updatedLog
    }
  }

  return {
    logs,
    currentActivity,
    todayLogs,
    startActivity,
    stopActivity,
    deleteLog,
    addActivityLog,
    updateActivityLog
  }
}
