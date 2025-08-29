import type Bot from '@/types/bot'
import { defineStore } from 'pinia'

export const useBotStore = defineStore('bot', {
  state: () => ({
    bots: [] as Bot[],
    nextBotId: 1,
  }),
  actions: {
    addBot() {
      const bot: Bot = {
        id: this.nextBotId++,
        status: 'IDLE',
      }
      this.bots.push(bot)
    },
    removeBot() {
      this.bots.pop()
    },
    assignOrderToBot(orderId: number) {
      const bot = this.bots[this.bots.length - 1]
      if (bot && bot.status === 'IDLE') {
        bot.currentOrderId = orderId
        bot.status = 'BUSY'
      }
    },
  },
})
