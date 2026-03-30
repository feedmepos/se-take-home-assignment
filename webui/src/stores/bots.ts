import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Bot } from '../types'
import { addBot, removeBot } from '../api'

export const useBotsStore = defineStore('bots', () => {
  /** 所有 Bot 列表 */
  const bots = ref<Bot[]>([])
  /** 加载中 */
  const loading = ref(false)

  /** 空闲 Bot */
  const idleBots = computed(() => bots.value.filter((b) => b.status === 'IDLE'))

  /** 工作中 Bot */
  const busyBots = computed(() => bots.value.filter((b) => b.status === 'ACTIVE'))

  /** 添加一个 Bot */
  async function createBot() {
    loading.value = true
    try {
      await addBot()
      // 不从 REST 响应添加 Bot，由 WebSocket 事件 bot_created 驱动
    } catch (e) {
      console.error('添加 Bot 失败:', e)
    } finally {
      loading.value = false
    }
  }

  /** 移除一个 Bot */
  async function deleteBot() {
    loading.value = true
    try {
      await removeBot()
      // 不从 REST 响应移除 Bot，由 WebSocket 事件 bot_destroyed 驱动
    } catch (e) {
      console.error('移除 Bot 失败:', e)
    } finally {
      loading.value = false
    }
  }

  /** 更新或插入 Bot */
  function upsertBot(bot: Bot) {
    const idx = bots.value.findIndex((b) => b.bot_id === bot.bot_id)
    if (idx >= 0) {
      // 保留已有的 created_at（部分事件不携带此字段）
      const existing = bots.value[idx]
      bots.value[idx] = {
        ...bot,
        created_at: bot.created_at || existing.created_at,
      }
    } else {
      bots.value.push(bot)
    }
  }

  /** 根据 ID 移除 Bot */
  function removeBotById(botId: string) {
    const idx = bots.value.findIndex((b) => b.bot_id === botId)
    if (idx >= 0) {
      bots.value.splice(idx, 1)
    }
  }

  /** 清空所有 Bot */
  function clearAll() {
    bots.value = []
  }

  return {
    bots,
    loading,
    idleBots,
    busyBots,
    createBot,
    deleteBot,
    upsertBot,
    removeBotById,
    clearAll,
  }
})
